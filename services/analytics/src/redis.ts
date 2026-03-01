import Redis from 'ioredis';
import { config } from './config';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  keyPrefix: config.redis.keyPrefix,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  console.log('[Analytics Redis] Connected');
});

redis.on('error', (err) => {
  console.error('[Analytics Redis] Error:', err.message);
});

export default redis;
