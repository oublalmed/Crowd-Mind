import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import type { RootStackParamList } from '../../navigation/RootNavigator';

interface StatItem {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface Achievement {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  unlocked: boolean;
}

const STATS: StatItem[] = [
  { label: 'Games Played', value: '247', icon: 'game-controller-outline' },
  { label: 'Win Rate', value: '68%', icon: 'trending-up-outline' },
  { label: 'Current Streak', value: '12', icon: 'flame-outline' },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: '1', name: 'First Win', icon: 'trophy', iconColor: colors.gold, unlocked: true },
  { id: '2', name: 'Speed Demon', icon: 'flash', iconColor: colors.secondary, unlocked: true },
  { id: '3', name: 'Mind Reader', icon: 'eye', iconColor: colors.primary, unlocked: true },
  { id: '4', name: 'Crowd Favorite', icon: 'heart', iconColor: colors.accent, unlocked: true },
  { id: '5', name: 'Debate King', icon: 'chatbubbles', iconColor: colors.info, unlocked: false },
  { id: '6', name: 'Perfect Score', icon: 'star', iconColor: colors.gold, unlocked: false },
  { id: '7', name: 'Marathon', icon: 'timer', iconColor: colors.success, unlocked: false },
  { id: '8', name: 'Social Butterfly', icon: 'people', iconColor: colors.primaryLight, unlocked: false },
];

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const logout = useAuthStore((state) => state.logout);

  // Mock user data
  const user = {
    displayName: 'Player',
    username: 'player_one',
    memberSince: 'January 2025',
    level: 24,
    currentXP: 3450,
    nextLevelXP: 5000,
    skillRating: 1650,
    skillTier: 'Gold II',
  };

  const xpProgress = user.currentXP / user.nextLevelXP;

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  const renderAvatar = () => (
    <View style={styles.avatarSection}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity style={styles.editAvatarButton}>
          <Ionicons name="camera" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={styles.displayName}>{user.displayName}</Text>
      <Text style={styles.username}>@{user.username}</Text>
      <Text style={styles.memberSince}>Member since {user.memberSince}</Text>
    </View>
  );

  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      {STATS.map((stat, index) => (
        <View key={stat.label} style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons name={stat.icon} size={20} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderLevelProgress = () => (
    <Card style={styles.levelCard}>
      <View style={styles.levelHeader}>
        <View style={styles.levelLeft}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNumber}>Lv. {user.level}</Text>
          </View>
          <View>
            <Text style={styles.levelTitle}>Level {user.level}</Text>
            <Text style={styles.xpText}>
              {user.currentXP.toLocaleString()} / {user.nextLevelXP.toLocaleString()} XP
            </Text>
          </View>
        </View>
        <Text style={styles.xpPercentage}>{Math.round(xpProgress * 100)}%</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${xpProgress * 100}%` }]} />
      </View>
      <Text style={styles.xpRemaining}>
        {(user.nextLevelXP - user.currentXP).toLocaleString()} XP until Level {user.level + 1}
      </Text>
    </Card>
  );

  const renderSkillRating = () => (
    <Card style={styles.skillCard}>
      <View style={styles.skillRow}>
        <View style={styles.skillLeft}>
          <Ionicons name="shield-checkmark" size={28} color={colors.gold} />
          <View style={styles.skillInfo}>
            <Text style={styles.skillTier}>{user.skillTier}</Text>
            <Text style={styles.skillRating}>Rating: {user.skillRating}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.skillDetailsButton}>
          <Text style={styles.skillDetailsText}>Details</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderAchievements = () => (
    <View style={styles.achievementsSection}>
      <View style={styles.achievementsHeader}>
        <Text style={styles.achievementsTitle}>Achievements</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementsScroll}
      >
        {ACHIEVEMENTS.map((achievement) => (
          <View
            key={achievement.id}
            style={[
              styles.achievementBadge,
              !achievement.unlocked && styles.achievementBadgeLocked,
            ]}
          >
            <View
              style={[
                styles.achievementIcon,
                {
                  backgroundColor: achievement.unlocked
                    ? achievement.iconColor + '20'
                    : colors.backgroundElevated,
                },
              ]}
            >
              <Ionicons
                name={achievement.unlocked ? achievement.icon : 'lock-closed'}
                size={24}
                color={achievement.unlocked ? achievement.iconColor : colors.textMuted}
              />
            </View>
            <Text
              style={[
                styles.achievementName,
                !achievement.unlocked && styles.achievementNameLocked,
              ]}
              numberOfLines={1}
            >
              {achievement.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Settings */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & Info */}
        {renderAvatar()}

        {/* Stats */}
        {renderStatsRow()}

        {/* Level Progress */}
        {renderLevelProgress()}

        {/* Skill Rating */}
        {renderSkillRating()}

        {/* Achievements */}
        {renderAchievements()}

        {/* Edit Profile Button */}
        <View style={styles.buttonSection}>
          <Button
            title="Edit Profile"
            onPress={() => {}}
            variant="primary"
            style={styles.editProfileButton}
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  displayName: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  username: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  memberSince: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Level Card
  levelCard: {
    marginBottom: spacing.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  levelBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  levelNumber: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
    color: colors.primary,
  },
  levelTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  xpText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  xpPercentage: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  xpRemaining: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  // Skill Rating
  skillCard: {
    marginBottom: spacing.lg,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skillInfo: {},
  skillTier: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.gold,
  },
  skillRating: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  skillDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  skillDetailsText: {
    fontSize: typography.size.md,
    color: colors.primary,
    fontWeight: typography.weight.medium,
  },
  // Achievements
  achievementsSection: {
    marginBottom: spacing.lg,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  achievementsTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  viewAllText: {
    fontSize: typography.size.md,
    color: colors.primary,
    fontWeight: typography.weight.medium,
  },
  achievementsScroll: {
    gap: spacing.md,
  },
  achievementBadge: {
    alignItems: 'center',
    width: 80,
  },
  achievementBadgeLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementName: {
    fontSize: typography.size.xs,
    color: colors.text,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  achievementNameLocked: {
    color: colors.textMuted,
  },
  // Buttons
  buttonSection: {
    marginBottom: spacing.md,
  },
  editProfileButton: {
    height: 50,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
    backgroundColor: colors.error + '10',
  },
  signOutText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.error,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});

export default ProfileScreen;
