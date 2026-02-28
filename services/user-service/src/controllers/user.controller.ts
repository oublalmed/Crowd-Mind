import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  /**
   * GET /users/profile/:userId
   * Retrieve a user's public profile.
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAM', message: 'userId is required' },
        });
        return;
      }

      const profile = await UserService.getUserById(userId);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      res.json({ success: true, data: profile });
    } catch (err) {
      console.error('[UserController] getProfile error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
    }
  }

  /**
   * PATCH /users/profile
   * Update the authenticated user's profile.
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { displayName, bio, preferences } = req.body;

      const updated = await UserService.updateUser(userId, {
        displayName,
        bio,
        preferences,
      });

      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('[UserController] updateProfile error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
    }
  }

  /**
   * GET /users/stats/:userId
   * Retrieve game statistics for a user.
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAM', message: 'userId is required' },
        });
        return;
      }

      const stats = await UserService.getUserStats(userId);

      if (!stats) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('[UserController] getStats error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
    }
  }

  /**
   * GET /users/friends
   * Get the authenticated user's friends list with pagination.
   */
  async getFriends(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

      const result = await UserService.getFriends(userId, page, limit);

      res.json({
        success: true,
        data: result.friends,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (err) {
      console.error('[UserController] getFriends error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
    }
  }

  /**
   * POST /users/friends/request
   * Send a friend request to another user.
   */
  async sendFriendRequest(req: Request, res: Response): Promise<void> {
    try {
      const fromId = req.userId!;
      const { toUserId } = req.body;

      if (!toUserId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'toUserId is required' },
        });
        return;
      }

      const request = await UserService.sendFriendRequest(fromId, toUserId);

      res.status(201).json({ success: true, data: request });
    } catch (err) {
      if (err instanceof Error) {
        const message = err.message;

        if (message === 'Cannot send a friend request to yourself') {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_REQUEST', message },
          });
          return;
        }

        if (
          message === 'You are already friends with this user' ||
          message === 'A friend request already exists between these users'
        ) {
          res.status(409).json({
            success: false,
            error: { code: 'CONFLICT', message },
          });
          return;
        }

        if (message === 'Target user not found') {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message },
          });
          return;
        }
      }

      console.error('[UserController] sendFriendRequest error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
    }
  }

  /**
   * GET /users/search
   * Search for users by username or display name.
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const q = req.query.q as string;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

      if (!q || q.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAM', message: 'Query parameter "q" is required' },
        });
        return;
      }

      const result = await UserService.searchUsers(q.trim(), page, limit);

      res.json({
        success: true,
        data: result.users,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (err) {
      console.error('[UserController] searchUsers error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
    }
  }
}
