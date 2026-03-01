import { Server, Socket } from 'socket.io';
import { gameManager, GameManagerError } from '../services/game-manager.service';
import { getStrategy, VoteData, RoundResult } from '../services/scoring.service';

/**
 * Register Socket.IO event handlers for real-time game interactions.
 */
export function registerGameHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[GameWS] Client connected: ${socket.id}`);

    // ----- join-room -----
    socket.on('join-room', async (data: { roomId: string; userId: string }) => {
      try {
        const { roomId, userId } = data;

        if (!roomId || !userId) {
          socket.emit('error', { message: 'roomId and userId are required' });
          return;
        }

        const room = await gameManager.joinRoom(roomId, userId);

        socket.join(`room:${roomId}`);
        socket.data.roomId = roomId;
        socket.data.userId = userId;

        socket.emit('room-state', room);
        socket.to(`room:${roomId}`).emit('player-joined', {
          userId,
          playerCount: Object.keys(room.players).length,
        });
      } catch (err) {
        if (err instanceof GameManagerError) {
          socket.emit('error', { message: err.message, code: err.code });
        } else {
          console.error('[GameWS] join-room error:', err);
          socket.emit('error', { message: 'Failed to join room' });
        }
      }
    });

    // ----- leave-room -----
    socket.on('leave-room', async (data: { roomId: string; userId: string }) => {
      try {
        const roomId = data.roomId || socket.data.roomId;
        const userId = data.userId || socket.data.userId;

        if (!roomId || !userId) return;

        const room = await gameManager.leaveRoom(roomId, userId);

        socket.leave(`room:${roomId}`);
        socket.data.roomId = undefined;
        socket.data.userId = undefined;

        if (room) {
          io.to(`room:${roomId}`).emit('player-left', {
            userId,
            playerCount: Object.keys(room.players).length,
            newHostId: room.hostId,
          });
        }
      } catch (err) {
        console.error('[GameWS] leave-room error:', err);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // ----- player-ready -----
    socket.on('player-ready', async (data: { roomId: string; userId: string; isReady: boolean }) => {
      try {
        const { roomId, userId, isReady } = data;

        if (!roomId || !userId) {
          socket.emit('error', { message: 'roomId and userId are required' });
          return;
        }

        const room = await gameManager.setPlayerReady(roomId, userId, isReady ?? true);

        io.to(`room:${roomId}`).emit('player-ready-changed', {
          userId,
          isReady: room.players[userId]?.isReady ?? false,
          players: room.players,
        });
      } catch (err) {
        if (err instanceof GameManagerError) {
          socket.emit('error', { message: err.message, code: err.code });
        } else {
          console.error('[GameWS] player-ready error:', err);
          socket.emit('error', { message: 'Failed to update ready status' });
        }
      }
    });

    // ----- start-game -----
    socket.on('start-game', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        if (!roomId) {
          socket.emit('error', { message: 'roomId is required' });
          return;
        }

        const room = await gameManager.startGame(roomId);

        io.to(`room:${roomId}`).emit('game-started', {
          roomId: room.id,
          gameMode: room.gameMode,
          totalRounds: room.totalRounds,
          currentRound: room.currentRound,
          startedAt: room.startedAt,
        });

        io.to(`room:${roomId}`).emit('round-started', {
          round: room.currentRound,
          totalRounds: room.totalRounds,
          votingPhaseDurationSec: room.settings.votingPhaseDurationSec,
        });
      } catch (err) {
        if (err instanceof GameManagerError) {
          socket.emit('error', { message: err.message, code: err.code });
        } else {
          console.error('[GameWS] start-game error:', err);
          socket.emit('error', { message: 'Failed to start game' });
        }
      }
    });

    // ----- submit-vote -----
    socket.on(
      'submit-vote',
      async (data: { roomId: string; userId: string; choice: string }) => {
        try {
          const { roomId, userId, choice } = data;

          if (!roomId || !userId || !choice) {
            socket.emit('error', { message: 'roomId, userId, and choice are required' });
            return;
          }

          const room = await gameManager.getRoomState(roomId);
          if (!room) {
            socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
            return;
          }

          if (room.status !== 'active') {
            socket.emit('error', { message: 'Game is not active', code: 'GAME_NOT_ACTIVE' });
            return;
          }

          // Calculate score using the scoring strategy
          const strategy = getStrategy(room.gameMode);
          const now = Date.now();
          const roundStartedAt = room.startedAt || now;
          const timeElapsed = now - roundStartedAt;

          const voteData: VoteData = {
            choice,
            submittedAt: now,
          };

          // Acknowledge the vote
          socket.emit('vote-confirmed', {
            roomId,
            userId,
            choice,
            round: room.currentRound,
          });

          // Broadcast to room
          io.to(`room:${roomId}`).emit('vote-received', {
            userId,
            round: room.currentRound,
            timestamp: now,
          });
        } catch (err) {
          console.error('[GameWS] submit-vote error:', err);
          socket.emit('error', { message: 'Failed to submit vote' });
        }
      }
    );

    // ----- next-round -----
    socket.on('next-round', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        if (!roomId) {
          socket.emit('error', { message: 'roomId is required' });
          return;
        }

        const room = await gameManager.nextRound(roomId);

        if (room.status === 'finished') {
          // Build final results sorted by score
          const finalResults = Object.values(room.players)
            .map((p) => ({
              userId: p.userId,
              score: p.score,
            }))
            .sort((a, b) => b.score - a.score);

          io.to(`room:${roomId}`).emit('game-ended', {
            roomId: room.id,
            results: finalResults,
            endedAt: room.endedAt,
          });
        } else {
          io.to(`room:${roomId}`).emit('round-started', {
            round: room.currentRound,
            totalRounds: room.totalRounds,
            votingPhaseDurationSec: room.settings.votingPhaseDurationSec,
          });
        }
      } catch (err) {
        if (err instanceof GameManagerError) {
          socket.emit('error', { message: err.message, code: err.code });
        } else {
          console.error('[GameWS] next-round error:', err);
          socket.emit('error', { message: 'Failed to advance round' });
        }
      }
    });

    // ----- disconnect -----
    socket.on('disconnect', async () => {
      console.log(`[GameWS] Client disconnected: ${socket.id}`);

      const roomId = socket.data.roomId as string | undefined;
      const userId = socket.data.userId as string | undefined;

      if (roomId && userId) {
        try {
          const room = await gameManager.getRoomState(roomId);
          if (room && room.players[userId]) {
            room.players[userId].isConnected = false;

            // If the game is still in waiting state, remove the player entirely
            if (room.status === 'waiting') {
              const updatedRoom = await gameManager.leaveRoom(roomId, userId);
              if (updatedRoom) {
                io.to(`room:${roomId}`).emit('player-left', {
                  userId,
                  playerCount: Object.keys(updatedRoom.players).length,
                  newHostId: updatedRoom.hostId,
                });
              }
            } else {
              io.to(`room:${roomId}`).emit('player-disconnected', { userId });
            }
          }
        } catch (err) {
          console.error('[GameWS] disconnect cleanup error:', err);
        }
      }
    });
  });
}
