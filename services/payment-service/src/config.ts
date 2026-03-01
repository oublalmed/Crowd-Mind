import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PAYMENT_SERVICE_PORT || '3006', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'crowdmind_payments',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: parseInt(process.env.POSTGRES_POOL_SIZE || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  /** Virtual currency exchange rate: 1 USD = X coins */
  coinsPerDollar: parseInt(process.env.COINS_PER_DOLLAR || '100', 10),
} as const;
