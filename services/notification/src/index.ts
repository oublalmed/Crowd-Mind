import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { notificationRoutes } from './routes/notification.routes';
import { startNotificationWorker } from './workers/notification.worker';
import { pool } from './db';
import { redis } from './redis';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request ID middleware
app.use((req, _res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

// Health check
app.get('/health', async (_req, res) => {
  try {
    const pgResult = await pool.query('SELECT 1');
    const redisStatus = redis.status;

    res.json({
      status: 'healthy',
      service: 'notification',
      timestamp: new Date().toISOString(),
      dependencies: {
        postgres: pgResult.rows.length > 0 ? 'connected' : 'disconnected',
        redis: redisStatus === 'ready' ? 'connected' : redisStatus,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'notification',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Routes
app.use('/', notificationRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[NotificationService] Unhandled error: ${err.message}`, {
    stack: err.stack,
  });

  res.status(500).json({
    error: 'Internal server error',
    ...(config.nodeEnv === 'development' && { details: err.message }),
  });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`[NotificationService] Running on port ${config.port} (${config.nodeEnv})`);
});

// Start BullMQ worker for scheduled notifications
let worker: Awaited<ReturnType<typeof startNotificationWorker>> | null = null;

(async () => {
  try {
    worker = await startNotificationWorker();
    console.log('[NotificationService] BullMQ worker started for scheduled notifications');
  } catch (error) {
    console.error('[NotificationService] Failed to start BullMQ worker:', error);
  }
})();

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`[NotificationService] ${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('[NotificationService] HTTP server closed');

    try {
      if (worker) {
        await worker.close();
        console.log('[NotificationService] BullMQ worker closed');
      }

      await pool.end();
      console.log('[NotificationService] PostgreSQL pool closed');

      await redis.quit();
      console.log('[NotificationService] Redis connection closed');
    } catch (error) {
      console.error('[NotificationService] Error during shutdown:', error);
    }

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('[NotificationService] Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
