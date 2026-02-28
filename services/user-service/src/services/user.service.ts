import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  level: number;
  xp: number;
  skill_rating: number;
  is_premium: boolean;
  created_at: string;
}

export interface UserStats {
  games_played: number;
  games_won: number;
  win_rate: number;
  current_streak: number;
  best_streak: number;
  total_score: number;
  average_score: number;
}

export interface UpdateUserData {
  displayName?: string;
  bio?: string;
  preferences?: Record<string, unknown>;
}

export interface FriendRecord {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  is_premium: boolean;
  friendship_created_at: string;
}

export interface FriendRequestRecord {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
}

export class UserService {
  /**
   * Retrieve a user profile by ID from PostgreSQL.
   */
  static async getUserById(id: string): Promise<UserProfile | null> {
    const query = `
      SELECT
        id, username, display_name, avatar_url, bio,
        level, xp, skill_rating, is_premium, created_at
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as UserProfile;
  }

  /**
   * Update user profile fields: display_name, bio, preferences.
   */
  static async updateUser(id: string, data: UpdateUserData): Promise<UserProfile | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.displayName !== undefined) {
      setClauses.push(`display_name = $${paramIndex}`);
      values.push(data.displayName);
      paramIndex++;
    }

    if (data.bio !== undefined) {
      setClauses.push(`bio = $${paramIndex}`);
      values.push(data.bio);
      paramIndex++;
    }

    if (data.preferences !== undefined) {
      setClauses.push(`preferences = $${paramIndex}`);
      values.push(JSON.stringify(data.preferences));
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return UserService.getUserById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, display_name, avatar_url, bio,
                level, xp, skill_rating, is_premium, created_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as UserProfile;
  }

  /**
   * Return aggregate game stats for a user.
   */
  static async getUserStats(id: string): Promise<UserStats | null> {
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);

    if (userCheck.rows.length === 0) {
      return null;
    }

    const query = `
      SELECT
        COALESCE(games_played, 0) AS games_played,
        COALESCE(games_won, 0) AS games_won,
        CASE
          WHEN COALESCE(games_played, 0) = 0 THEN 0
          ELSE ROUND((COALESCE(games_won, 0)::numeric / games_played) * 100, 2)
        END AS win_rate,
        COALESCE(current_streak, 0) AS current_streak,
        COALESCE(best_streak, 0) AS best_streak,
        COALESCE(total_score, 0) AS total_score,
        CASE
          WHEN COALESCE(games_played, 0) = 0 THEN 0
          ELSE ROUND(COALESCE(total_score, 0)::numeric / games_played, 2)
        END AS average_score
      FROM user_stats
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return {
        games_played: 0,
        games_won: 0,
        win_rate: 0,
        current_streak: 0,
        best_streak: 0,
        total_score: 0,
        average_score: 0,
      };
    }

    return result.rows[0] as UserStats;
  }

  /**
   * Get a paginated list of accepted friends for a user.
   */
  static async getFriends(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ friends: FriendRecord[]; total: number }> {
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM friend_requests fr
      WHERE (fr.from_user_id = $1 OR fr.to_user_id = $1)
        AND fr.status = 'accepted'
    `;

    const countResult = await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total, 10);

    const query = `
      SELECT
        fr.id,
        u.id AS user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.level,
        u.is_premium,
        fr.updated_at AS friendship_created_at
      FROM friend_requests fr
      JOIN users u ON (
        CASE
          WHEN fr.from_user_id = $1 THEN fr.to_user_id
          ELSE fr.from_user_id
        END = u.id
      )
      WHERE (fr.from_user_id = $1 OR fr.to_user_id = $1)
        AND fr.status = 'accepted'
      ORDER BY u.display_name ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);

    return {
      friends: result.rows as FriendRecord[],
      total,
    };
  }

  /**
   * Create a new friend request from one user to another.
   */
  static async sendFriendRequest(fromId: string, toId: string): Promise<FriendRequestRecord> {
    if (fromId === toId) {
      throw new Error('Cannot send a friend request to yourself');
    }

    // Check if a request already exists between these users in either direction
    const existingQuery = `
      SELECT id, status
      FROM friend_requests
      WHERE (from_user_id = $1 AND to_user_id = $2)
         OR (from_user_id = $2 AND to_user_id = $1)
    `;

    const existing = await pool.query(existingQuery, [fromId, toId]);

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.status === 'accepted') {
        throw new Error('You are already friends with this user');
      }
      if (row.status === 'pending') {
        throw new Error('A friend request already exists between these users');
      }
    }

    // Verify the target user exists
    const targetCheck = await pool.query('SELECT id FROM users WHERE id = $1', [toId]);
    if (targetCheck.rows.length === 0) {
      throw new Error('Target user not found');
    }

    const id = uuidv4();
    const insertQuery = `
      INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'pending', NOW(), NOW())
      RETURNING id, from_user_id, to_user_id, status, created_at, updated_at
    `;

    const result = await pool.query(insertQuery, [id, fromId, toId]);
    return result.rows[0] as FriendRequestRecord;
  }

  /**
   * Accept or reject a friend request.
   */
  static async respondToFriendRequest(
    requestId: string,
    userId: string,
    accept: boolean
  ): Promise<FriendRequestRecord | null> {
    // Only the recipient of the request can respond
    const fetchQuery = `
      SELECT id, from_user_id, to_user_id, status
      FROM friend_requests
      WHERE id = $1
    `;

    const fetchResult = await pool.query(fetchQuery, [requestId]);

    if (fetchResult.rows.length === 0) {
      return null;
    }

    const request = fetchResult.rows[0];

    if (request.to_user_id !== userId) {
      throw new Error('Only the recipient can respond to a friend request');
    }

    if (request.status !== 'pending') {
      throw new Error('This friend request has already been responded to');
    }

    const newStatus = accept ? 'accepted' : 'rejected';

    const updateQuery = `
      UPDATE friend_requests
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, from_user_id, to_user_id, status, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, [newStatus, requestId]);
    return result.rows[0] as FriendRequestRecord;
  }

  /**
   * Upload a user avatar. This is a stub that stores the file path locally.
   * In production, this would upload to S3 and return the CDN URL.
   */
  static async uploadAvatar(
    userId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number }
  ): Promise<{ avatarUrl: string }> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP');
    }

    // Validate file size (5 MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size exceeds the 5MB limit');
    }

    // Stub: In production this would upload to S3
    // const s3Key = `avatars/${userId}/${uuidv4()}.${file.mimetype.split('/')[1]}`;
    // await s3Client.putObject({ Bucket: config.aws.s3.bucket, Key: s3Key, Body: file.buffer });
    // const avatarUrl = `https://${config.aws.s3.bucket}.s3.amazonaws.com/${s3Key}`;

    const avatarUrl = `https://cdn.crowdmind.app/avatars/${userId}/${uuidv4()}.${file.mimetype.split('/')[1]}`;

    const updateQuery = `
      UPDATE users
      SET avatar_url = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING avatar_url
    `;

    const result = await pool.query(updateQuery, [avatarUrl, userId]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return { avatarUrl: result.rows[0].avatar_url };
  }

  /**
   * Search users by username or display name using ILIKE for case-insensitive matching.
   */
  static async searchUsers(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ users: SearchResult[]; total: number }> {
    const offset = (page - 1) * limit;
    const searchPattern = `%${query}%`;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM users
      WHERE username ILIKE $1 OR display_name ILIKE $1
    `;

    const countResult = await pool.query(countQuery, [searchPattern]);
    const total = parseInt(countResult.rows[0].total, 10);

    const searchQuery = `
      SELECT id, username, display_name, avatar_url, level
      FROM users
      WHERE username ILIKE $1 OR display_name ILIKE $1
      ORDER BY
        CASE
          WHEN username ILIKE $2 THEN 0
          WHEN display_name ILIKE $2 THEN 1
          ELSE 2
        END,
        username ASC
      LIMIT $3 OFFSET $4
    `;

    // Exact-prefix match gets priority in ordering
    const prefixPattern = `${query}%`;
    const result = await pool.query(searchQuery, [searchPattern, prefixPattern, limit, offset]);

    return {
      users: result.rows as SearchResult[],
      total,
    };
  }
}
