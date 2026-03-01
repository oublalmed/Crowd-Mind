import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const controller = new AnalyticsController();

// Event tracking
router.post('/events', (req, res) => controller.track(req, res));
router.post('/events/batch', (req, res) => controller.trackBatch(req, res));

// Statistics
router.get('/stats/games', (req, res) => controller.gameStats(req, res));
router.get('/stats/players/:userId', (req, res) => controller.playerStats(req, res));
router.get('/stats/daily/:date', (req, res) => controller.dailyStats(req, res));

export default router;
