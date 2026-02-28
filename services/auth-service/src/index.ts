import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import pool from './db';
import redisClient from './redis';

const app = express();

// --------------- Middleware ---------------
app.use(helmet());
app.use(cors());
app.use(express.json());

// --------------- Health check ---------------
app.get('/health', async (_req, res) => {
  let dbHealthy = false;
  let redisHealthy = false;

  try {
    const result = await pool.query('SELECT 1');
    dbHealthy = result.rows.length > 0;
  } catch {
    dbHealthy = false;
  }

  try {
    const pong = await redisClient.ping();
    redisHealthy = pong === 'PONG';
  } catch {
    redisHealthy = false;
  }

  const allHealthy = dbHealthy && redisHealthy;
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    service: 'auth-service',
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected',
    },
  });
});

// --------------- Routes ---------------
app.use('/auth', authRoutes);

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
  console.error('[AuthService] Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// --------------- Start server ---------------
const server = app.listen(config.port, () => {
  console.log(`[AuthService] Listening on port ${config.port}`);
});

// --------------- Graceful shutdown ---------------
const shutdown = async (signal: string) => {
  console.log(`[AuthService] ${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('[AuthService] HTTP server closed');

    try {
      await pool.end();
      console.log('[AuthService] PostgreSQL pool closed');

      await redisClient.quit();
      console.log('[AuthService] Redis connection closed');
    } catch (error) {
      console.error('[AuthService] Error during shutdown:', error);
    }

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('[AuthService] Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
