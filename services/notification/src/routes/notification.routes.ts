import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notification.service';

const router = Router();

/**
 * POST /send
 * Send a push notification to a user immediately.
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, type, channel, title, body, data } = req.body;

    if (!userId || !title || !body) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'userId, title, and body are required' },
      });
      return;
    }

    const result = await notificationService.sendPushNotification(userId, {
      type: type || 'general',
      channel,
      title,
      body,
      data,
    });

    res.status(result.success ? 200 : 202).json({ success: true, data: result });
  } catch (err) {
    console.error('[NotificationRoutes] send error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /send/bulk
 * Send a notification to multiple users.
 */
router.post('/send/bulk', async (req: Request, res: Response) => {
  try {
    const { userIds, type, channel, title, body, data } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'userIds array, title, and body are required' },
      });
      return;
    }

    const result = await notificationService.sendBulkNotification(userIds, {
      type: type || 'general',
      channel,
      title,
      body,
      data,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[NotificationRoutes] send/bulk error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /schedule
 * Schedule a notification for future delivery.
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { userId, type, channel, title, body, data, scheduledAt } = req.body;

    if (!userId || !title || !body || !scheduledAt) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'userId, title, body, and scheduledAt are required' },
      });
      return;
    }

    const result = await notificationService.scheduleNotification(userId, {
      type: type || 'general',
      channel,
      title,
      body,
      data,
      scheduledAt,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[NotificationRoutes] schedule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /notifications/:userId
 * Get paginated notifications for a user.
 */
router.get('/notifications/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await notificationService.getUserNotifications(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[NotificationRoutes] get notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /notifications/:notificationId/read
 * Mark a notification as read.
 */
router.patch('/notifications/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const updated = await notificationService.markAsRead(notificationId);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found or already read' },
      });
      return;
    }

    res.json({ success: true, data: { notificationId, status: 'read' } });
  } catch (err) {
    console.error('[NotificationRoutes] markAsRead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /devices
 * Register a device token for push notifications.
 */
router.post('/devices', async (req: Request, res: Response) => {
  try {
    const { userId, token, platform } = req.body;

    if (!userId || !token || !platform) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'userId, token, and platform are required' },
      });
      return;
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PLATFORM', message: 'platform must be ios, android, or web' },
      });
      return;
    }

    const result = await notificationService.registerDeviceToken(userId, token, platform);
    res.status(result.created ? 201 : 200).json({ success: true, data: result });
  } catch (err) {
    console.error('[NotificationRoutes] register device error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /preferences/:userId
 * Get notification preferences.
 */
router.get('/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const prefs = await notificationService.getNotificationPreferences(userId);
    res.json({ success: true, data: prefs });
  } catch (err) {
    console.error('[NotificationRoutes] get preferences error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /preferences/:userId
 * Update notification preferences.
 */
router.put('/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;

    await notificationService.updateNotificationPreferences(userId, preferences);
    res.json({ success: true, data: { userId, preferences } });
  } catch (err) {
    console.error('[NotificationRoutes] update preferences error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as notificationRoutes };
