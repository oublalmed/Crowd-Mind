import { Request, Response } from 'express';
import {
  trackEvent,
  getGameStats,
  getPlayerStats,
  getDailyEventCounts,
} from '../services/analytics.service';

export class AnalyticsController {
  /**
   * POST /events
   * Track a new analytics event.
   */
  async track(req: Request, res: Response): Promise<void> {
    try {
      const { eventType, userId, sessionId, roomId, payload } = req.body;

      if (!eventType) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'eventType is required' },
        });
        return;
      }

      const id = await trackEvent({ eventType, userId, sessionId, roomId, payload });

      res.status(201).json({ success: true, data: { id } });
    } catch (err) {
      console.error('[AnalyticsController] track error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /events/batch
   * Track multiple events in a single request.
   */
  async trackBatch(req: Request, res: Response): Promise<void> {
    try {
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_BODY', message: 'events array is required' },
        });
        return;
      }

      const ids: string[] = [];
      for (const event of events) {
        if (!event.eventType) continue;
        const id = await trackEvent(event);
        ids.push(id);
      }

      res.status(201).json({ success: true, data: { tracked: ids.length } });
    } catch (err) {
      console.error('[AnalyticsController] trackBatch error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /stats/games
   * Get aggregate game statistics.
   */
  async gameStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await getGameStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('[AnalyticsController] gameStats error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /stats/players/:userId
   * Get statistics for a specific player.
   */
  async playerStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const stats = await getPlayerStats(userId);
      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('[AnalyticsController] playerStats error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /stats/daily/:date
   * Get event counts for a specific date (YYYY-MM-DD).
   */
  async dailyStats(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Date must be YYYY-MM-DD' },
        });
        return;
      }

      const counts = await getDailyEventCounts(date);
      res.json({ success: true, data: counts });
    } catch (err) {
      console.error('[AnalyticsController] dailyStats error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
