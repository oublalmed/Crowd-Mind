import Redis from 'ioredis';
import { config } from './config';

const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  keyPrefix: config.redis.keyPrefix,
  retryStrategy(times: number): number | null {
    if (times > 10) {
      console.error('Redis: max retry attempts reached, giving up');
      return null;
    }
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
  console.log('Redis: connected');
});

redisClient.on('error', (err: Error) => {
  console.error('Redis: connection error', err.message);
});

redisClient.on('close', () => {
  console.warn('Redis: connection closed');
});

export default redisClient;
