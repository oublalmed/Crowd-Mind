import { UUID } from './common';

export interface AnalyticsEvent {
  event: string;
  userId: UUID;
  timestamp: string;
  properties: Record<string, unknown>;
  sessionId?: string;
  deviceId?: string;
  platform?: 'ios' | 'android' | 'web';
  appVersion?: string;
}

export type AnalyticsEventName =
  | 'app_open'
  | 'app_close'
  | 'user_registered'
  | 'user_logged_in'
  | 'tutorial_started'
  | 'tutorial_completed'
  | 'game_started'
  | 'game_completed'
  | 'vote_submitted'
  | 'matchmaking_started'
  | 'matchmaking_completed'
  | 'matchmaking_cancelled'
  | 'subscription_viewed'
  | 'subscription_started'
  | 'subscription_converted'
  | 'subscription_cancelled'
  | 'tournament_joined'
  | 'tournament_completed'
  | 'ad_impression'
  | 'ad_clicked'
  | 'rewarded_ad_completed'
  | 'purchase_completed'
  | 'friend_added'
  | 'notification_received'
  | 'notification_opened'
  | 'leaderboard_viewed'
  | 'profile_updated'
  | 'settings_changed';

export interface RetentionMetrics {
  d1: number;
  d7: number;
  d30: number;
  cohortDate: string;
  cohortSize: number;
}

export interface RevenueMetrics {
  arpdau: number;
  totalRevenue: number;
  adRevenue: number;
  subscriptionRevenue: number;
  tournamentRevenue: number;
  dau: number;
  date: string;
}
