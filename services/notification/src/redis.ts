import Redis from 'ioredis';
import { config } from './config';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  keyPrefix: config.redis.keyPrefix,
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
  retryStrategy(times: number): number | null {
    if (times > 10) {
      console.error('[Redis] Max retry attempts reached. Giving up.');
      return null;
    }
    const delay = Math.min(times * 200, 5000);
    console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  reconnectOnError(err: Error): boolean {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
    return targetErrors.some((e) => err.message.includes(e));
  },
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('ready', () => {
  console.log('[Redis] Ready to accept commands');
});

redis.on('error', (err: Error) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('close', () => {
  console.warn('[Redis] Connection closed');
});

/**
 * Create a separate Redis connection for BullMQ (without keyPrefix).
 * BullMQ requires connections without key prefixes.
 */
export function createBullMQConnection(): Redis {
  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    maxRetriesPerRequest: null,
  });
}
