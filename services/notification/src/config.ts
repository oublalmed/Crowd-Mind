import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3008', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: 'notification:',
    maxRetriesPerRequest: null as null,
  },

  postgres: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DATABASE || 'crowd_mind_notifications',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    max: parseInt(process.env.PG_POOL_SIZE || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },

  fcm: {
    projectId: process.env.FCM_PROJECT_ID || '',
    clientEmail: process.env.FCM_CLIENT_EMAIL || '',
    privateKey: (process.env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    databaseURL: process.env.FCM_DATABASE_URL || '',
  },

  apns: {
    keyId: process.env.APNS_KEY_ID || '',
    teamId: process.env.APNS_TEAM_ID || '',
    bundleId: process.env.APNS_BUNDLE_ID || '',
    keyPath: process.env.APNS_KEY_PATH || '',
    production: process.env.APNS_PRODUCTION === 'true',
  },

  notifications: {
    dailyPushLimit: parseInt(process.env.DAILY_PUSH_LIMIT || '3', 10),
    defaultPageSize: 20,
    maxPageSize: 100,
    scheduledJobRetries: 3,
    scheduledJobBackoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
  },

  bullmq: {
    queueName: 'scheduled-notifications',
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY || '5', 10),
  },
} as const;
