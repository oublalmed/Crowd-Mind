import Redis from 'ioredis';
import config from './config';

class RedisClient {
  private static instance: Redis | null = null;
  private static subscriber: Redis | null = null;

  /**
   * Get the shared Redis client instance for commands.
   * Creates the connection on first call.
   */
  static getClient(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        keyPrefix: config.redis.keyPrefix,
        retryStrategy(times: number): number | null {
          if (times > 10) {
            console.error('[Redis] Max reconnection attempts reached. Giving up.');
            return null;
          }
          const delay = Math.min(times * 200, 5000);
          console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times})...`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      RedisClient.instance.on('connect', () => {
        console.log('[Redis] Connected to Redis server');
      });

      RedisClient.instance.on('ready', () => {
        console.log('[Redis] Redis client ready');
      });

      RedisClient.instance.on('error', (err: Error) => {
        console.error('[Redis] Redis client error:', err.message);
      });

      RedisClient.instance.on('close', () => {
        console.warn('[Redis] Redis connection closed');
      });
    }

    return RedisClient.instance;
  }

  /**
   * Get a dedicated Redis subscriber client for pub/sub.
   * Subscriber connections cannot be used for regular commands.
   */
  static getSubscriber(): Redis {
    if (!RedisClient.subscriber) {
      RedisClient.subscriber = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryStrategy(times: number): number | null {
          if (times > 10) return null;
          return Math.min(times * 200, 5000);
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      RedisClient.subscriber.on('error', (err: Error) => {
        console.error('[Redis] Subscriber error:', err.message);
      });
    }

    return RedisClient.subscriber;
  }

  /**
   * Gracefully shut down all Redis connections.
   */
  static async disconnect(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (RedisClient.instance) {
      promises.push(
        RedisClient.instance.quit().then(() => {
          RedisClient.instance = null;
          console.log('[Redis] Main client disconnected');
        })
      );
    }

    if (RedisClient.subscriber) {
      promises.push(
        RedisClient.subscriber.quit().then(() => {
          RedisClient.subscriber = null;
          console.log('[Redis] Subscriber client disconnected');
        })
      );
    }

    await Promise.all(promises);
  }
}

export default RedisClient;
