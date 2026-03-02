// ---------------------------------------------------------------------------
// Mock Redis — must be defined before imports that trigger module evaluation
// ---------------------------------------------------------------------------

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
};

jest.mock('uuid', () => ({
  v4: () => 'test-room-id',
}));

jest.mock('../redis', () => ({
  __esModule: true,
  default: { getClient: () => mockRedis },
  getClient: () => mockRedis,
}));

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    matchmaking: { minPlayers: 2, maxPlayers: 10 },
    game: {
      defaultRounds: 5,
      votingPhaseDurationSec: 30,
      resultsPhaseDurationSec: 10,
      roomTtlSec: 3600,
    },
  },
}));

import { GameManagerService, GameManagerError, RoomState } from '../services/game-manager.service';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GameManagerService', () => {
  let service: GameManagerService;

  beforeEach(() => {
    service = new GameManagerService();
    jest.clearAllMocks();
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.srem.mockResolvedValue(1);
  });

  // -----------------------------------------------------------------------
  // createRoom
  // -----------------------------------------------------------------------

  describe('createRoom', () => {
    it('creates a room with default settings', async () => {
      const room = await service.createRoom('host-1', 'crowd_mind');

      expect(room.hostId).toBe('host-1');
      expect(room.gameMode).toBe('crowd_mind');
      expect(room.status).toBe('waiting');
      expect(room.settings.maxPlayers).toBe(10);
      expect(room.settings.rounds).toBe(5);
      expect(room.players['host-1']).toBeDefined();
      expect(room.players['host-1'].isReady).toBe(false);
      expect(room.players['host-1'].score).toBe(0);
      expect(room.currentRound).toBe(0);
      expect(room.startedAt).toBeNull();

      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      expect(mockRedis.sadd).toHaveBeenCalledTimes(1); // public room added to index
    });

    it('creates a private room without adding to public index', async () => {
      const room = await service.createRoom('host-1', 'crowd_mind', { isPrivate: true });

      expect(room.settings.isPrivate).toBe(true);
      expect(mockRedis.sadd).not.toHaveBeenCalled();
    });

    it('applies custom settings overrides', async () => {
      const room = await service.createRoom('host-1', 'speed_vote', {
        maxPlayers: 4,
        rounds: 3,
        votingPhaseDurationSec: 15,
      });

      expect(room.settings.maxPlayers).toBe(4);
      expect(room.settings.rounds).toBe(3);
      expect(room.settings.votingPhaseDurationSec).toBe(15);
    });
  });

  // -----------------------------------------------------------------------
  // joinRoom
  // -----------------------------------------------------------------------

  describe('joinRoom', () => {
    const existingRoom: RoomState = {
      id: 'room-1',
      hostId: 'host-1',
      gameMode: 'crowd_mind',
      status: 'waiting',
      settings: {
        maxPlayers: 4,
        rounds: 5,
        votingPhaseDurationSec: 30,
        resultsPhaseDurationSec: 10,
        isPrivate: false,
      },
      players: {
        'host-1': { userId: 'host-1', joinedAt: 1000, isReady: false, score: 0, isConnected: true },
      },
      currentRound: 0,
      totalRounds: 5,
      createdAt: 1000,
      startedAt: null,
      endedAt: null,
    };

    it('adds a new player to the room', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(existingRoom));

      const room = await service.joinRoom('room-1', 'player-2');

      expect(room.players['player-2']).toBeDefined();
      expect(room.players['player-2'].score).toBe(0);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('re-connects existing player without duplicating', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(existingRoom));

      const room = await service.joinRoom('room-1', 'host-1');

      expect(Object.keys(room.players)).toHaveLength(1);
      expect(room.players['host-1'].isConnected).toBe(true);
    });

    it('throws ROOM_NOT_FOUND for missing room', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.joinRoom('bad-room', 'player-2')).rejects.toThrow(GameManagerError);
      await expect(service.joinRoom('bad-room', 'player-2')).rejects.toMatchObject({
        code: 'ROOM_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('throws GAME_IN_PROGRESS for active game', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ ...existingRoom, status: 'active' }));

      await expect(service.joinRoom('room-1', 'player-2')).rejects.toMatchObject({
        code: 'GAME_IN_PROGRESS',
      });
    });

    it('throws ROOM_FULL when at capacity', async () => {
      const fullRoom = {
        ...existingRoom,
        settings: { ...existingRoom.settings, maxPlayers: 1 },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(fullRoom));

      await expect(service.joinRoom('room-1', 'player-2')).rejects.toMatchObject({
        code: 'ROOM_FULL',
      });
    });
  });

  // -----------------------------------------------------------------------
  // leaveRoom
  // -----------------------------------------------------------------------

  describe('leaveRoom', () => {
    const twoPlayerRoom: RoomState = {
      id: 'room-1',
      hostId: 'host-1',
      gameMode: 'crowd_mind',
      status: 'waiting',
      settings: {
        maxPlayers: 10,
        rounds: 5,
        votingPhaseDurationSec: 30,
        resultsPhaseDurationSec: 10,
        isPrivate: false,
      },
      players: {
        'host-1': { userId: 'host-1', joinedAt: 1000, isReady: true, score: 0, isConnected: true },
        'player-2': { userId: 'player-2', joinedAt: 2000, isReady: false, score: 0, isConnected: true },
      },
      currentRound: 0,
      totalRounds: 5,
      createdAt: 1000,
      startedAt: null,
      endedAt: null,
    };

    it('removes the player from the room', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(twoPlayerRoom));

      const room = await service.leaveRoom('room-1', 'player-2');

      expect(room).not.toBeNull();
      expect(room!.players['player-2']).toBeUndefined();
    });

    it('assigns new host when host leaves', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(twoPlayerRoom));

      const room = await service.leaveRoom('room-1', 'host-1');

      expect(room).not.toBeNull();
      expect(room!.hostId).toBe('player-2');
    });

    it('deletes room when last player leaves', async () => {
      const singlePlayerRoom = {
        ...twoPlayerRoom,
        players: {
          'host-1': twoPlayerRoom.players['host-1'],
        },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(singlePlayerRoom));

      const room = await service.leaveRoom('room-1', 'host-1');

      expect(room).toBeNull();
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('returns null for non-existent room', async () => {
      mockRedis.get.mockResolvedValue(null);

      const room = await service.leaveRoom('bad-room', 'player-1');

      expect(room).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // startGame
  // -----------------------------------------------------------------------

  describe('startGame', () => {
    const readyRoom: RoomState = {
      id: 'room-1',
      hostId: 'host-1',
      gameMode: 'crowd_mind',
      status: 'waiting',
      settings: {
        maxPlayers: 10,
        rounds: 5,
        votingPhaseDurationSec: 30,
        resultsPhaseDurationSec: 10,
        isPrivate: false,
      },
      players: {
        'host-1': { userId: 'host-1', joinedAt: 1000, isReady: true, score: 0, isConnected: true },
        'player-2': { userId: 'player-2', joinedAt: 2000, isReady: true, score: 0, isConnected: true },
      },
      currentRound: 0,
      totalRounds: 5,
      createdAt: 1000,
      startedAt: null,
      endedAt: null,
    };

    it('transitions room to active and sets round 1', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(readyRoom));

      const room = await service.startGame('room-1');

      expect(room.status).toBe('active');
      expect(room.currentRound).toBe(1);
      expect(room.startedAt).not.toBeNull();
      expect(mockRedis.srem).toHaveBeenCalled();
    });

    it('throws ROOM_NOT_FOUND for missing room', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.startGame('bad-room')).rejects.toMatchObject({
        code: 'ROOM_NOT_FOUND',
      });
    });

    it('throws GAME_IN_PROGRESS if already active', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ ...readyRoom, status: 'active' }));

      await expect(service.startGame('room-1')).rejects.toMatchObject({
        code: 'GAME_IN_PROGRESS',
      });
    });

    it('throws NOT_ENOUGH_PLAYERS with fewer than min', async () => {
      const singlePlayer = {
        ...readyRoom,
        players: { 'host-1': readyRoom.players['host-1'] },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(singlePlayer));

      await expect(service.startGame('room-1')).rejects.toMatchObject({
        code: 'NOT_ENOUGH_PLAYERS',
      });
    });
  });

  // -----------------------------------------------------------------------
  // nextRound
  // -----------------------------------------------------------------------

  describe('nextRound', () => {
    const activeRoom: RoomState = {
      id: 'room-1',
      hostId: 'host-1',
      gameMode: 'crowd_mind',
      status: 'active',
      settings: {
        maxPlayers: 10,
        rounds: 3,
        votingPhaseDurationSec: 30,
        resultsPhaseDurationSec: 10,
        isPrivate: false,
      },
      players: {
        'host-1': { userId: 'host-1', joinedAt: 1000, isReady: true, score: 100, isConnected: true },
      },
      currentRound: 1,
      totalRounds: 3,
      createdAt: 1000,
      startedAt: 2000,
      endedAt: null,
    };

    it('increments the round', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(activeRoom));

      const room = await service.nextRound('room-1');

      expect(room.currentRound).toBe(2);
    });

    it('ends game when all rounds are completed', async () => {
      const lastRound = { ...activeRoom, currentRound: 3 };
      mockRedis.get.mockResolvedValue(JSON.stringify(lastRound));

      const room = await service.nextRound('room-1');

      expect(room.status).toBe('finished');
      expect(room.endedAt).not.toBeNull();
    });

    it('throws ROOM_NOT_FOUND for missing room', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.nextRound('bad-room')).rejects.toMatchObject({
        code: 'ROOM_NOT_FOUND',
      });
    });

    it('throws GAME_NOT_ACTIVE for waiting room', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ ...activeRoom, status: 'waiting' }));

      await expect(service.nextRound('room-1')).rejects.toMatchObject({
        code: 'GAME_NOT_ACTIVE',
      });
    });
  });

  // -----------------------------------------------------------------------
  // endGame
  // -----------------------------------------------------------------------

  describe('endGame', () => {
    it('sets status to finished and endedAt', async () => {
      const room: RoomState = {
        id: 'room-1',
        hostId: 'host-1',
        gameMode: 'crowd_mind',
        status: 'active',
        settings: {
          maxPlayers: 10,
          rounds: 3,
          votingPhaseDurationSec: 30,
          resultsPhaseDurationSec: 10,
          isPrivate: false,
        },
        players: {},
        currentRound: 3,
        totalRounds: 3,
        createdAt: 1000,
        startedAt: 2000,
        endedAt: null,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(room));

      const result = await service.endGame('room-1');

      expect(result.status).toBe('finished');
      expect(result.endedAt).not.toBeNull();
      // Stored with short TTL (300s)
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        300
      );
    });
  });

  // -----------------------------------------------------------------------
  // setPlayerReady
  // -----------------------------------------------------------------------

  describe('setPlayerReady', () => {
    const room: RoomState = {
      id: 'room-1',
      hostId: 'host-1',
      gameMode: 'crowd_mind',
      status: 'waiting',
      settings: {
        maxPlayers: 10,
        rounds: 5,
        votingPhaseDurationSec: 30,
        resultsPhaseDurationSec: 10,
        isPrivate: false,
      },
      players: {
        'host-1': { userId: 'host-1', joinedAt: 1000, isReady: false, score: 0, isConnected: true },
      },
      currentRound: 0,
      totalRounds: 5,
      createdAt: 1000,
      startedAt: null,
      endedAt: null,
    };

    it('sets player ready status', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(room));

      const result = await service.setPlayerReady('room-1', 'host-1', true);

      expect(result.players['host-1'].isReady).toBe(true);
    });

    it('throws ROOM_NOT_FOUND for missing room', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.setPlayerReady('bad', 'host-1', true)).rejects.toMatchObject({
        code: 'ROOM_NOT_FOUND',
      });
    });

    it('throws PLAYER_NOT_IN_ROOM for unknown player', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(room));

      await expect(service.setPlayerReady('room-1', 'unknown', true)).rejects.toMatchObject({
        code: 'PLAYER_NOT_IN_ROOM',
      });
    });
  });

  // -----------------------------------------------------------------------
  // updatePlayerScore
  // -----------------------------------------------------------------------

  describe('updatePlayerScore', () => {
    it('adds points to player score', async () => {
      const room: RoomState = {
        id: 'room-1',
        hostId: 'host-1',
        gameMode: 'crowd_mind',
        status: 'active',
        settings: {
          maxPlayers: 10,
          rounds: 5,
          votingPhaseDurationSec: 30,
          resultsPhaseDurationSec: 10,
          isPrivate: false,
        },
        players: {
          'host-1': { userId: 'host-1', joinedAt: 1000, isReady: true, score: 100, isConnected: true },
        },
        currentRound: 1,
        totalRounds: 5,
        createdAt: 1000,
        startedAt: 2000,
        endedAt: null,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(room));

      await service.updatePlayerScore('room-1', 'host-1', 50);

      const savedRoom = JSON.parse(mockRedis.set.mock.calls[0][1]) as RoomState;
      expect(savedRoom.players['host-1'].score).toBe(150);
    });

    it('does nothing for non-existent room', async () => {
      mockRedis.get.mockResolvedValue(null);

      await service.updatePlayerScore('bad-room', 'host-1', 50);

      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // getAvailableRooms
  // -----------------------------------------------------------------------

  describe('getAvailableRooms', () => {
    it('returns only waiting rooms', async () => {
      const waitingRoom: RoomState = {
        id: 'room-1',
        hostId: 'host-1',
        gameMode: 'crowd_mind',
        status: 'waiting',
        settings: {
          maxPlayers: 10,
          rounds: 5,
          votingPhaseDurationSec: 30,
          resultsPhaseDurationSec: 10,
          isPrivate: false,
        },
        players: {},
        currentRound: 0,
        totalRounds: 5,
        createdAt: 1000,
        startedAt: null,
        endedAt: null,
      };

      mockRedis.smembers.mockResolvedValue(['room-1', 'room-2']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(waitingRoom))
        .mockResolvedValueOnce(null); // room-2 expired

      const rooms = await service.getAvailableRooms();

      expect(rooms).toHaveLength(1);
      expect(rooms[0].id).toBe('room-1');
      // Stale room-2 cleaned up
      expect(mockRedis.srem).toHaveBeenCalledWith('rooms:index', 'room-2');
    });

    it('returns empty array when no rooms exist', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const rooms = await service.getAvailableRooms();

      expect(rooms).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // GameManagerError
  // -----------------------------------------------------------------------

  describe('GameManagerError', () => {
    it('has code and statusCode properties', () => {
      const err = new GameManagerError('test', 'TEST_CODE', 418);

      expect(err.message).toBe('test');
      expect(err.code).toBe('TEST_CODE');
      expect(err.statusCode).toBe(418);
      expect(err.name).toBe('GameManagerError');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(GameManagerError);
    });
  });
});
