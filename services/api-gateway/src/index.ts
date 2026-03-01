import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware';
import proxyRoutes from './routes/proxy.routes';

async function main(): Promise<void> {
  const app = express();

  // --------------- Middleware ---------------
  app.use(helmet());
  app.use(cors({ origin: config.cors.origin }));
  app.use(rateLimitMiddleware);

  // --------------- Health check ---------------
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
  });

  // --------------- Service status ---------------
  app.get('/api/v1/status', (_req, res) => {
    res.json({
      success: true,
      data: {
        service: 'api-gateway',
        version: '0.1.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  });

  // --------------- Proxy routes ---------------
  app.use(proxyRoutes);

  // --------------- 404 handler ---------------
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
      },
    });
  });

  // --------------- Global error handler ---------------
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('[Gateway] Unhandled error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  );

  // --------------- Start ---------------
  app.listen(config.port, () => {
    console.log(`[Gateway] Listening on port ${config.port}`);
    console.log(`[Gateway] Environment: ${config.nodeEnv}`);
  });
}

main().catch((err) => {
  console.error('[Gateway] Failed to start:', err);
  process.exit(1);
});
