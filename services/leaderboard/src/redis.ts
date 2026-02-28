import Redis from 'ioredis';
import { config } from './config';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  keyPrefix: config.redis.keyPrefix,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 5_000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => console.error('[Redis] Connection error:', err));
redis.on('connect', () => console.log('[Redis] Connected'));
