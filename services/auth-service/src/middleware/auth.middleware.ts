import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthError } from '../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      email?: string;
    }
  }
}

/**
 * Express middleware that extracts a Bearer token from the Authorization header,
 * verifies it using AuthService.verifyAccessToken(), and attaches userId and email
 * to the request object.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header is required',
      },
    });
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header must use Bearer scheme',
      },
    });
    return;
  }

  const token = parts[1];

  try {
    const payload = AuthService.verifyAccessToken(token);
    req.userId = payload.userId;
    req.email = payload.email;
    next();
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

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or malformed token',
      },
    });
  }
}
