import { Router } from 'express';
import { VotingController } from '../controllers/voting.controller';

const router = Router();
const controller = new VotingController();

/** GET /votes/room/:roomId - Get votes for a room (current round) */
router.get('/votes/room/:roomId', controller.getVotesForRoom.bind(controller));

/** GET /votes/history/:userId - Get vote history for a user */
router.get('/votes/history/:userId', controller.getVoteHistory.bind(controller));

/** POST /votes - Submit a vote (REST fallback; primary path is WebSocket) */
router.post('/votes', controller.submitVote.bind(controller));

/** GET /votes/majority/:roomId - Get majority result for a round */
router.get('/votes/majority/:roomId', controller.getMajority.bind(controller));

/** GET /votes/suspicious/:userId - Check suspicious voting pattern */
router.get('/votes/suspicious/:userId', controller.checkSuspicious.bind(controller));

export default router;
