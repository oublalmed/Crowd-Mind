import { Router } from 'express';
import { LeaderboardController } from '../controllers/leaderboard.controller';

const router = Router();
const controller = new LeaderboardController();

/** GET /leaderboard/seasons - Get all seasons */
router.get('/leaderboard/seasons', controller.getSeasons.bind(controller));

/** GET /leaderboard/seasons/:seasonId - Get specific season */
router.get('/leaderboard/seasons/:seasonId', controller.getSeason.bind(controller));

/** GET /leaderboard/:type - Get paginated leaderboard (?page=1&limit=50) */
router.get('/leaderboard/:type', controller.getLeaderboard.bind(controller));

/** GET /leaderboard/:type/rank/:userId - Get user rank on a leaderboard */
router.get('/leaderboard/:type/rank/:userId', controller.getUserRank.bind(controller));

/** POST /leaderboard/score - Update a user's score (internal) */
router.post('/leaderboard/score', controller.updateScore.bind(controller));

export default router;
