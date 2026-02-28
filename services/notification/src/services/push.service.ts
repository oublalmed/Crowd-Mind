import * as admin from 'firebase-admin';
import { config } from '../config';

/**
 * PushService handles delivery of push notifications via FCM and APNS.
 */
export class PushService {
  private fcmInitialized = false;

  constructor() {
    this.initializeFCM();
  }

  /**
   * Initialize Firebase Admin SDK for FCM.
   */
  private initializeFCM(): void {
    if (this.fcmInitialized) return;

    try {
      if (config.fcm.projectId && config.fcm.clientEmail && config.fcm.privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.fcm.projectId,
            clientEmail: config.fcm.clientEmail,
            privateKey: config.fcm.privateKey,
          }),
          databaseURL: config.fcm.databaseURL || undefined,
        });
        this.fcmInitialized = true;
        console.log('[PushService] Firebase Admin SDK initialized');
      } else {
        console.warn('[PushService] FCM credentials not configured. FCM push disabled.');
      }
    } catch (error) {
      console.error('[PushService] Failed to initialize Firebase Admin SDK:', error);
    }
  }

  /**
   * Send a push notification via Firebase Cloud Messaging.
   */
  async sendFCM(
    deviceToken: string,
    payload: { title: string; body: string; data?: Record<string, string> }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.fcmInitialized) {
      console.warn('[PushService] FCM not initialized. Skipping push notification.');
      return { success: false, error: 'FCM not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'crowd-mind-default',
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      const messageId = await admin.messaging().send(message);
      console.log(`[PushService] FCM message sent: ${messageId}`);

      return { success: true, messageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown FCM error';
      console.error(`[PushService] FCM send failed for token ${deviceToken.slice(0, 10)}...:`, errorMessage);

      // Handle invalid registration token
      if (
        error instanceof Error &&
        (error.message.includes('registration-token-not-registered') ||
          error.message.includes('invalid-registration-token'))
      ) {
        return { success: false, error: 'INVALID_TOKEN' };
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send a push notification via Apple Push Notification Service.
   * Stub implementation - integrate with a proper APNS library in production.
   */
  async sendAPNS(
    deviceToken: string,
    payload: { title: string; body: string; data?: Record<string, string> }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // APNS stub - in production, integrate with a library like `apn` or `node-apn`
    // or use Firebase Admin SDK which can handle APNS delivery as well.

    if (!config.apns.keyId || !config.apns.teamId) {
      console.warn('[PushService] APNS credentials not configured. Skipping APNS notification.');
      return { success: false, error: 'APNS not configured' };
    }

    try {
      console.log(`[PushService] APNS send stub called for token: ${deviceToken.slice(0, 10)}...`);
      console.log(`[PushService] APNS payload: title="${payload.title}", body="${payload.body}"`);

      // TODO: Implement actual APNS sending logic
      // const apnProvider = new apn.Provider({
      //   token: {
      //     key: config.apns.keyPath,
      //     keyId: config.apns.keyId,
      //     teamId: config.apns.teamId,
      //   },
      //   production: config.apns.production,
      // });
      //
      // const notification = new apn.Notification();
      // notification.alert = { title: payload.title, body: payload.body };
      // notification.topic = config.apns.bundleId;
      // notification.payload = payload.data || {};
      //
      // const result = await apnProvider.send(notification, deviceToken);
      // apnProvider.shutdown();

      return {
        success: true,
        messageId: `apns-stub-${Date.now()}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown APNS error';
      console.error(`[PushService] APNS send failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send push notification to the appropriate platform.
   */
  async send(
    deviceToken: string,
    platform: string,
    payload: { title: string; body: string; data?: Record<string, string> }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    switch (platform.toLowerCase()) {
      case 'android':
      case 'fcm':
        return this.sendFCM(deviceToken, payload);
      case 'ios':
      case 'apns':
        return this.sendAPNS(deviceToken, payload);
      default:
        // Default to FCM as it supports both platforms
        return this.sendFCM(deviceToken, payload);
    }
  }
}

export const pushService = new PushService();
