import { redis } from '../redis';
import { pool } from '../db';

export interface LeaderboardEntry {
  userId: string;
  score: number;
  rank: number;
}

export interface UserRank {
  userId: string;
  rank: number;
  score: number;
}

export interface Season {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  rewards: Record<string, unknown>;
}

export type LeaderboardType = 'daily' | 'weekly' | 'season' | 'alltime';

export class LeaderboardService {
  // ----------------------------------------------------------------
  // Get sorted-set key for a given leaderboard type
  // ----------------------------------------------------------------
  private getKey(type: LeaderboardType): string {
    switch (type) {
      case 'daily': {
        const today = new Date().toISOString().slice(0, 10);
        return `board:daily:${today}`;
      }
      case 'weekly': {
        const now = new Date();
        const week = this.getISOWeek(now);
        return `board:weekly:${now.getFullYear()}:${week}`;
      }
      case 'season':
        return 'board:season:current';
      case 'alltime':
        return 'board:alltime';
      default:
        return `board:${type}`;
    }
  }

  // ----------------------------------------------------------------
  // Get paginated leaderboard
  // ----------------------------------------------------------------
  async getLeaderboard(
    type: LeaderboardType,
    page = 1,
    limit = 50,
  ): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const key = this.getKey(type);
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    // ZREVRANGE returns highest-score first, WITHSCORES interleaves member/score
    const raw = await redis.zrevrange(key, start, stop, 'WITHSCORES');
    const total = await redis.zcard(key);

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({
        userId: raw[i],
        score: parseFloat(raw[i + 1]),
        rank: start + i / 2 + 1,
      });
    }

    return { entries, total };
  }

  // ----------------------------------------------------------------
  // Get a specific user's rank and score
  // ----------------------------------------------------------------
  async getUserRank(type: LeaderboardType, userId: string): Promise<UserRank | null> {
    const key = this.getKey(type);

    const rank = await redis.zrevrank(key, userId);
    if (rank === null) return null;

    const score = await redis.zscore(key, userId);

    return {
      userId,
      rank: rank + 1, // 0-indexed -> 1-indexed
      score: score ? parseFloat(score) : 0,
    };
  }

  // ----------------------------------------------------------------
  // Update a user's score (increment)
  // ----------------------------------------------------------------
  async updateScore(userId: string, points: number): Promise<void> {
    const pipeline = redis.pipeline();

    // Increment on all applicable boards
    const dailyKey = this.getKey('daily');
    const weeklyKey = this.getKey('weekly');
    const seasonKey = this.getKey('season');
    const allTimeKey = this.getKey('alltime');

    pipeline.zincrby(dailyKey, points, userId);
    pipeline.zincrby(weeklyKey, points, userId);
    pipeline.zincrby(seasonKey, points, userId);
    pipeline.zincrby(allTimeKey, points, userId);

    // Set TTL on daily key (48h buffer)
    pipeline.expire(dailyKey, 172_800);

    await pipeline.exec();
  }

  // ----------------------------------------------------------------
  // Weekly reset: archive to PostgreSQL, then flush Redis key
  // ----------------------------------------------------------------
  async resetWeeklyLeaderboard(): Promise<void> {
    const key = this.getKey('weekly');

    // Fetch all entries for archival
    const raw = await redis.zrevrange(key, 0, -1, 'WITHSCORES');
    if (raw.length === 0) {
      console.log('[Leaderboard] No weekly data to archive');
      return;
    }

    const now = new Date();
    const weekNumber = this.getISOWeek(now);
    const year = now.getFullYear();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < raw.length; i += 2) {
        const userId = raw[i];
        const score = parseFloat(raw[i + 1]);
        const rank = i / 2 + 1;

        await client.query(
          `INSERT INTO leaderboard_archive (type, season_id, week_number, user_id, score, rank, archived_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['weekly', `${year}`, weekNumber, userId, score, rank, now],
        );
      }

      await client.query('COMMIT');
      console.log(`[Leaderboard] Archived ${raw.length / 2} weekly entries`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Leaderboard] Failed to archive weekly leaderboard:', err);
      throw err;
    } finally {
      client.release();
    }

    // Flush the weekly sorted set
    await redis.del(key);
    console.log('[Leaderboard] Weekly leaderboard reset');
  }

  // ----------------------------------------------------------------
  // Season reset: archive and flush season board
  // ----------------------------------------------------------------
  async resetSeasonLeaderboard(seasonId: string): Promise<void> {
    const key = this.getKey('season');

    const raw = await redis.zrevrange(key, 0, -1, 'WITHSCORES');
    if (raw.length === 0) {
      console.log('[Leaderboard] No season data to archive');
      return;
    }

    const now = new Date();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Mark the old season as inactive
      await client.query(
        'UPDATE seasons SET is_active = false WHERE id = $1',
        [seasonId],
      );

      for (let i = 0; i < raw.length; i += 2) {
        const userId = raw[i];
        const score = parseFloat(raw[i + 1]);
        const rank = i / 2 + 1;

        await client.query(
          `INSERT INTO leaderboard_archive (type, season_id, week_number, user_id, score, rank, archived_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['season', seasonId, null, userId, score, rank, now],
        );
      }

      await client.query('COMMIT');
      console.log(`[Leaderboard] Archived ${raw.length / 2} season entries for ${seasonId}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Leaderboard] Failed to archive season leaderboard:', err);
      throw err;
    } finally {
      client.release();
    }

    await redis.del(key);
    console.log(`[Leaderboard] Season ${seasonId} leaderboard reset`);
  }

  // ----------------------------------------------------------------
  // Get all seasons
  // ----------------------------------------------------------------
  async getSeasons(): Promise<Season[]> {
    const result = await pool.query(
      `SELECT id, name, start_date, end_date, is_active, rewards
       FROM seasons
       ORDER BY start_date DESC`,
    );

    return result.rows.map(this.mapSeasonRow);
  }

  // ----------------------------------------------------------------
  // Get a specific season
  // ----------------------------------------------------------------
  async getSeason(seasonId: string): Promise<Season | null> {
    const result = await pool.query(
      `SELECT id, name, start_date, end_date, is_active, rewards
       FROM seasons
       WHERE id = $1`,
      [seasonId],
    );

    if (result.rows.length === 0) return null;
    return this.mapSeasonRow(result.rows[0]);
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  private mapSeasonRow(row: Record<string, unknown>): Season {
    return {
      id: row.id as string,
      name: row.name as string,
      startDate: row.start_date as Date,
      endDate: row.end_date as Date,
      isActive: row.is_active as boolean,
      rewards: (row.rewards as Record<string, unknown>) || {},
    };
  }

  private getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  }
}
