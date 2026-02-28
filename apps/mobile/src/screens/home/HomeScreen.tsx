import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const { width } = Dimensions.get('window');
const MODE_CARD_WIDTH = (width - spacing.lg * 2 - spacing.md * 2) / 3;

interface GameMode {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  playerCount: string;
  color: string;
}

interface ActiveGame {
  id: string;
  title: string;
  host: string;
  players: number;
  maxPlayers: number;
  mode: string;
  startingIn: string;
}

const GAME_MODES: GameMode[] = [
  {
    id: 'crowd-mind',
    name: 'Crowd Mind',
    icon: 'people',
    description: 'Classic majority vote',
    playerCount: '4-20',
    color: colors.primary,
  },
  {
    id: 'speed-vote',
    name: 'Speed Vote',
    icon: 'flash',
    description: 'Fast-paced voting',
    playerCount: '2-10',
    color: colors.secondary,
  },
  {
    id: 'debate',
    name: 'Debate',
    icon: 'chatbubbles',
    description: 'Persuasion-based',
    playerCount: '2-6',
    color: colors.accent,
  },
];

const ACTIVE_GAMES: ActiveGame[] = [
  {
    id: '1',
    title: 'Friday Night Showdown',
    host: 'NeonPlayer42',
    players: 7,
    maxPlayers: 12,
    mode: 'Crowd Mind',
    startingIn: '2 min',
  },
  {
    id: '2',
    title: 'Quick Thinkers Only',
    host: 'SpeedDemon',
    players: 4,
    maxPlayers: 8,
    mode: 'Speed Vote',
    startingIn: 'Now',
  },
  {
    id: '3',
    title: 'The Great Debate',
    host: 'LogicMaster',
    players: 3,
    maxPlayers: 6,
    mode: 'Debate',
    startingIn: '5 min',
  },
];

const HomeScreen: React.FC = () => {
  const displayName = 'Player';

  const renderDailyChallenge = () => (
    <Card
      style={styles.dailyChallengeCard}
      onPress={() => {}}
    >
      <View style={styles.dailyChallengeContent}>
        <View style={styles.dailyChallengeLeft}>
          <View style={styles.dailyBadge}>
            <Ionicons name="flame" size={14} color={colors.gold} />
            <Text style={styles.dailyBadgeText}>DAILY CHALLENGE</Text>
          </View>
          <Text style={styles.dailyChallengeTitle}>Predict the Majority</Text>
          <Text style={styles.dailyChallengeDesc}>
            Answer 5 questions and match the crowd to earn bonus XP
          </Text>
          <View style={styles.dailyReward}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text style={styles.dailyRewardText}>+250 XP</Text>
          </View>
        </View>
        <View style={styles.dailyChallengeRight}>
          <View style={styles.dailyIconCircle}>
            <Ionicons name="trophy" size={32} color={colors.gold} />
          </View>
        </View>
      </View>
    </Card>
  );

  const renderGameModeCard = (mode: GameMode) => (
    <TouchableOpacity
      key={mode.id}
      style={styles.modeCard}
      activeOpacity={0.7}
    >
      <View style={[styles.modeIconCircle, { backgroundColor: mode.color + '20' }]}>
        <Ionicons name={mode.icon} size={24} color={mode.color} />
      </View>
      <Text style={styles.modeName} numberOfLines={1}>{mode.name}</Text>
      <Text style={styles.modeDescription} numberOfLines={2}>{mode.description}</Text>
      <View style={styles.modePlayerCount}>
        <Ionicons name="people-outline" size={10} color={colors.textMuted} />
        <Text style={styles.modePlayerText}>{mode.playerCount}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderActiveGame = (game: ActiveGame) => (
    <Card key={game.id} style={styles.activeGameCard} onPress={() => {}}>
      <View style={styles.activeGameRow}>
        <View style={styles.activeGameInfo}>
          <Text style={styles.activeGameTitle} numberOfLines={1}>{game.title}</Text>
          <Text style={styles.activeGameHost}>Hosted by {game.host}</Text>
          <View style={styles.activeGameMeta}>
            <View style={styles.activeGameTag}>
              <Text style={styles.activeGameTagText}>{game.mode}</Text>
            </View>
            <Text style={styles.activeGamePlayers}>
              <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
              {'  '}{game.players}/{game.maxPlayers}
            </Text>
          </View>
        </View>
        <View style={styles.activeGameAction}>
          <View style={[
            styles.startingBadge,
            game.startingIn === 'Now' && styles.startingNowBadge,
          ]}>
            <Text style={[
              styles.startingText,
              game.startingIn === 'Now' && styles.startingNowText,
            ]}>
              {game.startingIn === 'Now' ? 'LIVE' : game.startingIn}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.displayName}>{displayName}</Text>
          </View>
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="search-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Daily Challenge */}
        {renderDailyChallenge()}

        {/* Quick Play Button */}
        <View style={styles.quickPlayContainer}>
          <Button
            title="Quick Play"
            onPress={() => {}}
            variant="primary"
            style={styles.quickPlayButton}
          />
          <View style={styles.quickPlayIcon}>
            <Ionicons name="game-controller" size={22} color={colors.text} />
          </View>
        </View>

        {/* Game Modes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Game Modes</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modesRow}>
          {GAME_MODES.map(renderGameModeCard)}
        </View>

        {/* Active Games */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Games</Text>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{ACTIVE_GAMES.length} Live</Text>
        </View>
        {ACTIVE_GAMES.map(renderActiveGame)}

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    fontWeight: typography.weight.regular,
  },
  displayName: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Daily Challenge
  dailyChallengeCard: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.gold + '30',
    marginBottom: spacing.lg,
  },
  dailyChallengeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyChallengeLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dailyBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.gold,
    letterSpacing: 1,
  },
  dailyChallengeTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dailyChallengeDesc: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
    marginBottom: spacing.sm,
  },
  dailyReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dailyRewardText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.gold,
  },
  dailyChallengeRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Quick Play
  quickPlayContainer: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  quickPlayButton: {
    height: 56,
    ...shadows.glow(colors.primary),
  },
  quickPlayIcon: {
    position: 'absolute',
    left: spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    flex: 1,
  },
  seeAllText: {
    fontSize: typography.size.md,
    color: colors.primary,
    fontWeight: typography.weight.medium,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.xs,
  },
  liveText: {
    fontSize: typography.size.sm,
    color: colors.success,
    fontWeight: typography.weight.medium,
  },
  // Game Mode Cards
  modesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  modeCard: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  modeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modeName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modeDescription: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: typography.size.xs * typography.lineHeight.normal,
  },
  modePlayerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  modePlayerText: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  // Active Games
  activeGameCard: {
    marginBottom: spacing.sm,
  },
  activeGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeGameInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  activeGameTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  activeGameHost: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  activeGameMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeGameTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  activeGameTagText: {
    fontSize: typography.size.xs,
    color: colors.primaryLight,
    fontWeight: typography.weight.medium,
  },
  activeGamePlayers: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  activeGameAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  startingBadge: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  startingNowBadge: {
    backgroundColor: colors.success + '20',
  },
  startingText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  startingNowText: {
    color: colors.success,
    fontWeight: typography.weight.bold,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});

export default HomeScreen;
