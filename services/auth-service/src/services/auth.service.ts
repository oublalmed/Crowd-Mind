import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { query } from '../db';
import redisClient from '../redis';
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from '@crowd-mind/shared';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AccessTokenPayload extends JwtPayload {
  userId: string;
  email: string;
  type: 'access';
}

interface UserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  password_hash: string | null;
  provider: string;
  provider_id: string | null;
  skill_rating: number;
  level: number;
  xp: number;
  is_premium: boolean;
  premium_expires_at: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export class AuthService {
  /**
   * Register a new user with email and password.
   */
  static async register(
    email: string,
    username: string,
    displayName: string,
    password: string
  ): Promise<{ user: Omit<UserRow, 'password_hash'>; tokens: TokenPair }> {
    // Validate email
    if (!validateEmail(email)) {
      throw new AuthError('Invalid email address', 'INVALID_EMAIL', 400);
    }

    // Validate username
    const usernameResult = validateUsername(username);
    if (!usernameResult.valid) {
      throw new AuthError(
        usernameResult.errors.join('; '),
        'INVALID_USERNAME',
        400
      );
    }

    // Validate password
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      throw new AuthError(
        passwordResult.errors.join('; '),
        'INVALID_PASSWORD',
        400
      );
    }

    // Validate display name
    if (!displayName || displayName.trim().length === 0 || displayName.length > 50) {
      throw new AuthError(
        'Display name must be between 1 and 50 characters',
        'INVALID_DISPLAY_NAME',
        400
      );
    }

    // Check for existing email
    const existingEmail = await query<UserRow>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existingEmail.rows.length > 0) {
      throw new AuthError('Email already registered', 'EMAIL_EXISTS', 409);
    }

    // Check for existing username
    const existingUsername = await query<UserRow>(
      'SELECT id FROM users WHERE username = $1',
      [username.toLowerCase()]
    );
    if (existingUsername.rows.length > 0) {
      throw new AuthError('Username already taken', 'USERNAME_EXISTS', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.bcrypt.costFactor);

    // Insert user
    const result = await query<UserRow>(
      `INSERT INTO users (email, username, display_name, password_hash, provider)
       VALUES ($1, $2, $3, $4, 'email')
       RETURNING id, email, username, display_name, provider, provider_id,
                 skill_rating, level, xp, is_premium, premium_expires_at,
                 avatar_url, bio, preferences, created_at, updated_at`,
      [email.toLowerCase(), username.toLowerCase(), displayName.trim(), passwordHash]
    );

    const user = result.rows[0];

    // Generate tokens
    const tokens = await AuthService.generateTokens(user.id, user.email);

    return { user, tokens };
  }

  /**
   * Authenticate a user with email and password.
   */
  static async login(
    email: string,
    password: string
  ): Promise<{ user: Omit<UserRow, 'password_hash'>; tokens: TokenPair }> {
    if (!email || !password) {
      throw new AuthError('Email and password are required', 'MISSING_CREDENTIALS', 400);
    }

    // Find user by email
    const result = await query<UserRow>(
      `SELECT id, email, username, display_name, password_hash, provider, provider_id,
              skill_rating, level, xp, is_premium, premium_expires_at,
              avatar_url, bio, preferences, created_at, updated_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    const user = result.rows[0];

    // Verify the user registered with email provider
    if (user.provider !== 'email' || !user.password_hash) {
      throw new AuthError(
        `This account uses ${user.provider} sign-in`,
        'WRONG_PROVIDER',
        401
      );
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    // Generate tokens
    const tokens = await AuthService.generateTokens(user.id, user.email);

    // Strip password_hash from the response
    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser as Omit<UserRow, 'password_hash'>, tokens };
  }

  /**
   * Refresh an access token using a valid refresh token.
   * Implements token rotation: the old refresh token is invalidated and a new pair is issued.
   */
  static async refreshToken(token: string): Promise<TokenPair> {
    if (!token) {
      throw new AuthError('Refresh token is required', 'MISSING_TOKEN', 400);
    }

    // Look up the refresh token in Redis
    const userId = await redisClient.get(`refresh:${token}`);
    if (!userId) {
      throw new AuthError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN', 401);
    }

    // Fetch user email for the new access token
    const result = await query<UserRow>(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 401);
    }

    // Rotate: delete old refresh token
    await redisClient.del(`refresh:${token}`);

    // Remove from user's token set
    await redisClient.srem(`user_tokens:${userId}`, token);

    // Generate new token pair
    const tokens = await AuthService.generateTokens(userId, result.rows[0].email);

    return tokens;
  }

  /**
   * Logout by invalidating a refresh token.
   */
  static async logout(userId: string, refreshToken: string): Promise<void> {
    if (!refreshToken) {
      throw new AuthError('Refresh token is required', 'MISSING_TOKEN', 400);
    }

    // Delete the specific refresh token
    await redisClient.del(`refresh:${refreshToken}`);

    // Remove from user's token set
    await redisClient.srem(`user_tokens:${userId}`, refreshToken);
  }

  /**
   * Authenticate with a Google ID token.
   * Stub: In production, verify the token with Google's API.
   */
  static async googleSignIn(
    idToken: string
  ): Promise<{ user: Omit<UserRow, 'password_hash'>; tokens: TokenPair }> {
    if (!idToken) {
      throw new AuthError('Google ID token is required', 'MISSING_TOKEN', 400);
    }

    // TODO: Verify the Google ID token using googleapis or google-auth-library
    // const ticket = await googleClient.verifyIdToken({ idToken, audience: config.oauth.google.clientId });
    // const payload = ticket.getPayload();

    // Stub: simulate decoded token payload
    const decodedPayload = {
      sub: `google_${idToken.substring(0, 16)}`,
      email: '',
      name: 'Google User',
    };

    if (!decodedPayload.email) {
      throw new AuthError(
        'Google sign-in is not fully configured. Provide a valid ID token.',
        'OAUTH_NOT_CONFIGURED',
        501
      );
    }

    // Check if user already exists with this provider
    let result = await query<UserRow>(
      `SELECT id, email, username, display_name, provider, provider_id,
              skill_rating, level, xp, is_premium, premium_expires_at,
              avatar_url, bio, preferences, created_at, updated_at
       FROM users WHERE provider = 'google' AND provider_id = $1`,
      [decodedPayload.sub]
    );

    let user: Omit<UserRow, 'password_hash'>;

    if (result.rows.length > 0) {
      user = result.rows[0];
    } else {
      // Check if email is already registered with another provider
      const emailCheck = await query<UserRow>(
        'SELECT id FROM users WHERE email = $1',
        [decodedPayload.email]
      );
      if (emailCheck.rows.length > 0) {
        throw new AuthError(
          'Email already registered with a different provider',
          'EMAIL_EXISTS_DIFFERENT_PROVIDER',
          409
        );
      }

      // Create new user
      const username = `user_${uuidv4().substring(0, 8)}`;
      const insertResult = await query<UserRow>(
        `INSERT INTO users (email, username, display_name, provider, provider_id)
         VALUES ($1, $2, $3, 'google', $4)
         RETURNING id, email, username, display_name, provider, provider_id,
                   skill_rating, level, xp, is_premium, premium_expires_at,
                   avatar_url, bio, preferences, created_at, updated_at`,
        [decodedPayload.email, username, decodedPayload.name, decodedPayload.sub]
      );
      user = insertResult.rows[0];
    }

    const tokens = await AuthService.generateTokens(user.id, user.email);

    return { user, tokens };
  }

  /**
   * Authenticate with an Apple identity token.
   * Stub: In production, verify the token with Apple's API.
   */
  static async appleSignIn(
    identityToken: string
  ): Promise<{ user: Omit<UserRow, 'password_hash'>; tokens: TokenPair }> {
    if (!identityToken) {
      throw new AuthError('Apple identity token is required', 'MISSING_TOKEN', 400);
    }

    // TODO: Verify Apple identity token using apple-signin-auth or jose
    // const decoded = await appleSignin.verifyIdToken(identityToken, { audience: config.oauth.apple.clientId });

    // Stub: simulate decoded token payload
    const decodedPayload = {
      sub: `apple_${identityToken.substring(0, 16)}`,
      email: '',
      name: 'Apple User',
    };

    if (!decodedPayload.email) {
      throw new AuthError(
        'Apple sign-in is not fully configured. Provide a valid identity token.',
        'OAUTH_NOT_CONFIGURED',
        501
      );
    }

    // Check if user already exists with this provider
    let result = await query<UserRow>(
      `SELECT id, email, username, display_name, provider, provider_id,
              skill_rating, level, xp, is_premium, premium_expires_at,
              avatar_url, bio, preferences, created_at, updated_at
       FROM users WHERE provider = 'apple' AND provider_id = $1`,
      [decodedPayload.sub]
    );

    let user: Omit<UserRow, 'password_hash'>;

    if (result.rows.length > 0) {
      user = result.rows[0];
    } else {
      // Check if email is already registered with another provider
      const emailCheck = await query<UserRow>(
        'SELECT id FROM users WHERE email = $1',
        [decodedPayload.email]
      );
      if (emailCheck.rows.length > 0) {
        throw new AuthError(
          'Email already registered with a different provider',
          'EMAIL_EXISTS_DIFFERENT_PROVIDER',
          409
        );
      }

      // Create new user
      const username = `user_${uuidv4().substring(0, 8)}`;
      const insertResult = await query<UserRow>(
        `INSERT INTO users (email, username, display_name, provider, provider_id)
         VALUES ($1, $2, $3, 'apple', $4)
         RETURNING id, email, username, display_name, provider, provider_id,
                   skill_rating, level, xp, is_premium, premium_expires_at,
                   avatar_url, bio, preferences, created_at, updated_at`,
        [decodedPayload.email, username, decodedPayload.name, decodedPayload.sub]
      );
      user = insertResult.rows[0];
    }

    const tokens = await AuthService.generateTokens(user.id, user.email);

    return { user, tokens };
  }

  /**
   * Generate a JWT access token and a refresh token stored in Redis.
   */
  static async generateTokens(userId: string, email: string): Promise<TokenPair> {
    // Create access token
    const accessToken = jwt.sign(
      { userId, email, type: 'access' } as AccessTokenPayload,
      config.jwt.secret,
      { expiresIn: config.jwt.accessTokenTtlSeconds }
    );

    // Create refresh token (opaque)
    const refreshToken = uuidv4();

    // Store refresh token in Redis with TTL
    await redisClient.set(
      `refresh:${refreshToken}`,
      userId,
      'EX',
      config.jwt.refreshTokenTtlSeconds
    );

    // Track refresh token in user's token set (for logout-all capability)
    await redisClient.sadd(`user_tokens:${userId}`, refreshToken);
    await redisClient.expire(
      `user_tokens:${userId}`,
      config.jwt.refreshTokenTtlSeconds
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify a JWT access token and return its payload.
   */
  static verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as AccessTokenPayload;

      if (payload.type !== 'access') {
        throw new AuthError('Invalid token type', 'INVALID_TOKEN_TYPE', 401);
      }

      return payload;
    } catch (err) {
      if (err instanceof AuthError) {
        throw err;
      }
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthError('Access token has expired', 'TOKEN_EXPIRED', 401);
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid access token', 'INVALID_TOKEN', 401);
      }
      throw new AuthError('Token verification failed', 'TOKEN_ERROR', 401);
    }
  }
}

/**
 * Custom error class for authentication errors with HTTP status codes.
 */
export class AuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}
