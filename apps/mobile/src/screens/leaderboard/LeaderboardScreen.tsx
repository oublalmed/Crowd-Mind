import React, { useState } from 'react';
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

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', rank: 1, username: 'MindMaster', displayName: 'Mind Master', score: 12450, avatarColor: '#6C5CE7' },
  { id: '2', rank: 2, username: 'CrowdKing', displayName: 'Crowd King', score: 11280, avatarColor: '#00CEC9' },
  { id: '3', rank: 3, username: 'VoteQueen', displayName: 'Vote Queen', score: 10890, avatarColor: '#FD79A8' },
  { id: '4', rank: 4, username: 'NeonStrike', displayName: 'Neon Strike', score: 9750, avatarColor: '#FDCB6E' },
  { id: '5', rank: 5, username: 'PixelHunter', displayName: 'Pixel Hunter', score: 9340, avatarColor: '#74B9FF' },
  { id: '6', rank: 6, username: 'BrainWave', displayName: 'Brain Wave', score: 8920, avatarColor: '#A29BFE' },
  { id: '7', rank: 7, username: 'ThinkFast', displayName: 'Think Fast', score: 8510, avatarColor: '#81ECEC' },
  { id: '8', rank: 8, username: 'VoteMaster', displayName: 'Vote Master', score: 8100, avatarColor: '#FF7675' },
  { id: '9', rank: 9, username: 'CrowdSurfer', displayName: 'Crowd Surfer', score: 7680, avatarColor: '#00B894' },
  { id: '10', rank: 10, username: 'MajorityRule', displayName: 'Majority Rule', score: 7250, avatarColor: '#E17055' },
  { id: '11', rank: 11, username: 'HiveMind', displayName: 'Hive Mind', score: 6890, avatarColor: '#6C5CE7' },
  { id: '12', rank: 12, username: 'PollStar', displayName: 'Poll Star', score: 6430, avatarColor: '#00CEC9' },
];

const CURRENT_USER: LeaderboardEntry = {
  id: 'current',
  rank: 47,
  username: 'Player',
  displayName: 'Player',
  score: 3280,
  avatarColor: colors.primary,
  isCurrentUser: true,
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

  const topThree = MOCK_LEADERBOARD.slice(0, 3);
  const restOfList = MOCK_LEADERBOARD.slice(3);

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

  const renderCurrentUserSticky = () => (
    <View style={styles.stickyContainer}>
      <View style={styles.stickyDivider} />
      {renderListItem({ item: CURRENT_USER })}
    </View>
  );

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

      {/* Top 3 */}
      {renderTopThree()}

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
});

export default LeaderboardScreen;
