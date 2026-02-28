import { Request, Response } from 'express';
import { LeaderboardService, LeaderboardType } from '../services/leaderboard.service';

const leaderboardService = new LeaderboardService();

const VALID_TYPES: LeaderboardType[] = ['daily', 'weekly', 'season', 'alltime'];

export class LeaderboardController {
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);

      if (!VALID_TYPES.includes(type as LeaderboardType)) {
        res.status(400).json({
          error: `Invalid leaderboard type. Valid types: ${VALID_TYPES.join(', ')}`,
        });
        return;
      }

      const result = await leaderboardService.getLeaderboard(
        type as LeaderboardType,
        page,
        limit,
      );

      res.json({
        success: true,
        data: result.entries,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (err) {
      console.error('[LeaderboardController] getLeaderboard error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserRank(req: Request, res: Response): Promise<void> {
    try {
      const { type, userId } = req.params;

      if (!VALID_TYPES.includes(type as LeaderboardType)) {
        res.status(400).json({
          error: `Invalid leaderboard type. Valid types: ${VALID_TYPES.join(', ')}`,
        });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const rank = await leaderboardService.getUserRank(
        type as LeaderboardType,
        userId,
      );

      if (!rank) {
        res.status(404).json({ error: 'User not found on leaderboard' });
        return;
      }

      res.json({ success: true, data: rank });
    } catch (err) {
      console.error('[LeaderboardController] getUserRank error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSeasons(_req: Request, res: Response): Promise<void> {
    try {
      const seasons = await leaderboardService.getSeasons();
      res.json({ success: true, data: seasons });
    } catch (err) {
      console.error('[LeaderboardController] getSeasons error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSeason(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;

      if (!seasonId) {
        res.status(400).json({ error: 'seasonId is required' });
        return;
      }

      const season = await leaderboardService.getSeason(seasonId);

      if (!season) {
        res.status(404).json({ error: 'Season not found' });
        return;
      }

      res.json({ success: true, data: season });
    } catch (err) {
      console.error('[LeaderboardController] getSeason error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateScore(req: Request, res: Response): Promise<void> {
    try {
      const { userId, points } = req.body;

      if (!userId || points === undefined) {
        res.status(400).json({ error: 'userId and points are required' });
        return;
      }

      if (typeof points !== 'number') {
        res.status(400).json({ error: 'points must be a number' });
        return;
      }

      await leaderboardService.updateScore(userId, points);
      res.json({ success: true, message: 'Score updated' });
    } catch (err) {
      console.error('[LeaderboardController] updateScore error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
