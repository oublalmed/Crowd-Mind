import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { checkDatabaseConnection } from './db';
import analyticsRoutes from './routes/analytics.routes';
import { stopFlushTimer, flushEvents } from './services/analytics.service';

async function main(): Promise<void> {
  const app = express();

  // --------------- Middleware ---------------
  app.use(helmet());
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json({ limit: '1mb' }));

  // --------------- Health check ---------------
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'analytics' });
  });

  // --------------- Routes ---------------
  app.use('/', analyticsRoutes);

  // --------------- Database ---------------
  try {
    await checkDatabaseConnection();
  } catch (err) {
    console.warn('[Analytics] PostgreSQL not available, continuing without DB:', err);
  }

  // --------------- Start ---------------
  const server = app.listen(config.port, () => {
    console.log(`[Analytics] HTTP server listening on port ${config.port}`);
  });

  // --------------- Graceful shutdown ---------------
  const shutdown = async (signal: string) => {
    console.log(`[Analytics] ${signal} received. Flushing remaining events...`);
    stopFlushTimer();
    await flushEvents();
    server.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[Analytics] Failed to start:', err);
  process.exit(1);
});
