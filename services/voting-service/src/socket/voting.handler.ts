import { Server, Socket } from 'socket.io';
import { VotingService, VotingError } from '../services/voting.service';
import { redisSub } from '../redis';

const votingService = new VotingService();

/**
 * Register Socket.IO event handlers for real-time voting.
 */
export function registerVotingHandlers(io: Server): void {
  // -----------------------------------------------------------
  // Redis Pub/Sub listener: forward vote events to Socket rooms
  // -----------------------------------------------------------
  redisSub.psubscribe('voting:votes:*', (err) => {
    if (err) {
      console.error('[WS] Failed to subscribe to vote channels:', err);
    } else {
      console.log('[WS] Subscribed to voting:votes:* channels');
    }
  });

  redisSub.on('pmessage', (_pattern, channel, message) => {
    // channel looks like "voting:votes:<roomId>"
    const roomId = channel.replace('voting:votes:', '');
    try {
      const payload = JSON.parse(message);
      io.to(`room:${roomId}`).emit('vote:update', payload);
    } catch {
      console.error('[WS] Failed to parse vote pub/sub message');
    }
  });

  // -----------------------------------------------------------
  // Per-connection handlers
  // -----------------------------------------------------------
  io.on('connection', (socket: Socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Join a room to receive vote broadcasts
    socket.on('room:join', (data: { roomId: string }) => {
      if (!data.roomId) {
        socket.emit('error', { message: 'roomId is required' });
        return;
      }

      socket.join(`room:${data.roomId}`);
      console.log(`[WS] ${socket.id} joined room:${data.roomId}`);
      socket.emit('room:joined', { roomId: data.roomId });
    });

    // Leave a room
    socket.on('room:leave', (data: { roomId: string }) => {
      if (!data.roomId) return;
      socket.leave(`room:${data.roomId}`);
      console.log(`[WS] ${socket.id} left room:${data.roomId}`);
    });

    // Submit a vote via WebSocket
    socket.on(
      'vote:submit',
      async (data: { roomId: string; userId: string; optionIndex: number }) => {
        try {
          const { roomId, userId, optionIndex } = data;

          if (!roomId || !userId || optionIndex === undefined) {
            socket.emit('vote:error', {
              message: 'roomId, userId, and optionIndex are required',
            });
            return;
          }

          if (typeof optionIndex !== 'number' || optionIndex < 0) {
            socket.emit('vote:error', {
              message: 'optionIndex must be a non-negative integer',
            });
            return;
          }

          const vote = await votingService.submitVote(roomId, userId, optionIndex);
          socket.emit('vote:confirmed', { vote });

          // Majority will be broadcast via the Redis Pub/Sub -> io.to() path
        } catch (err) {
          if (err instanceof VotingError) {
            socket.emit('vote:error', {
              message: err.message,
              code: err.code,
            });
          } else {
            console.error('[WS] vote:submit error:', err);
            socket.emit('vote:error', { message: 'Internal server error' });
          }
        }
      },
    );

    // Request current tally
    socket.on(
      'vote:getTally',
      async (data: { roomId: string; roundNumber: number }) => {
        try {
          const { roomId, roundNumber } = data;
          const result = await votingService.calculateMajority(roomId, roundNumber);
          socket.emit('vote:tally', { roomId, roundNumber, result });
        } catch (err) {
          console.error('[WS] vote:getTally error:', err);
          socket.emit('vote:error', { message: 'Failed to get tally' });
        }
      },
    );

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });
}
