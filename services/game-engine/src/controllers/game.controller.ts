import { Request, Response } from 'express';
import { gameManager, GameManagerError } from '../services/game-manager.service';

export class GameController {
  /**
   * POST /games/rooms
   * Create a new game room.
   */
  async createRoom(req: Request, res: Response): Promise<void> {
    try {
      const { hostId, gameMode, settings } = req.body;

      if (!hostId || !gameMode) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'hostId and gameMode are required' },
        });
        return;
      }

      const room = await gameManager.createRoom(hostId, gameMode, settings);

      res.status(201).json({ success: true, data: room });
    } catch (err) {
      if (err instanceof GameManagerError) {
        res.status(err.statusCode).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
        return;
      }

      console.error('[GameController] createRoom error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /games/rooms
   * List available (public, waiting) rooms.
   */
  async getRooms(_req: Request, res: Response): Promise<void> {
    try {
      const rooms = await gameManager.getAvailableRooms();

      res.json({ success: true, data: rooms });
    } catch (err) {
      console.error('[GameController] getRooms error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /games/rooms/:roomId/join
   * Join an existing room.
   */
  async joinRoom(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'userId is required' },
        });
        return;
      }

      const room = await gameManager.joinRoom(roomId, userId);

      res.json({ success: true, data: room });
    } catch (err) {
      if (err instanceof GameManagerError) {
        res.status(err.statusCode).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
        return;
      }

      console.error('[GameController] joinRoom error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /games/rooms/:roomId
   * Get a specific room's state.
   */
  async getRoom(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      const room = await gameManager.getRoomState(roomId);

      if (!room) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Room not found' },
        });
        return;
      }

      res.json({ success: true, data: room });
    } catch (err) {
      console.error('[GameController] getRoom error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
