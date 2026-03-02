import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import type { GameStackParamList } from '../../navigation/GameStack';
import { useGameStore } from '../../store/gameStore';
import { useGameRoom } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<GameStackParamList, 'ActiveGame'>;

interface Choice {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const CHOICES: Choice[] = [
  { id: 'a', label: 'Option A', icon: 'diamond', color: colors.primary },
  { id: 'b', label: 'Option B', icon: 'flash', color: colors.secondary },
  { id: 'c', label: 'Option C', icon: 'star', color: colors.accent },
  { id: 'd', label: 'Option D', icon: 'heart', color: colors.gold },
];

const RESULTS_DURATION = 8;

const ActiveGameScreen: React.FC<Props> = ({ route, navigation }) => {
  const { roomId } = route.params;

  const userId = useAuthStore((state) => state.user?.id) || '';
  const { submitVote } = useGameRoom(roomId);

  const phase = useGameStore((state) => state.phase);
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const votingDuration = useGameStore((state) => state.votingDuration);
  const votesReceived = useGameStore((state) => state.votesReceived);
  const myVote = useGameStore((state) => state.myVote);
  const voteConfirmed = useGameStore((state) => state.voteConfirmed);
  const room = useGameStore((state) => state.room);

  const totalPlayers = room ? Object.keys(room.players).length : 0;

  const [timeLeft, setTimeLeft] = useState(votingDuration);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const timerAnim = useRef(new Animated.Value(1)).current;
  const choiceAnims = useRef(CHOICES.map(() => new Animated.Value(0))).current;
  const scoreAnims = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0))
  ).current;

  // Derive sorted player scores from room state
  const playerScores = useMemo(() => {
    if (!room) return [];
    return Object.values(room.players)
      .map((player) => ({
        odId: player.userId,
        name:
          player.userId === userId
            ? 'You'
            : player.displayName || player.username || player.userId,
        score: player.score,
      }))
      .sort((a, b) => b.score - a.score);
  }, [room, userId]);

  // Navigate to Results when game is finished
  useEffect(() => {
    if (phase === 'finished') {
      navigation.replace('Results', { gameId: roomId, roomId });
    }
  }, [phase, roomId, navigation]);

  // Timer countdown for voting phase
  useEffect(() => {
    if (phase !== 'voting') return;

    const duration = votingDuration;
    setTimeLeft(duration);
    timerAnim.setValue(1);

    Animated.timing(timerAnim, {
      toValue: 0,
      duration: duration * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentRound, votingDuration]);

  // Timer countdown for results phase
  useEffect(() => {
    if (phase !== 'results') return;

    const duration = RESULTS_DURATION;
    setTimeLeft(duration);
    timerAnim.setValue(1);

    Animated.timing(timerAnim, {
      toValue: 0,
      duration: duration * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentRound]);

  // Reset local selection when a new round starts (store resets myVote)
  useEffect(() => {
    if (phase === 'voting') {
      setSelectedChoice(null);
    }
  }, [phase, currentRound]);

  // Stagger choice animations on voting phase
  useEffect(() => {
    if (phase === 'voting') {
      choiceAnims.forEach((anim) => anim.setValue(0));
      Animated.stagger(
        100,
        choiceAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          })
        )
      ).start();
    }
  }, [phase, currentRound]);

  // Stagger score animations on results phase
  useEffect(() => {
    if (phase === 'results') {
      scoreAnims.forEach((anim) => anim.setValue(0));
      const animsToRun = scoreAnims.slice(0, playerScores.length);
      Animated.stagger(
        120,
        animsToRun.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          })
        )
      ).start();
    }
  }, [phase, playerScores.length]);

  const handleSelectChoice = (choiceId: string) => {
    if (myVote) return;
    setSelectedChoice(choiceId);
  };

  const handleSubmitVote = () => {
    if (!selectedChoice || myVote) return;
    submitVote(selectedChoice);
  };

  const hasVoted = myVote !== null;

  const timerColor =
    timeLeft <= 5 ? colors.error : timeLeft <= 10 ? colors.warning : colors.primary;

  const timerWidth = timerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.roundInfo}>
        <Text style={styles.roundLabel}>ROUND</Text>
        <Text style={styles.roundNumber}>
          {currentRound}/{totalRounds}
        </Text>
      </View>
      <View style={styles.timerContainer}>
        <Ionicons
          name="timer-outline"
          size={18}
          color={timerColor}
        />
        <Text style={[styles.timerText, { color: timerColor }]}>
          {timeLeft}s
        </Text>
      </View>
      <View style={styles.voteCountContainer}>
        <Ionicons name="people" size={16} color={colors.textSecondary} />
        <Text style={styles.voteCountText}>
          {votesReceived}/{totalPlayers}
        </Text>
      </View>
    </View>
  );

  const renderTimerBar = () => (
    <View style={styles.timerBarContainer}>
      <Animated.View
        style={[
          styles.timerBar,
          {
            width: timerWidth,
            backgroundColor: timerColor,
          },
        ]}
      />
    </View>
  );

  const renderPrompt = () => (
    <View style={styles.promptContainer}>
      <Text style={styles.promptLabel}>
        {phase === 'voting' ? 'CHOOSE YOUR ANSWER' : 'ROUND RESULTS'}
      </Text>
      <Text style={styles.promptText}>
        {phase === 'voting'
          ? 'What does the crowd think?'
          : `Round ${currentRound} Complete`}
      </Text>
    </View>
  );

  const renderVotingPhase = () => (
    <View style={styles.choicesContainer}>
      {CHOICES.map((choice, index) => {
        const isSelected = selectedChoice === choice.id;
        const animValue = choiceAnims[index];

        return (
          <Animated.View
            key={choice.id}
            style={{
              opacity: animValue,
              transform: [
                {
                  translateY: animValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={[
                styles.choiceCard,
                isSelected && {
                  borderColor: choice.color,
                  backgroundColor: choice.color + '15',
                },
                hasVoted && !isSelected && styles.choiceCardDimmed,
              ]}
              onPress={() => handleSelectChoice(choice.id)}
              disabled={hasVoted}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.choiceIcon,
                  { backgroundColor: choice.color + '20' },
                ]}
              >
                <Ionicons name={choice.icon} size={24} color={choice.color} />
              </View>
              <Text
                style={[
                  styles.choiceLabel,
                  isSelected && { color: choice.color },
                ]}
              >
                {choice.label}
              </Text>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={choice.color}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {selectedChoice && !hasVoted && (
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitVote}
          activeOpacity={0.7}
        >
          <Text style={styles.submitButtonText}>Lock In Vote</Text>
          <Ionicons name="lock-closed" size={20} color={colors.text} />
        </TouchableOpacity>
      )}

      {hasVoted && (
        <View style={styles.votedIndicator}>
          <Ionicons
            name="checkmark-circle"
            size={28}
            color={voteConfirmed ? colors.success : colors.warning}
          />
          <Text style={styles.votedText}>
            {voteConfirmed
              ? 'Vote confirmed! Waiting for others...'
              : 'Vote submitted! Waiting for confirmation...'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderResultsPhase = () => {
    const maxScore = playerScores.length > 0 ? Math.max(playerScores[0].score, 1) : 1;

    return (
      <View style={styles.resultsContainer}>
        {playerScores.map((player, index) => {
          const animValue = scoreAnims[index] || new Animated.Value(1);

          return (
            <Animated.View
              key={player.odId}
              style={[
                styles.scoreRow,
                {
                  opacity: animValue,
                  transform: [
                    {
                      translateX: animValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.scoreRank}>
                <Text style={styles.scoreRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreName}>{player.name}</Text>
                <View style={styles.scoreBarOuter}>
                  <View
                    style={[
                      styles.scoreBarInner,
                      {
                        width: `${(player.score / maxScore) * 100}%`,
                        backgroundColor:
                          index === 0
                            ? colors.gold
                            : index === 1
                              ? colors.silver
                              : colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.scoreValues}>
                <Text style={styles.scoreTotal}>{player.score}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderTransition = () => (
    <View style={styles.transitionContainer}>
      <Text style={styles.transitionText}>Round {currentRound + 1}</Text>
      <Text style={styles.transitionSubtext}>Get ready!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderTimerBar()}
      {renderPrompt()}

      {phase === 'voting' && renderVotingPhase()}
      {phase === 'results' && renderResultsPhase()}
      {phase === 'transition' && renderTransition()}
    </SafeAreaView>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  roundInfo: {
    alignItems: 'center',
  },
  roundLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  roundNumber: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  timerText: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
  },
  voteCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  voteCountText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  // Timer Bar
  timerBarContainer: {
    height: 4,
    backgroundColor: colors.backgroundElevated,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  // Prompt
  promptContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  promptLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  promptText: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  // Voting Phase
  choicesContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.md,
  },
  choiceCardDimmed: {
    opacity: 0.4,
  },
  choiceIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceLabel: {
    flex: 1,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
    ...shadows.md,
  },
  submitButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  votedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  votedText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.success,
  },
  // Results Phase
  resultsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  scoreRank: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreRankText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  scoreBarOuter: {
    height: 6,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  scoreBarInner: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  scoreValues: {
    alignItems: 'flex-end',
  },
  scoreTotal: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  scoreDelta: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.success,
  },
  // Transition
  transitionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transitionText: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.extrabold,
    color: colors.primary,
  },
  transitionSubtext: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

export default ActiveGameScreen;
