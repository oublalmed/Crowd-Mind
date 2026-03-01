import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

type NotificationType = 'game_invite' | 'friend_request' | 'achievement' | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timeAgo: string;
  isRead: boolean;
  group: 'today' | 'earlier';
}

const NOTIFICATION_ICONS: Record<NotificationType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  game_invite: { name: 'game-controller', color: colors.primary },
  friend_request: { name: 'person-add', color: colors.secondary },
  achievement: { name: 'trophy', color: colors.gold },
  system: { name: 'information-circle', color: colors.info },
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'game_invite',
    title: 'Game Invitation',
    message: 'NeonPlayer42 invited you to join "Friday Night Showdown"',
    timeAgo: '5 min ago',
    isRead: false,
    group: 'today',
  },
  {
    id: '2',
    type: 'achievement',
    title: 'Achievement Unlocked!',
    message: 'You earned "Speed Demon" - Win 5 Speed Vote games in a row',
    timeAgo: '2 hours ago',
    isRead: false,
    group: 'today',
  },
  {
    id: '3',
    type: 'friend_request',
    title: 'Friend Request',
    message: 'CrowdKing wants to be your friend',
    timeAgo: '4 hours ago',
    isRead: false,
    group: 'today',
  },
  {
    id: '4',
    type: 'system',
    title: 'Season 3 is Live!',
    message: 'New season has started with exclusive rewards. Jump in and climb the ranks!',
    timeAgo: '1 day ago',
    isRead: true,
    group: 'earlier',
  },
  {
    id: '5',
    type: 'game_invite',
    title: 'Game Reminder',
    message: 'Your scheduled game "Logic Masters" starts in 30 minutes',
    timeAgo: '2 days ago',
    isRead: true,
    group: 'earlier',
  },
  {
    id: '6',
    type: 'achievement',
    title: 'New Milestone',
    message: 'You reached Level 24! New items unlocked in the Shop',
    timeAgo: '3 days ago',
    isRead: true,
    group: 'earlier',
  },
];

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasNotifications = notifications.length > 0;

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
  }, []);

  const handleToggleRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const todayNotifications = notifications.filter((n) => n.group === 'today');
  const earlierNotifications = notifications.filter((n) => n.group === 'earlier');

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>All Caught Up!</Text>
      <Text style={styles.emptyMessage}>
        You have no notifications right now. Play some games and check back later!
      </Text>
    </View>
  );

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const iconConfig = NOTIFICATION_ICONS[item.type];

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.isRead && styles.notificationItemUnread]}
        activeOpacity={0.7}
        onPress={() => handleToggleRead(item.id)}
        onLongPress={() => handleDismiss(item.id)}
      >
        <View style={[styles.notificationIcon, { backgroundColor: iconConfig.color + '15' }]}>
          <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !item.isRead && styles.notificationTitleUnread]}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.notificationTime}>{item.timeAgo}</Text>
        </View>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => handleDismiss(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCount}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
  );

  const renderContent = () => {
    if (!hasNotifications) return renderEmptyState();

    const sections: React.ReactNode[] = [];

    if (todayNotifications.length > 0) {
      sections.push(
        <View key="today-header">
          {renderSectionHeader('Today', todayNotifications.length)}
        </View>
      );
      todayNotifications.forEach((notification) => {
        sections.push(
          <View key={notification.id}>
            {renderNotificationItem({ item: notification })}
          </View>
        );
      });
    }

    if (earlierNotifications.length > 0) {
      sections.push(
        <View key="earlier-header" style={styles.earlierSection}>
          {renderSectionHeader('Earlier', earlierNotifications.length)}
        </View>
      );
      earlierNotifications.forEach((notification) => {
        sections.push(
          <View key={notification.id}>
            {renderNotificationItem({ item: notification })}
          </View>
        );
      });
    }

    return (
      <FlatList
        data={sections}
        renderItem={({ item }) => <>{item}</>}
        keyExtractor={(_, index) => `section-${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCountText}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
            <Ionicons name="checkmark-done" size={18} color={colors.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  unreadCountText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  markAllText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.primary,
  },
  // List
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionCount: {
    backgroundColor: colors.backgroundElevated,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  earlierSection: {
    marginTop: spacing.md,
  },
  // Notification Item
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationItemUnread: {
    backgroundColor: colors.primary + '08',
    borderColor: colors.primary + '25',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  notificationTitleUnread: {
    fontWeight: typography.weight.bold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  notificationMessage: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
    marginBottom: spacing.xs,
  },
  notificationTime: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
});

export default NotificationsScreen;
