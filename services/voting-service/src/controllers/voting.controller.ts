import { Request, Response } from 'express';
import { VotingService, VotingError } from '../services/voting.service';

const votingService = new VotingService();

export class VotingController {
  async getVotesForRoom(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      if (!roomId) {
        res.status(400).json({ error: 'roomId is required' });
        return;
      }

      const votes = await votingService.getVotesForRoom(roomId);
      res.json({ success: true, data: votes });
    } catch (err) {
      console.error('[VotingController] getVotesForRoom error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getVoteHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const result = await votingService.getVoteHistory(userId, page, limit);
      res.json({
        success: true,
        data: result.votes,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (err) {
      console.error('[VotingController] getVoteHistory error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async submitVote(req: Request, res: Response): Promise<void> {
    try {
      const { roomId, userId, optionIndex } = req.body;

      if (!roomId || !userId || optionIndex === undefined) {
        res.status(400).json({
          error: 'roomId, userId, and optionIndex are required',
        });
        return;
      }

      if (typeof optionIndex !== 'number' || optionIndex < 0) {
        res.status(400).json({ error: 'optionIndex must be a non-negative integer' });
        return;
      }

      const vote = await votingService.submitVote(roomId, userId, optionIndex);
      res.status(201).json({ success: true, data: vote });
    } catch (err) {
      if (err instanceof VotingError) {
        const statusMap: Record<string, number> = {
          WINDOW_CLOSED: 403,
          DUPLICATE_VOTE: 409,
        };
        res.status(statusMap[err.code] || 400).json({
          error: err.message,
          code: err.code,
        });
        return;
      }
      console.error('[VotingController] submitVote error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMajority(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const roundNumber = parseInt(req.query.round as string, 10);

      if (!roomId || isNaN(roundNumber)) {
        res.status(400).json({ error: 'roomId and round query param are required' });
        return;
      }

      const result = await votingService.calculateMajority(roomId, roundNumber);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('[VotingController] getMajority error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async checkSuspicious(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const result = await votingService.detectSuspiciousPattern(userId);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('[VotingController] checkSuspicious error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
