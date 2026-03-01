import { v4 as uuidv4 } from 'uuid';
import RedisClient from '../redis';
import config from '../config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameSettings {
  maxPlayers: number;
  rounds: number;
  votingPhaseDurationSec: number;
  resultsPhaseDurationSec: number;
  isPrivate: boolean;
}

export interface Player {
  userId: string;
  joinedAt: number;
  isReady: boolean;
  score: number;
  isConnected: boolean;
}

export type RoomStatus = 'waiting' | 'active' | 'finished';

export interface RoomState {
  id: string;
  hostId: string;
  gameMode: string;
  status: RoomStatus;
  settings: GameSettings;
  players: Record<string, Player>;
  currentRound: number;
  totalRounds: number;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}

export class GameManagerError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'GameManagerError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, GameManagerError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const ROOM_KEY_PREFIX = 'room:';
const ROOMS_INDEX_KEY = 'rooms:index';

export class GameManagerService {
  private redis = RedisClient.getClient();

  /**
   * Create a new game room hosted by the given user.
   */
  async createRoom(
    hostId: string,
    gameMode: string,
    settings?: Partial<GameSettings>
  ): Promise<RoomState> {
    const roomId = uuidv4();

    const roomSettings: GameSettings = {
      maxPlayers: settings?.maxPlayers ?? config.matchmaking.maxPlayers,
      rounds: settings?.rounds ?? config.game.defaultRounds,
      votingPhaseDurationSec: settings?.votingPhaseDurationSec ?? config.game.votingPhaseDurationSec,
      resultsPhaseDurationSec: settings?.resultsPhaseDurationSec ?? config.game.resultsPhaseDurationSec,
      isPrivate: settings?.isPrivate ?? false,
    };

    const room: RoomState = {
      id: roomId,
      hostId,
      gameMode,
      status: 'waiting',
      settings: roomSettings,
      players: {
        [hostId]: {
          userId: hostId,
          joinedAt: Date.now(),
          isReady: false,
          score: 0,
          isConnected: true,
        },
      },
      currentRound: 0,
      totalRounds: roomSettings.rounds,
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
    };

    // Store room state in Redis with TTL
    await this.redis.set(
      `${ROOM_KEY_PREFIX}${roomId}`,
      JSON.stringify(room),
      'EX',
      config.game.roomTtlSec
    );

    // Add to rooms index for listing
    if (!roomSettings.isPrivate) {
      await this.redis.sadd(ROOMS_INDEX_KEY, roomId);
    }

    return room;
  }

  /**
   * Add a player to an existing room.
   */
  async joinRoom(roomId: string, userId: string): Promise<RoomState> {
    const room = await this.getRoomState(roomId);

    if (!room) {
      throw new GameManagerError('Room not found', 'ROOM_NOT_FOUND', 404);
    }

    if (room.status !== 'waiting') {
      throw new GameManagerError('Game has already started', 'GAME_IN_PROGRESS', 400);
    }

    if (room.players[userId]) {
      // Player is already in the room; re-connect
      room.players[userId].isConnected = true;
      await this.saveRoom(room);
      return room;
    }

    const playerCount = Object.keys(room.players).length;
    if (playerCount >= room.settings.maxPlayers) {
      throw new GameManagerError('Room is full', 'ROOM_FULL', 400);
    }

    room.players[userId] = {
      userId,
      joinedAt: Date.now(),
      isReady: false,
      score: 0,
      isConnected: true,
    };

    await this.saveRoom(room);
    return room;
  }

  /**
   * Remove a player from a room.
   */
  async leaveRoom(roomId: string, userId: string): Promise<RoomState | null> {
    const room = await this.getRoomState(roomId);

    if (!room) {
      return null;
    }

    delete room.players[userId];

    // If no players remain, delete the room
    if (Object.keys(room.players).length === 0) {
      await this.deleteRoom(roomId);
      return null;
    }

    // If host left, assign new host
    if (room.hostId === userId) {
      const remainingPlayerIds = Object.keys(room.players);
      room.hostId = remainingPlayerIds[0];
    }

    await this.saveRoom(room);
    return room;
  }

  /**
   * Transition a room from "waiting" to "active" and start the first round.
   */
  async startGame(roomId: string): Promise<RoomState> {
    const room = await this.getRoomState(roomId);

    if (!room) {
      throw new GameManagerError('Room not found', 'ROOM_NOT_FOUND', 404);
    }

    if (room.status !== 'waiting') {
      throw new GameManagerError('Game has already started', 'GAME_IN_PROGRESS', 400);
    }

    const playerCount = Object.keys(room.players).length;
    if (playerCount < config.matchmaking.minPlayers) {
      throw new GameManagerError(
        `Need at least ${config.matchmaking.minPlayers} players to start`,
        'NOT_ENOUGH_PLAYERS',
        400
      );
    }

    room.status = 'active';
    room.startedAt = Date.now();
    room.currentRound = 1;

    // Remove from public rooms listing
    await this.redis.srem(ROOMS_INDEX_KEY, roomId);

    await this.saveRoom(room);
    return room;
  }

  /**
   * Advance to the next round, or end the game if all rounds are completed.
   */
  async nextRound(roomId: string): Promise<RoomState> {
    const room = await this.getRoomState(roomId);

    if (!room) {
      throw new GameManagerError('Room not found', 'ROOM_NOT_FOUND', 404);
    }

    if (room.status !== 'active') {
      throw new GameManagerError('Game is not active', 'GAME_NOT_ACTIVE', 400);
    }

    if (room.currentRound >= room.totalRounds) {
      return this.endGame(roomId);
    }

    room.currentRound += 1;
    await this.saveRoom(room);
    return room;
  }

  /**
   * End the game and finalize scores.
   */
  async endGame(roomId: string): Promise<RoomState> {
    const room = await this.getRoomState(roomId);

    if (!room) {
      throw new GameManagerError('Room not found', 'ROOM_NOT_FOUND', 404);
    }

    room.status = 'finished';
    room.endedAt = Date.now();

    // Remove from public rooms listing
    await this.redis.srem(ROOMS_INDEX_KEY, roomId);

    // Keep the finished room in Redis for a shorter TTL so results can be retrieved
    await this.redis.set(
      `${ROOM_KEY_PREFIX}${roomId}`,
      JSON.stringify(room),
      'EX',
      300 // 5 minutes after game ends
    );

    return room;
  }

  /**
   * Retrieve the current state of a room from Redis.
   */
  async getRoomState(roomId: string): Promise<RoomState | null> {
    const data = await this.redis.get(`${ROOM_KEY_PREFIX}${roomId}`);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as RoomState;
  }

  /**
   * List available (public, waiting) rooms.
   */
  async getAvailableRooms(): Promise<RoomState[]> {
    const roomIds = await this.redis.smembers(ROOMS_INDEX_KEY);

    if (roomIds.length === 0) {
      return [];
    }

    const rooms: RoomState[] = [];

    for (const roomId of roomIds) {
      const room = await this.getRoomState(roomId);

      if (room && room.status === 'waiting') {
        rooms.push(room);
      } else {
        // Clean up stale entries
        await this.redis.srem(ROOMS_INDEX_KEY, roomId);
      }
    }

    return rooms;
  }

  /**
   * Update a player's score in a room.
   */
  async updatePlayerScore(roomId: string, userId: string, points: number): Promise<void> {
    const room = await this.getRoomState(roomId);

    if (!room || !room.players[userId]) {
      return;
    }

    room.players[userId].score += points;
    await this.saveRoom(room);
  }

  /**
   * Set a player's ready status.
   */
  async setPlayerReady(roomId: string, userId: string, isReady: boolean): Promise<RoomState> {
    const room = await this.getRoomState(roomId);

    if (!room) {
      throw new GameManagerError('Room not found', 'ROOM_NOT_FOUND', 404);
    }

    if (!room.players[userId]) {
      throw new GameManagerError('Player not in room', 'PLAYER_NOT_IN_ROOM', 400);
    }

    room.players[userId].isReady = isReady;
    await this.saveRoom(room);
    return room;
  }

  // ========== Private helpers ==========

  private async saveRoom(room: RoomState): Promise<void> {
    await this.redis.set(
      `${ROOM_KEY_PREFIX}${room.id}`,
      JSON.stringify(room),
      'EX',
      config.game.roomTtlSec
    );
  }

  private async deleteRoom(roomId: string): Promise<void> {
    await this.redis.del(`${ROOM_KEY_PREFIX}${roomId}`);
    await this.redis.srem(ROOMS_INDEX_KEY, roomId);
  }
}

export const gameManager = new GameManagerService();
