import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import type { GameStackParamList } from '../../navigation/GameStack';

type Props = NativeStackScreenProps<GameStackParamList, 'Results'>;

interface FinalPlayer {
  userId: string;
  name: string;
  score: number;
  gamesWon: number;
  accuracy: number;
}

const MOCK_RESULTS: FinalPlayer[] = [
  { userId: '1', name: 'You', score: 1240, gamesWon: 3, accuracy: 78 },
  { userId: '2', name: 'Player 2', score: 1100, gamesWon: 2, accuracy: 72 },
  { userId: '3', name: 'Player 3', score: 860, gamesWon: 1, accuracy: 60 },
  { userId: '4', name: 'Player 4', score: 720, gamesWon: 0, accuracy: 45 },
];

const PODIUM_COLORS = [colors.gold, colors.silver, colors.bronze];
const PODIUM_HEIGHTS = [140, 110, 90];

const ResultsScreen: React.FC<Props> = ({ navigation }) => {
  const crownAnim = useRef(new Animated.Value(0)).current;
  const podiumAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const listAnims = useRef(MOCK_RESULTS.map(() => new Animated.Value(0))).current;

  const topThree = MOCK_RESULTS.slice(0, 3);
  const remaining = MOCK_RESULTS.slice(3);
  const isWinner = MOCK_RESULTS[0]?.userId === '1';

  useEffect(() => {
    // Crown bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(crownAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(crownAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Podium rise
    Animated.stagger(
      200,
      podiumAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        })
      )
    ).start();

    // List slide in
    Animated.stagger(
      100,
      listAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const handlePlayAgain = () => {
    navigation.getParent()?.goBack();
  };

  const handleBackToHome = () => {
    navigation.getParent()?.goBack();
  };

  const renderPodium = () => {
    // Display order: 2nd, 1st, 3rd
    const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
    const heightOrder = [PODIUM_HEIGHTS[1], PODIUM_HEIGHTS[0], PODIUM_HEIGHTS[2]];
    const colorOrder = [PODIUM_COLORS[1], PODIUM_COLORS[0], PODIUM_COLORS[2]];
    const rankOrder = [2, 1, 3];

    return (
      <View style={styles.podiumContainer}>
        {podiumOrder.map((player, index) => {
          if (!player) return null;
          const animValue = podiumAnims[index];
          const rank = rankOrder[index];

          return (
            <Animated.View
              key={player.userId}
              style={[
                styles.podiumColumn,
                {
                  opacity: animValue,
                  transform: [
                    {
                      translateY: animValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [60, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Avatar */}
              <View
                style={[
                  styles.podiumAvatar,
                  { borderColor: colorOrder[index] },
                ]}
              >
                <Text style={styles.podiumAvatarText}>
                  {player.name.charAt(0).toUpperCase()}
                </Text>
                {rank === 1 && (
                  <Animated.View
                    style={[
                      styles.crownContainer,
                      {
                        transform: [
                          {
                            translateY: crownAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -4],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.crownEmoji}>👑</Text>
                  </Animated.View>
                )}
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={[styles.podiumScore, { color: colorOrder[index] }]}>
                {player.score.toLocaleString()}
              </Text>

              {/* Podium bar */}
              <View
                style={[
                  styles.podiumBar,
                  {
                    height: heightOrder[index],
                    backgroundColor: colorOrder[index] + '20',
                    borderColor: colorOrder[index] + '40',
                  },
                ]}
              >
                <Text style={[styles.podiumRank, { color: colorOrder[index] }]}>
                  #{rank}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderStats = () => {
    const myResult = MOCK_RESULTS.find((p) => p.userId === '1');
    if (!myResult) return null;

    const myRank = MOCK_RESULTS.indexOf(myResult) + 1;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={22} color={colors.gold} />
          <Text style={styles.statValue}>#{myRank}</Text>
          <Text style={styles.statLabel}>Rank</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={22} color={colors.primary} />
          <Text style={styles.statValue}>{myResult.score.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={styles.statValue}>{myResult.accuracy}%</Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
      </View>
    );
  };

  const renderLeaderboard = () => (
    <View style={styles.leaderboardContainer}>
      <Text style={styles.leaderboardTitle}>Final Standings</Text>
      {MOCK_RESULTS.map((player, index) => {
        const animValue = listAnims[index];

        return (
          <Animated.View
            key={player.userId}
            style={[
              styles.leaderboardRow,
              player.userId === '1' && styles.leaderboardRowHighlight,
              {
                opacity: animValue,
                transform: [
                  {
                    translateX: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.rankBadge,
                {
                  backgroundColor:
                    index < 3 ? PODIUM_COLORS[index] + '20' : colors.backgroundElevated,
                },
              ]}
            >
              <Text
                style={[
                  styles.rankBadgeText,
                  { color: index < 3 ? PODIUM_COLORS[index] : colors.textSecondary },
                ]}
              >
                {index + 1}
              </Text>
            </View>
            <View style={styles.leaderboardInfo}>
              <Text style={styles.leaderboardName}>{player.name}</Text>
              <Text style={styles.leaderboardAccuracy}>
                {player.accuracy}% accuracy
              </Text>
            </View>
            <Text style={styles.leaderboardScore}>
              {player.score.toLocaleString()}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {isWinner ? 'Victory!' : 'Game Over'}
          </Text>
          <Text style={styles.subtitle}>
            {isWinner
              ? 'You dominated the crowd!'
              : 'Great game! Keep playing to improve.'}
          </Text>
        </View>

        {/* Podium */}
        {renderPodium()}

        {/* Stats */}
        {renderStats()}

        {/* Full Leaderboard */}
        {renderLeaderboard()}

        {/* XP Gained */}
        <View style={styles.xpContainer}>
          <Ionicons name="arrow-up-circle" size={24} color={colors.secondary} />
          <Text style={styles.xpText}>+125 XP Earned</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.playAgainButton}
            onPress={handlePlayAgain}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={22} color={colors.text} />
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleBackToHome}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={22} color={colors.primary} />
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Title
  titleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.extrabold,
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Podium
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  podiumColumn: {
    alignItems: 'center',
    flex: 1,
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    position: 'relative',
    marginBottom: spacing.xs,
  },
  podiumAvatarText: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  crownContainer: {
    position: 'absolute',
    top: -20,
  },
  crownEmoji: {
    fontSize: 22,
  },
  podiumName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.sm,
  },
  podiumBar: {
    width: '100%',
    borderRadius: borderRadius.md,
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRank: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.extrabold,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Leaderboard
  leaderboardContainer: {
    marginBottom: spacing.lg,
  },
  leaderboardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  leaderboardRowHighlight: {
    borderWidth: 1,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  leaderboardAccuracy: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  leaderboardScore: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  // XP
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary + '15',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  xpText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.secondary,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  playAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  playAgainText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  homeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  homeButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
});

export default ResultsScreen;
