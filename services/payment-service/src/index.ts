import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { checkDatabaseConnection } from './db';
import paymentRoutes from './routes/payment.routes';

async function main(): Promise<void> {
  const app = express();

  // --------------- Middleware ---------------
  app.use(helmet());
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json());

  // --------------- Health check ---------------
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'payment-service' });
  });

  // --------------- Routes ---------------
  app.use('/', paymentRoutes);

  // --------------- Database ---------------
  try {
    await checkDatabaseConnection();
  } catch (err) {
    console.warn('[Payment] PostgreSQL not available, continuing without DB:', err);
  }

  // --------------- Start ---------------
  app.listen(config.port, () => {
    console.log(`[Payment] HTTP server listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('[Payment] Failed to start:', err);
  process.exit(1);
});
