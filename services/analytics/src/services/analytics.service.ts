import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import redis from '../redis';
import { config } from '../config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsEvent {
  id: string;
  eventType: string;
  userId?: string;
  sessionId?: string;
  roomId?: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface EventInput {
  eventType: string;
  userId?: string;
  sessionId?: string;
  roomId?: string;
  payload?: Record<string, unknown>;
}

export interface GameStats {
  totalGames: number;
  totalPlayers: number;
  averageGameDuration: number;
  averagePlayersPerGame: number;
}

export interface PlayerStats {
  userId: string;
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
  winCount: number;
  winRate: number;
}

// ---------------------------------------------------------------------------
// Buffer for batched inserts
// ---------------------------------------------------------------------------

let eventBuffer: EventInput[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function startFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushEvents, config.flushIntervalMs);
}

function stopFlushTimer(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function trackEvent(input: EventInput): Promise<string> {
  const id = uuidv4();

  eventBuffer.push(input);

  // Increment real-time counters in Redis
  const dateKey = new Date().toISOString().slice(0, 10);
  await redis.hincrby(`events:daily:${dateKey}`, input.eventType, 1);

  if (input.userId) {
    await redis.hincrby(`user:events:${input.userId}`, input.eventType, 1);
  }

  // Flush if buffer is full
  if (eventBuffer.length >= config.eventBatchSize) {
    await flushEvents();
  }

  startFlushTimer();
  return id;
}

export async function flushEvents(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const batch = eventBuffer.splice(0, config.eventBatchSize);

  const values: unknown[] = [];
  const placeholders: string[] = [];

  batch.forEach((event, i) => {
    const offset = i * 5;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`
    );
    values.push(
      event.eventType,
      event.userId || null,
      event.sessionId || null,
      event.roomId || null,
      JSON.stringify(event.payload || {})
    );
  });

  try {
    await pool.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id, room_id, payload)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  } catch (err) {
    console.error('[Analytics] Failed to flush events:', err);
    // Re-add failed events to the buffer
    eventBuffer.unshift(...batch);
  }
}

export async function getGameStats(): Promise<GameStats> {
  const cacheKey = 'stats:game:overview';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const result = await pool.query(`
      SELECT
        COUNT(DISTINCT room_id) FILTER (WHERE event_type = 'game_started') AS total_games,
        COUNT(DISTINCT user_id) AS total_players,
        0 AS average_game_duration,
        0 AS average_players_per_game
      FROM analytics_events
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    const row = result.rows[0];
    const stats: GameStats = {
      totalGames: parseInt(row.total_games || '0', 10),
      totalPlayers: parseInt(row.total_players || '0', 10),
      averageGameDuration: parseFloat(row.average_game_duration || '0'),
      averagePlayersPerGame: parseFloat(row.average_players_per_game || '0'),
    };

    await redis.set(cacheKey, JSON.stringify(stats), 'EX', 300);
    return stats;
  } catch {
    return {
      totalGames: 0,
      totalPlayers: 0,
      averageGameDuration: 0,
      averagePlayersPerGame: 0,
    };
  }
}

export async function getPlayerStats(userId: string): Promise<PlayerStats> {
  const cacheKey = `stats:player:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const result = await pool.query(
      `
      SELECT
        COUNT(DISTINCT room_id) FILTER (WHERE event_type = 'game_started') AS games_played,
        COALESCE(SUM((payload->>'score')::int) FILTER (WHERE event_type = 'game_ended'), 0) AS total_score,
        COUNT(*) FILTER (WHERE event_type = 'game_won') AS win_count
      FROM analytics_events
      WHERE user_id = $1
    `,
      [userId]
    );

    const row = result.rows[0];
    const gamesPlayed = parseInt(row.games_played || '0', 10);
    const totalScore = parseInt(row.total_score || '0', 10);
    const winCount = parseInt(row.win_count || '0', 10);

    const stats: PlayerStats = {
      userId,
      gamesPlayed,
      totalScore,
      averageScore: gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0,
      winCount,
      winRate: gamesPlayed > 0 ? Math.round((winCount / gamesPlayed) * 100) : 0,
    };

    await redis.set(cacheKey, JSON.stringify(stats), 'EX', 120);
    return stats;
  } catch {
    return {
      userId,
      gamesPlayed: 0,
      totalScore: 0,
      averageScore: 0,
      winCount: 0,
      winRate: 0,
    };
  }
}

export async function getDailyEventCounts(
  date: string
): Promise<Record<string, number>> {
  const data = await redis.hgetall(`events:daily:${date}`);
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(data)) {
    counts[key] = parseInt(value, 10);
  }
  return counts;
}

export { stopFlushTimer };
