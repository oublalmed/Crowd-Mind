import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { checkDatabaseConnection } from './db';
import leaderboardRoutes from './routes/leaderboard.routes';
import { scheduleLeaderboardJobs } from './jobs/leaderboard.cron';

async function main(): Promise<void> {
  const app = express();

  // --------------- Middleware ---------------
  app.use(helmet());
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json());

  // --------------- Health check ---------------
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'leaderboard' });
  });

  // --------------- Routes ---------------
  app.use('/', leaderboardRoutes);

  // --------------- Database ---------------
  try {
    await checkDatabaseConnection();
  } catch (err) {
    console.warn('[Leaderboard] PostgreSQL not available, continuing without DB:', err);
  }

  // --------------- Cron Jobs ---------------
  scheduleLeaderboardJobs();

  // --------------- Start ---------------
  app.listen(config.port, () => {
    console.log(`[Leaderboard] HTTP server listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('[Leaderboard] Failed to start:', err);
  process.exit(1);
});
