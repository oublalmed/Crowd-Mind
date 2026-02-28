import { Request, Response } from 'express';
import { AuthService, AuthError } from '../services/auth.service';

export class AuthController {
  /**
   * POST /auth/register
   * Register a new user with email, username, displayName, and password.
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, displayName, password } = req.body;

      if (!email || !username || !displayName || !password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'email, username, displayName, and password are required',
          },
        });
        return;
      }

      const result = await AuthService.register(email, username, displayName, password);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }

      console.error('[AuthController] register error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  }

  /**
   * POST /auth/login
   * Authenticate a user with email and password.
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'email and password are required',
          },
        });
        return;
      }

      const result = await AuthService.login(email, password);

      res.json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }

      console.error('[AuthController] login error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  }

  /**
   * POST /auth/refresh
   * Refresh an access token using a valid refresh token.
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'refreshToken is required',
          },
        });
        return;
      }

      const tokens = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: { tokens },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }

      console.error('[AuthController] refresh error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  }

  /**
   * POST /auth/logout
   * Logout by invalidating a refresh token. Requires auth middleware.
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = req.userId!;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'refreshToken is required',
          },
        });
        return;
      }

      await AuthService.logout(userId, refreshToken);

      res.json({
        success: true,
        message: 'Successfully logged out',
      });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }

      console.error('[AuthController] logout error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  }

  /**
   * POST /auth/google
   * Authenticate with a Google ID token.
   */
  async googleSignIn(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'idToken is required',
          },
        });
        return;
      }

      const result = await AuthService.googleSignIn(idToken);

      res.json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }

      console.error('[AuthController] googleSignIn error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  }

  /**
   * POST /auth/apple
   * Authenticate with an Apple identity token.
   */
  async appleSignIn(req: Request, res: Response): Promise<void> {
    try {
      const { identityToken } = req.body;

      if (!identityToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'identityToken is required',
          },
        });
        return;
      }

      const result = await AuthService.appleSignIn(identityToken);

      res.json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }

      console.error('[AuthController] appleSignIn error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  }
}
