import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { checkDatabaseConnection } from './db';
import votingRoutes from './routes/voting.routes';
import { registerVotingHandlers } from './socket/voting.handler';

async function main(): Promise<void> {
  const app = express();

  // --------------- Middleware ---------------
  app.use(helmet());
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json());

  // --------------- Health check ---------------
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'voting-service' });
  });

  // --------------- Routes ---------------
  app.use('/', votingRoutes);

  // --------------- HTTP Server ---------------
  const httpServer = http.createServer(app);

  // --------------- Socket.IO ---------------
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
    },
    path: '/ws/voting',
  });

  registerVotingHandlers(io);

  // --------------- Start ---------------
  try {
    await checkDatabaseConnection();
  } catch (err) {
    console.warn('[Voting] PostgreSQL not available, continuing without DB:', err);
  }

  httpServer.listen(config.wsPort, () => {
    console.log(`[Voting] WebSocket server listening on port ${config.wsPort}`);
  });

  app.listen(config.port, () => {
    console.log(`[Voting] HTTP server listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('[Voting] Failed to start:', err);
  process.exit(1);
});
