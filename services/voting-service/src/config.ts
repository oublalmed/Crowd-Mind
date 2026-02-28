import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.VOTING_SERVICE_PORT || '3004', 10),
  wsPort: parseInt(process.env.VOTING_WS_PORT || '8081', 10),

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    keyPrefix: 'voting:',
  },

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'crowd_mind',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  /** Maximum duration of a voting window in seconds */
  voteWindowSeconds: parseInt(process.env.VOTE_WINDOW_SECONDS || '30', 10),

  /** Threshold for suspicious-pattern detection */
  suspiciousConsecutiveThreshold: parseInt(
    process.env.SUSPICIOUS_CONSECUTIVE_THRESHOLD || '10',
    10,
  ),
} as const;
