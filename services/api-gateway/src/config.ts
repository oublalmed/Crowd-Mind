import dotenv from 'dotenv';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const nodeEnv = process.env.NODE_ENV || 'development';

// Fail fast in production with insecure JWT secrets
if (nodeEnv === 'production') {
  const insecureDefaults = [
    'dev-secret-change-in-production',
    'CHANGE_ME_IN_PRODUCTION',
    'secret',
    'changeme',
  ];
  if (insecureDefaults.includes(jwtSecret)) {
    throw new Error('SECURITY: JWT_SECRET is using an insecure default in production');
  }
  if (jwtSecret.length < 32) {
    throw new Error('SECURITY: JWT_SECRET must be at least 32 characters in production');
  }
}

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv,

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  jwt: {
    secret: jwtSecret,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    keyPrefix: 'gateway:',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    gameEngine: process.env.GAME_ENGINE_URL || 'http://localhost:3003',
    voting: process.env.VOTING_SERVICE_URL || 'http://localhost:3004',
    leaderboard: process.env.LEADERBOARD_URL || 'http://localhost:3005',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    analytics: process.env.ANALYTICS_URL || 'http://localhost:3007',
    notification: process.env.NOTIFICATION_URL || 'http://localhost:3008',
  },
} as const;
