import { UUID } from './common';

export type NotificationType = 'transactional' | 'engagement' | 'marketing';
export type NotificationChannel = 'push' | 'in_app' | 'email';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface Notification {
  id: UUID;
  userId: UUID;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: NotificationStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  badge?: number;
  sound?: string;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  variables: string[];
}

export const MAX_DAILY_PUSH_NOTIFICATIONS = 3;
