import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.ANALYTICS_PORT || '3007', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'crowdmind_analytics',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: parseInt(process.env.POSTGRES_POOL_SIZE || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    keyPrefix: 'analytics:',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  /** Batch size for flushing buffered events */
  eventBatchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE || '100', 10),

  /** Flush interval in milliseconds */
  flushIntervalMs: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL || '5000', 10),
} as const;
