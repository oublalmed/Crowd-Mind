import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { userRouter } from './routes/user.routes';
import { checkDatabaseConnection } from './db';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  const dbHealthy = await checkDatabaseConnection();

  const status = dbHealthy ? 'healthy' : 'degraded';
  const statusCode = dbHealthy ? 200 : 503;

  res.status(statusCode).json({
    service: 'user-service',
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealthy ? 'connected' : 'disconnected',
    },
  });
});

app.use(userRouter);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

app.listen(config.port, () => {
  console.log(`User service listening on port ${config.port}`);
});

export default app;
