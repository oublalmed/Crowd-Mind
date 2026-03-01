import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config';
import { authMiddleware, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// ---- Auth service (public) ----
router.use(
  '/api/v1/auth',
  createProxyMiddleware({
    target: config.services.auth,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/auth': '' },
  })
);

// ---- User service (authenticated) ----
router.use(
  '/api/v1/users',
  authMiddleware,
  createProxyMiddleware({
    target: config.services.user,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/users': '/users' },
  })
);

// ---- Game engine (authenticated) ----
router.use(
  '/api/v1/games',
  authMiddleware,
  createProxyMiddleware({
    target: config.services.gameEngine,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/games': '/games' },
  })
);

// ---- Voting service (authenticated) ----
router.use(
  '/api/v1/voting',
  authMiddleware,
  createProxyMiddleware({
    target: config.services.voting,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/voting': '' },
  })
);

// ---- Leaderboard (optional auth — public read, auth for writes) ----
router.use(
  '/api/v1/leaderboard',
  optionalAuth,
  createProxyMiddleware({
    target: config.services.leaderboard,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/leaderboard': '' },
  })
);

// ---- Payment service (authenticated) ----
router.use(
  '/api/v1/payments',
  authMiddleware,
  createProxyMiddleware({
    target: config.services.payment,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/payments': '' },
  })
);

// ---- Analytics (authenticated) ----
router.use(
  '/api/v1/analytics',
  authMiddleware,
  createProxyMiddleware({
    target: config.services.analytics,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/analytics': '' },
  })
);

// ---- Notifications (authenticated) ----
router.use(
  '/api/v1/notifications',
  authMiddleware,
  createProxyMiddleware({
    target: config.services.notification,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/notifications': '' },
  })
);

export default router;
