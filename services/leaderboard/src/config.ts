import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.LEADERBOARD_SERVICE_PORT || '3005', 10),

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    keyPrefix: 'leaderboard:',
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
} as const;
