import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  keyPrefix: config.redis.keyPrefix,
  maxRetriesPerRequest: null,
});

/**
 * Sliding-window rate limiter backed by Redis.
 * Limits each IP to `config.rateLimit.maxRequests` per `config.rateLimit.windowMs`.
 */
export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `ratelimit:${ip}`;
  const windowSec = Math.ceil(config.rateLimit.windowMs / 1000);

  redis
    .multi()
    .incr(key)
    .expire(key, windowSec)
    .exec()
    .then((results) => {
      if (!results) {
        next();
        return;
      }

      const [[, count]] = results as [[null, number]];

      res.setHeader('X-RateLimit-Limit', config.rateLimit.maxRequests.toString());
      res.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, config.rateLimit.maxRequests - (count as number)).toString()
      );

      if ((count as number) > config.rateLimit.maxRequests) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
        });
        return;
      }

      next();
    })
    .catch(() => {
      // If Redis is down, allow the request through
      next();
    });
}
