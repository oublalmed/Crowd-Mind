import cron from 'node-cron';
import { LeaderboardService } from '../services/leaderboard.service';

const leaderboardService = new LeaderboardService();

/**
 * Schedule cron jobs for leaderboard resets.
 *
 * Weekly reset: every Monday at 00:00 UTC
 * Cron expression: second minute hour day-of-month month day-of-week
 *   "0 0 * * 1" = minute 0, hour 0, any day-of-month, any month, Monday
 */
export function scheduleLeaderboardJobs(): void {
  // Weekly leaderboard reset - every Monday at 00:00 UTC
  cron.schedule(
    '0 0 * * 1',
    async () => {
      console.log('[Cron] Starting weekly leaderboard reset...');
      try {
        await leaderboardService.resetWeeklyLeaderboard();
        console.log('[Cron] Weekly leaderboard reset completed');
      } catch (err) {
        console.error('[Cron] Weekly leaderboard reset failed:', err);
      }
    },
    {
      timezone: 'UTC',
    },
  );

  console.log('[Cron] Leaderboard cron jobs scheduled');
}
