import { Request, Response } from 'express';
import { GameController } from '../controllers/game.controller';

// Mock the game-manager service
jest.mock('../services/game-manager.service');

const { GameManagerService } = require('../services/game-manager.service');

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  query: Record<string, string> = {}
): Request =>
  ({ body, params, query } as unknown as Request);

describe('GameController', () => {
  let controller: GameController;
  let res: Response;

  beforeEach(() => {
    controller = new GameController();
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('returns 201 when room is created', async () => {
      const mockRoom = { roomId: 'ABC123', hostId: 'user-1', gameMode: 'crowd-mind' };
      GameManagerService.prototype.createRoom = jest.fn().mockResolvedValue(mockRoom);

      await controller.createRoom(
        mockRequest({ hostId: 'user-1', gameMode: 'crowd-mind' }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('returns 400 when hostId is missing', async () => {
      await controller.createRoom(mockRequest({ gameMode: 'crowd-mind' }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('returns 400 when gameMode is missing', async () => {
      await controller.createRoom(mockRequest({ hostId: 'user-1' }), res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getRoom', () => {
    it('returns room data when found', async () => {
      const mockRoom = { roomId: 'ABC123', players: [] };
      GameManagerService.prototype.getRoom = jest.fn().mockResolvedValue(mockRoom);

      await controller.getRoom(mockRequest({}, { roomId: 'ABC123' }), res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockRoom })
      );
    });

    it('returns 404 when room not found', async () => {
      GameManagerService.prototype.getRoom = jest.fn().mockResolvedValue(null);

      await controller.getRoom(mockRequest({}, { roomId: 'NOTFOUND' }), res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('joinRoom', () => {
    it('returns success when joining', async () => {
      GameManagerService.prototype.joinRoom = jest.fn().mockResolvedValue({ joined: true });

      await controller.joinRoom(
        mockRequest({ userId: 'user-2' }, { roomId: 'ABC123' }),
        res
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('returns 400 when userId is missing', async () => {
      await controller.joinRoom(mockRequest({}, { roomId: 'ABC123' }), res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('listRooms', () => {
    it('returns list of rooms', async () => {
      const mockRooms = [
        { roomId: 'ABC123', playerCount: 3 },
        { roomId: 'DEF456', playerCount: 5 },
      ];
      GameManagerService.prototype.listRooms = jest.fn().mockResolvedValue(mockRooms);

      await controller.listRooms(mockRequest(), res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockRooms })
      );
    });
  });
});
