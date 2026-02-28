import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new UserController();

// All user routes require authentication
router.use(authMiddleware);

/** GET /users/search - Search users by username or display name */
router.get('/search', controller.searchUsers.bind(controller));

/** GET /users/friends - Get authenticated user's friends */
router.get('/friends', controller.getFriends.bind(controller));

/** POST /users/friends/request - Send a friend request */
router.post('/friends/request', controller.sendFriendRequest.bind(controller));

/** GET /users/profile/:userId - Get a user's profile */
router.get('/profile/:userId', controller.getProfile.bind(controller));

/** PATCH /users/profile - Update authenticated user's profile */
router.patch('/profile', controller.updateProfile.bind(controller));

/** GET /users/stats/:userId - Get a user's game stats */
router.get('/stats/:userId', controller.getStats.bind(controller));

export const userRouter = router;
export default router;
