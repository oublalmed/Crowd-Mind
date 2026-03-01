import { Router } from 'express';
import { GameController } from '../controllers/game.controller';

const router = Router();
const controller = new GameController();

/** POST /games/rooms - Create a new game room */
router.post('/rooms', controller.createRoom.bind(controller));

/** GET /games/rooms - List available rooms */
router.get('/rooms', controller.getRooms.bind(controller));

/** POST /games/rooms/:roomId/join - Join a room */
router.post('/rooms/:roomId/join', controller.joinRoom.bind(controller));

/** GET /games/rooms/:roomId - Get room state */
router.get('/rooms/:roomId', controller.getRoom.bind(controller));

export default router;
