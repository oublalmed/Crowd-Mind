import { Request, Response } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService, AuthError } from '../services/auth.service';

// Mock the AuthService
jest.mock('../services/auth.service');

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (body: Record<string, unknown> = {}, extras: Record<string, unknown> = {}): Request =>
  ({ body, ...extras } as unknown as Request);

describe('AuthController', () => {
  let controller: AuthController;
  let res: Response;

  beforeEach(() => {
    controller = new AuthController();
    res = mockResponse();
    jest.clearAllMocks();
  });

  // =========================================================================
  // register
  // =========================================================================
  describe('register', () => {
    const validBody = {
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      password: 'SecurePass1',
    };

    it('returns 201 on successful registration', async () => {
      const mockResult = {
        user: { id: '123', email: validBody.email },
        tokens: { accessToken: 'at', refreshToken: 'rt' },
      };
      (AuthService.register as jest.Mock).mockResolvedValue(mockResult);

      await controller.register(mockRequest(validBody), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockResult.user, tokens: mockResult.tokens },
      });
    });

    it('returns 400 when email is missing', async () => {
      await controller.register(
        mockRequest({ username: 'test', displayName: 'Test', password: 'pass' }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('returns 400 when password is missing', async () => {
      await controller.register(
        mockRequest({ email: 'a@b.com', username: 'test', displayName: 'Test' }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns AuthError status code on auth errors', async () => {
      (AuthService.register as jest.Mock).mockRejectedValue(
        new AuthError('Email already registered', 'EMAIL_EXISTS', 409)
      );

      await controller.register(mockRequest(validBody), res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'EMAIL_EXISTS' }),
        })
      );
    });

    it('returns 500 on unexpected errors', async () => {
      (AuthService.register as jest.Mock).mockRejectedValue(new Error('DB down'));

      await controller.register(mockRequest(validBody), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // login
  // =========================================================================
  describe('login', () => {
    it('returns 200 on successful login', async () => {
      const mockResult = {
        user: { id: '123', email: 'test@example.com' },
        tokens: { accessToken: 'at', refreshToken: 'rt' },
      };
      (AuthService.login as jest.Mock).mockResolvedValue(mockResult);

      await controller.login(
        mockRequest({ email: 'test@example.com', password: 'SecurePass1' }),
        res
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockResult.user, tokens: mockResult.tokens },
      });
    });

    it('returns 400 when email is missing', async () => {
      await controller.login(mockRequest({ password: 'pass' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 401 on invalid credentials', async () => {
      (AuthService.login as jest.Mock).mockRejectedValue(
        new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
      );

      await controller.login(
        mockRequest({ email: 'test@example.com', password: 'wrong' }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // =========================================================================
  // refresh
  // =========================================================================
  describe('refresh', () => {
    it('returns new tokens on valid refresh', async () => {
      const mockTokens = { accessToken: 'new-at', refreshToken: 'new-rt' };
      (AuthService.refreshToken as jest.Mock).mockResolvedValue(mockTokens);

      await controller.refresh(mockRequest({ refreshToken: 'valid-rt' }), res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { tokens: mockTokens },
      });
    });

    it('returns 400 when refreshToken is missing', async () => {
      await controller.refresh(mockRequest({}), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 401 on invalid refresh token', async () => {
      (AuthService.refreshToken as jest.Mock).mockRejectedValue(
        new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401)
      );

      await controller.refresh(mockRequest({ refreshToken: 'expired' }), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // =========================================================================
  // logout
  // =========================================================================
  describe('logout', () => {
    it('returns success on valid logout', async () => {
      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

      await controller.logout(
        mockRequest({ refreshToken: 'rt' }, { userId: 'user-1' }),
        res
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('returns 400 when refreshToken is missing', async () => {
      await controller.logout(mockRequest({}, { userId: 'user-1' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
