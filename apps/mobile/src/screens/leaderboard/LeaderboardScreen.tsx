import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import leaderboardService from '../../services/leaderboardService';
import { useAuthStore } from '../../store/authStore';

type TimePeriod = 'daily' | 'weekly' | 'season' | 'allTime';

interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  displayName: string;
  score: number;
  avatarColor: string;
  isCurrentUser?: boolean;
}

const TIME_PERIODS: { key: TimePeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'season', label: 'Season' },
  { key: 'allTime', label: 'All Time' },
];

const AVATAR_COLORS = [
  '#6C5CE7', '#00CEC9', '#FD79A8', '#FDCB6E', '#74B9FF',
  '#A29BFE', '#81ECEC', '#FF7675', '#00B894', '#E17055',
];

const getAvatarColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getRankColor = (rank: number): string => {
  switch (rank) {
    case 1: return colors.gold;
    case 2: return colors.silver;
    case 3: return colors.bronze;
    default: return colors.textMuted;
  }
};

const getRankIcon = (rank: number): keyof typeof Ionicons.glyphMap | null => {
  if (rank <= 3) return 'trophy';
  return null;
};

const formatScore = (score: number): string => {
  return score.toLocaleString();
};

const LeaderboardScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const user = useAuthStore((state) => state.user);

  const fetchLeaderboard = useCallback(async (period: TimePeriod) => {
    setLoading(true);
    try {
      let response;
      switch (period) {
        case 'weekly':
          response = await leaderboardService.getWeekly(1, 50);
          break;
        case 'daily':
        case 'season':
        case 'allTime':
        default:
          response = await leaderboardService.getGlobal(1, 50);
          break;
      }

      const mapped: LeaderboardEntry[] = response.entries.map((entry) => ({
        id: entry.userId,
        rank: entry.rank,
        username: entry.username,
        displayName: entry.displayName,
        score: entry.score,
        avatarColor: getAvatarColor(entry.userId),
        isCurrentUser: user ? entry.userId === user.id : false,
      }));

      setEntries(mapped);

      // Fetch current user rank
      if (user) {
        try {
          const playerRank = await leaderboardService.getPlayerRank(user.id);
          if (playerRank) {
            setCurrentUser({
              id: playerRank.userId,
              rank: playerRank.rank,
              username: user.username,
              displayName: user.displayName,
              score: playerRank.score,
              avatarColor: colors.primary,
              isCurrentUser: true,
            });
          } else {
            setCurrentUser(null);
          }
        } catch {
          setCurrentUser(null);
        }
      }
    } catch {
      setEntries([]);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLeaderboard(selectedPeriod);
  }, [selectedPeriod, fetchLeaderboard]);

  const topThree = entries.slice(0, 3);
  const restOfList = entries.slice(3);

  const renderTabSelector = () => (
    <View style={styles.tabContainer}>
      {TIME_PERIODS.map((period) => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.tab,
            selectedPeriod === period.key && styles.tabActive,
          ]}
          onPress={() => setSelectedPeriod(period.key)}
        >
          <Text
            style={[
              styles.tabText,
              selectedPeriod === period.key && styles.tabTextActive,
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTopThreePlayer = (player: LeaderboardEntry, position: 'left' | 'center' | 'right') => {
    const isFirst = position === 'center';
    const rankColor = getRankColor(player.rank);
    const avatarSize = isFirst ? 80 : 64;
    const containerStyle = isFirst ? styles.topPlayerFirst : styles.topPlayerOther;

    return (
      <View key={player.id} style={[styles.topPlayerContainer, containerStyle]}>
        <View style={styles.rankBadgeContainer}>
          <View style={[styles.rankBadge, { backgroundColor: rankColor + '20', borderColor: rankColor }]}>
            <Text style={[styles.rankBadgeText, { color: rankColor }]}>{player.rank}</Text>
          </View>
        </View>
        <View
          style={[
            styles.topAvatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              borderColor: rankColor,
              backgroundColor: player.avatarColor + '30',
            },
          ]}
        >
          <Text style={[styles.topAvatarText, { fontSize: isFirst ? 28 : 22, color: player.avatarColor }]}>
            {player.displayName.charAt(0)}
          </Text>
        </View>
        {player.rank === 1 && (
          <View style={styles.crownContainer}>
            <Ionicons name="trophy" size={20} color={colors.gold} />
          </View>
        )}
        <Text style={styles.topPlayerName} numberOfLines={1}>{player.displayName}</Text>
        <Text style={[styles.topPlayerScore, { color: rankColor }]}>{formatScore(player.score)}</Text>
      </View>
    );
  };

  const renderTopThree = () => (
    <View style={styles.topThreeContainer}>
      {/* Render in order: 2nd, 1st, 3rd */}
      {renderTopThreePlayer(topThree[1], 'left')}
      {renderTopThreePlayer(topThree[0], 'center')}
      {renderTopThreePlayer(topThree[2], 'right')}
    </View>
  );

  const renderListItem = ({ item }: { item: LeaderboardEntry }) => (
    <View style={[styles.listItem, item.isCurrentUser && styles.listItemCurrent]}>
      <View style={styles.listRank}>
        <Text style={styles.listRankText}>{item.rank}</Text>
      </View>
      <View style={[styles.listAvatar, { backgroundColor: item.avatarColor + '30' }]}>
        <Text style={[styles.listAvatarText, { color: item.avatarColor }]}>
          {item.displayName.charAt(0)}
        </Text>
      </View>
      <View style={styles.listInfo}>
        <Text style={[styles.listName, item.isCurrentUser && styles.listNameCurrent]}>
          {item.displayName}
          {item.isCurrentUser ? ' (You)' : ''}
        </Text>
        <Text style={styles.listUsername}>@{item.username}</Text>
      </View>
      <Text style={styles.listScore}>{formatScore(item.score)}</Text>
    </View>
  );

  const renderCurrentUserSticky = () => {
    if (!currentUser) return null;
    return (
      <View style={styles.stickyContainer}>
        <View style={styles.stickyDivider} />
        {renderListItem({ item: currentUser })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity style={styles.headerIconButton}>
          <Ionicons name="filter-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      {renderTabSelector()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No leaderboard data available</Text>
        </View>
      ) : (
        <>
          {/* Top 3 */}
          {topThree.length >= 3 && renderTopThree()}

          {/* Rest of List */}
          <FlatList
            data={restOfList}
            renderItem={renderListItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />

          {/* Sticky Current User */}
          {renderCurrentUserSticky()}
        </>
      )}
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tab Selector
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: typography.weight.bold,
  },
  // Top 3
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
  },
  topPlayerContainer: {
    alignItems: 'center',
    flex: 1,
  },
  topPlayerFirst: {
    marginBottom: 0,
  },
  topPlayerOther: {
    marginTop: spacing.lg,
  },
  rankBadgeContainer: {
    marginBottom: spacing.xs,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  rankBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  topAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: spacing.sm,
  },
  topAvatarText: {
    fontWeight: typography.weight.bold,
  },
  crownContainer: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
  },
  topPlayerName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    textAlign: 'center',
    maxWidth: 90,
  },
  topPlayerScore: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    marginTop: 2,
  },
  // List
  listContainer: {
    paddingHorizontal: spacing.lg,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItemCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  listRank: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  listRankText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  listAvatarText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  listNameCurrent: {
    color: colors.primaryLight,
  },
  listUsername: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    marginTop: 1,
  },
  listScore: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.secondary,
  },
  // Sticky Current User
  stickyContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    ...shadows.md,
  },
  stickyDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.size.md,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default LeaderboardScreen;
