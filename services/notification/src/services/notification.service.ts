import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bullmq';
import { query, withTransaction } from '../db';
import { redis, createBullMQConnection } from '../redis';
import { pushService } from './push.service';
import { config } from '../config';

interface NotificationPayload {
  type: string;
  channel?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ScheduledNotificationPayload extends NotificationPayload {
  scheduledAt: string; // ISO 8601 timestamp
}

interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: string;
  createdAt: string;
}

interface PaginatedNotifications {
  notifications: NotificationRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

/**
 * NotificationService handles all notification business logic including
 * sending, scheduling, querying, and managing push notifications.
 */
export class NotificationService {
  private scheduledQueue: Queue;

  constructor() {
    const connection = createBullMQConnection();
    this.scheduledQueue = new Queue(config.bullmq.queueName, {
      connection,
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: config.notifications.scheduledJobRetries,
        backoff: config.notifications.scheduledJobBackoff,
      },
    });
  }

  /**
   * Send a push notification to a user immediately.
   * Enforces daily push limit before sending.
   */
  async sendPushNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; notificationId: string; pushResult?: Record<string, unknown> }> {
    // Check daily limit
    const withinLimit = await this.checkDailyLimit(userId);
    if (!withinLimit) {
      const notificationId = await this.storeNotification(userId, payload, 'rate_limited');
      return { success: false, notificationId, pushResult: { error: 'Daily push limit exceeded' } };
    }

    // Store notification record
    const notificationId = await this.storeNotification(userId, payload, 'sending');

    // Get device tokens for the user
    const tokens = await this.getDeviceTokens(userId);

    if (tokens.length === 0) {
      await this.updateNotificationStatus(notificationId, 'no_device');
      return { success: false, notificationId, pushResult: { error: 'No device tokens registered' } };
    }

    // Send to all registered devices
    const results = await Promise.allSettled(
      tokens.map((token) =>
        pushService.send(token.token, token.platform, {
          title: payload.title,
          body: payload.body,
          data: payload.data,
        })
      )
    );

    const anySuccess = results.some(
      (r) => r.status === 'fulfilled' && r.value.success
    );

    // Handle invalid tokens - remove them
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (
        result.status === 'fulfilled' &&
        result.value.error === 'INVALID_TOKEN'
      ) {
        await this.removeDeviceToken(tokens[i].id);
      }
    }

    // Update notification status
    const finalStatus = anySuccess ? 'sent' : 'failed';
    await this.updateNotificationStatus(notificationId, finalStatus);

    // Increment daily counter
    if (anySuccess) {
      await this.incrementDailyCount(userId);
    }

    return { success: anySuccess, notificationId, pushResult: { deliveredToDevices: results.length } };
  }

  /**
   * Schedule a notification for future delivery via BullMQ delayed job.
   */
  async scheduleNotification(
    userId: string,
    payload: ScheduledNotificationPayload
  ): Promise<{ notificationId: string; jobId: string; scheduledAt: string }> {
    const scheduledAt = new Date(payload.scheduledAt);
    const now = new Date();
    const delay = Math.max(0, scheduledAt.getTime() - now.getTime());

    // Store notification record with scheduled status
    const notificationId = await this.storeNotification(userId, payload, 'scheduled', scheduledAt);

    // Add to BullMQ delayed queue
    const job = await this.scheduledQueue.add(
      'send-notification',
      {
        notificationId,
        userId,
        payload: {
          type: payload.type,
          channel: payload.channel || 'push',
          title: payload.title,
          body: payload.body,
          data: payload.data,
        },
      },
      {
        delay,
        jobId: `scheduled-${notificationId}`,
      }
    );

    console.log(
      `[NotificationService] Scheduled notification ${notificationId} for ${scheduledAt.toISOString()} (delay: ${delay}ms)`
    );

    return {
      notificationId,
      jobId: job.id || `scheduled-${notificationId}`,
      scheduledAt: scheduledAt.toISOString(),
    };
  }

  /**
   * Get notifications for a user with pagination.
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = config.notifications.defaultPageSize
  ): Promise<PaginatedNotifications> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), config.notifications.maxPageSize);
    const offset = (safePage - 1) * safeLimit;

    const [countResult, notificationsResult] = await Promise.all([
      query<{ count: string }>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1',
        [userId]
      ),
      query<NotificationRecord>(
        `SELECT id, user_id, type, channel, title, body, data, status,
                scheduled_at, sent_at, read_at, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, safeLimit, offset]
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return {
      notifications: notificationsResult.rows,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const result = await query(
      `UPDATE notifications
       SET status = 'read', read_at = NOW()
       WHERE id = $1 AND status != 'read'
       RETURNING id`,
      [notificationId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Register a device token for push notifications.
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: string
  ): Promise<{ id: string; created: boolean }> {
    // Upsert - update if token already exists, insert if new
    const existing = await query<{ id: string }>(
      'SELECT id FROM device_tokens WHERE user_id = $1 AND token = $2',
      [userId, token]
    );

    if (existing.rows.length > 0) {
      await query(
        'UPDATE device_tokens SET platform = $1, updated_at = NOW() WHERE id = $2',
        [platform, existing.rows[0].id]
      );
      return { id: existing.rows[0].id, created: false };
    }

    const id = uuidv4();
    await query(
      `INSERT INTO device_tokens (id, user_id, token, platform, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [id, userId, token, platform]
    );

    return { id, created: true };
  }

  /**
   * Send a bulk notification to multiple users.
   */
  async sendBulkNotification(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<{ total: number; sent: number; failed: number; rateLimited: number }> {
    let sent = 0;
    let failed = 0;
    let rateLimited = 0;

    // Process in batches to avoid overwhelming the system
    const batchSize = 50;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((userId) => this.sendPushNotification(userId, payload))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            sent++;
          } else if (result.value.pushResult?.error === 'Daily push limit exceeded') {
            rateLimited++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }
      }
    }

    return { total: userIds.length, sent, failed, rateLimited };
  }

  /**
   * Check if a user is within the daily push notification limit.
   * Enforces max 3 push notifications per day.
   */
  async checkDailyLimit(userId: string): Promise<boolean> {
    const key = `daily_push:${userId}:${this.getTodayKey()}`;
    const countStr = await redis.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;

    return count < config.notifications.dailyPushLimit;
  }

  /**
   * Update notification preferences for a user.
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Record<string, boolean>
  ): Promise<void> {
    const key = `prefs:${userId}`;
    await redis.set(key, JSON.stringify(preferences));
  }

  /**
   * Get notification preferences for a user.
   */
  async getNotificationPreferences(
    userId: string
  ): Promise<Record<string, boolean>> {
    const key = `prefs:${userId}`;
    const prefs = await redis.get(key);

    if (!prefs) {
      // Default preferences
      return {
        push_enabled: true,
        game_updates: true,
        vote_results: true,
        leaderboard_changes: true,
        payment_alerts: true,
        marketing: false,
      };
    }

    return JSON.parse(prefs);
  }

  // ========== Private Helpers ==========

  private async storeNotification(
    userId: string,
    payload: NotificationPayload,
    status: string,
    scheduledAt?: Date
  ): Promise<string> {
    const id = uuidv4();
    const channel = payload.channel || 'push';
    const sentAt = status === 'sent' ? new Date() : null;

    await query(
      `INSERT INTO notifications (id, user_id, type, channel, title, body, data, status, scheduled_at, sent_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        id,
        userId,
        payload.type,
        channel,
        payload.title,
        payload.body,
        JSON.stringify(payload.data || {}),
        status,
        scheduledAt || null,
        sentAt,
      ]
    );

    return id;
  }

  private async updateNotificationStatus(notificationId: string, status: string): Promise<void> {
    const sentAt = status === 'sent' ? new Date() : null;

    await query(
      `UPDATE notifications SET status = $1, sent_at = COALESCE($2, sent_at) WHERE id = $3`,
      [status, sentAt, notificationId]
    );
  }

  private async getDeviceTokens(userId: string): Promise<DeviceToken[]> {
    const result = await query<DeviceToken>(
      'SELECT id, user_id as "userId", token, platform, created_at as "createdAt" FROM device_tokens WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  }

  private async removeDeviceToken(tokenId: string): Promise<void> {
    await query('DELETE FROM device_tokens WHERE id = $1', [tokenId]);
    console.log(`[NotificationService] Removed invalid device token: ${tokenId}`);
  }

  private async incrementDailyCount(userId: string): Promise<void> {
    const key = `daily_push:${userId}:${this.getTodayKey()}`;
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, 86400); // Expire after 24 hours
    await multi.exec();
  }

  private getTodayKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  }
}

export const notificationService = new NotificationService();
