import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import config from './config';
import Database from './db';
import RedisClient from './redis';
import gameRoutes from './routes/game.routes';
import { registerGameHandlers } from './socket/game.handler';

async function main(): Promise<void> {
  const app = express();

  // --------------- Middleware ---------------
  app.use(helmet());
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json());

  // --------------- Health check ---------------
  app.get('/health', async (_req, res) => {
    let dbHealthy = false;
    let redisHealthy = false;

    try {
      dbHealthy = await Database.healthCheck();
    } catch {
      dbHealthy = false;
    }

    try {
      const redis = RedisClient.getClient();
      const pong = await redis.ping();
      redisHealthy = pong === 'PONG';
    } catch {
      redisHealthy = false;
    }

    const allHealthy = dbHealthy && redisHealthy;

    res.status(allHealthy ? 200 : 503).json({
      service: 'game-engine',
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
    });
  });

  // --------------- Routes ---------------
  app.use('/games', gameRoutes);

  // --------------- 404 handler ---------------
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  // --------------- Global error handler ---------------
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[GameEngine] Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  // --------------- HTTP Server + Socket.IO ---------------
  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
    },
    path: '/ws/game',
  });

  registerGameHandlers(io);

  // --------------- Database check ---------------
  try {
    const healthy = await Database.healthCheck();
    if (healthy) {
      console.log('[GameEngine] PostgreSQL connection verified');
    }
  } catch (err) {
    console.warn('[GameEngine] PostgreSQL not available, continuing without DB:', err);
  }

  // --------------- Start ---------------
  httpServer.listen(config.wsPort, () => {
    console.log(`[GameEngine] WebSocket server listening on port ${config.wsPort}`);
  });

  app.listen(config.port, () => {
    console.log(`[GameEngine] HTTP server listening on port ${config.port}`);
  });

  // --------------- Graceful shutdown ---------------
  const shutdown = async (signal: string) => {
    console.log(`[GameEngine] ${signal} received. Starting graceful shutdown...`);

    io.close();
    httpServer.close();

    try {
      await Database.disconnect();
      await RedisClient.disconnect();
    } catch (error) {
      console.error('[GameEngine] Error during shutdown:', error);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[GameEngine] Failed to start:', err);
  process.exit(1);
});
