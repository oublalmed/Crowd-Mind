import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.USER_SERVICE_PORT || '3002', 10),

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'crowd_mind',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.S3_AVATAR_BUCKET || 'crowd-mind-avatars',
      endpoint: process.env.S3_ENDPOINT || undefined,
    },
  },

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
} as const;
