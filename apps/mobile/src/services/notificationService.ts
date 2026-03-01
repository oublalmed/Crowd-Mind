import api from './api';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  game_updates: boolean;
  vote_results: boolean;
  leaderboard_changes: boolean;
  payment_alerts: boolean;
  marketing: boolean;
}

const notificationService = {
  getNotifications: async (page = 1, limit = 20): Promise<NotificationPage> => {
    const response = await api.get<NotificationPage>('/v1/notifications', {
      params: { page, limit },
    });
    return response.data;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await api.patch(`/v1/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/v1/notifications/read-all');
  },

  registerDevice: async (token: string, platform: 'ios' | 'android'): Promise<void> => {
    await api.post('/v1/notifications/devices', { token, platform });
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get<NotificationPreferences>('/v1/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (prefs: Partial<NotificationPreferences>): Promise<void> => {
    await api.put('/v1/notifications/preferences', prefs);
  },
};

export default notificationService;
