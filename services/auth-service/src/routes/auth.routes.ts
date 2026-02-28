import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

/** POST /auth/register - Register a new user */
router.post('/register', controller.register.bind(controller));

/** POST /auth/login - Login with email and password */
router.post('/login', controller.login.bind(controller));

/** POST /auth/refresh - Refresh access token */
router.post('/refresh', controller.refresh.bind(controller));

/** POST /auth/logout - Logout (requires authentication) */
router.post('/logout', authMiddleware, controller.logout.bind(controller));

/** POST /auth/google - Sign in with Google */
router.post('/google', controller.googleSignIn.bind(controller));

/** POST /auth/apple - Sign in with Apple */
router.post('/apple', controller.appleSignIn.bind(controller));

export default router;
