import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { redis, redisPub } from '../redis';
import { config } from '../config';

export interface Vote {
  id: string;
  roomId: string;
  userId: string;
  roundNumber: number;
  optionIndex: number;
  createdAt: Date;
}

export interface VoteTally {
  optionIndex: number;
  count: number;
}

export interface MajorityResult {
  majorityOption: number | null;
  tally: VoteTally[];
  totalVotes: number;
  isTie: boolean;
}

export class VotingService {
  // ----------------------------------------------------------------
  // Submit a vote
  // ----------------------------------------------------------------
  async submitVote(
    roomId: string,
    userId: string,
    optionIndex: number,
  ): Promise<Vote> {
    // 1. Validate voting window
    const windowKey = `room:${roomId}:window`;
    const windowData = await redis.get(windowKey);

    if (!windowData) {
      throw new VotingError('No active voting window for this room', 'WINDOW_CLOSED');
    }

    const window = JSON.parse(windowData) as {
      roundNumber: number;
      opensAt: number;
      closesAt: number;
    };

    const now = Date.now();
    if (now < window.opensAt || now > window.closesAt) {
      throw new VotingError('Voting window is not currently open', 'WINDOW_CLOSED');
    }

    // 2. Check for duplicate vote in this round
    const dupeKey = `room:${roomId}:round:${window.roundNumber}:voter:${userId}`;
    const alreadyVoted = await redis.exists(dupeKey);

    if (alreadyVoted) {
      throw new VotingError('User has already voted in this round', 'DUPLICATE_VOTE');
    }

    // 3. Store the vote
    const vote: Vote = {
      id: uuidv4(),
      roomId,
      userId,
      roundNumber: window.roundNumber,
      optionIndex,
      createdAt: new Date(),
    };

    const voteKey = `room:${roomId}:round:${window.roundNumber}:votes`;

    const pipeline = redis.pipeline();
    // Add vote to sorted set (score = timestamp for ordering)
    pipeline.zadd(voteKey, now, JSON.stringify(vote));
    // Mark user as having voted
    pipeline.set(dupeKey, '1', 'EX', config.voteWindowSeconds + 60);
    // Increment tally for the chosen option
    pipeline.hincrby(
      `room:${roomId}:round:${window.roundNumber}:tally`,
      String(optionIndex),
      1,
    );
    // Track user vote history (for suspicious-pattern detection)
    pipeline.rpush(`user:${userId}:vote_history`, String(optionIndex));
    pipeline.ltrim(`user:${userId}:vote_history`, -50, -1); // Keep last 50

    await pipeline.exec();

    // 4. Publish via Redis Pub/Sub so Socket.IO can broadcast
    const channel = `votes:${roomId}`;
    await redisPub.publish(
      channel,
      JSON.stringify({
        type: 'VOTE_SUBMITTED',
        vote,
      }),
    );

    return vote;
  }

  // ----------------------------------------------------------------
  // Get all votes for a specific round in a room
  // ----------------------------------------------------------------
  async getVotes(roomId: string, roundNumber: number): Promise<Vote[]> {
    const voteKey = `room:${roomId}:round:${roundNumber}:votes`;
    const raw = await redis.zrange(voteKey, 0, -1);
    return raw.map((v) => JSON.parse(v) as Vote);
  }

  // ----------------------------------------------------------------
  // Calculate majority vote for a round
  // ----------------------------------------------------------------
  async calculateMajority(
    roomId: string,
    roundNumber: number,
  ): Promise<MajorityResult> {
    const tallyKey = `room:${roomId}:round:${roundNumber}:tally`;
    const tally = await redis.hgetall(tallyKey);

    const entries: VoteTally[] = Object.entries(tally).map(
      ([optionIndex, count]) => ({
        optionIndex: parseInt(optionIndex, 10),
        count: parseInt(count, 10),
      }),
    );

    const totalVotes = entries.reduce((sum, e) => sum + e.count, 0);

    if (totalVotes === 0) {
      return { majorityOption: null, tally: entries, totalVotes: 0, isTie: false };
    }

    // Sort descending by count
    entries.sort((a, b) => b.count - a.count);

    const isTie =
      entries.length > 1 && entries[0].count === entries[1].count;

    return {
      majorityOption: isTie ? null : entries[0].optionIndex,
      tally: entries,
      totalVotes,
      isTie,
    };
  }

  // ----------------------------------------------------------------
  // Detect suspicious voting pattern (identical votes 10+ rounds)
  // ----------------------------------------------------------------
  async detectSuspiciousPattern(userId: string): Promise<{
    suspicious: boolean;
    consecutiveIdentical: number;
  }> {
    const historyKey = `user:${userId}:vote_history`;
    const history = await redis.lrange(historyKey, 0, -1);

    if (history.length < config.suspiciousConsecutiveThreshold) {
      return { suspicious: false, consecutiveIdentical: 0 };
    }

    let maxConsecutive = 1;
    let currentConsecutive = 1;

    for (let i = history.length - 1; i > 0; i--) {
      if (history[i] === history[i - 1]) {
        currentConsecutive++;
        if (currentConsecutive > maxConsecutive) {
          maxConsecutive = currentConsecutive;
        }
      } else {
        currentConsecutive = 1;
      }
    }

    const suspicious =
      maxConsecutive >= config.suspiciousConsecutiveThreshold;

    return { suspicious, consecutiveIdentical: maxConsecutive };
  }

  // ----------------------------------------------------------------
  // Get votes for a room (latest round or all)
  // ----------------------------------------------------------------
  async getVotesForRoom(roomId: string): Promise<Vote[]> {
    const windowKey = `room:${roomId}:window`;
    const windowData = await redis.get(windowKey);

    if (!windowData) {
      return [];
    }

    const window = JSON.parse(windowData) as { roundNumber: number };
    return this.getVotes(roomId, window.roundNumber);
  }

  // ----------------------------------------------------------------
  // Get a user's voting history from PostgreSQL
  // ----------------------------------------------------------------
  async getVoteHistory(
    userId: string,
    page = 1,
    limit = 50,
  ): Promise<{ votes: Vote[]; total: number }> {
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM votes WHERE user_id = $1',
      [userId],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT id, room_id, user_id, round_number, option_index, created_at
       FROM votes
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    const votes: Vote[] = result.rows.map((row) => ({
      id: row.id,
      roomId: row.room_id,
      userId: row.user_id,
      roundNumber: row.round_number,
      optionIndex: row.option_index,
      createdAt: row.created_at,
    }));

    return { votes, total };
  }
}

// ----------------------------------------------------------------
// Custom error class
// ----------------------------------------------------------------
export class VotingError extends Error {
  public code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'VotingError';
    this.code = code;
  }
}
