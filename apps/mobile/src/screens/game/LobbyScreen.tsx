import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Clipboard,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import type { GameStackParamList } from '../../navigation/GameStack';
import { useGameRoom } from '../../hooks/useSocket';
import { useGameStore, type Player } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<GameStackParamList, 'Lobby'>;

interface PlayerListItem {
  id: string;
  name: string;
  avatar: string;
  isReady: boolean;
  isHost: boolean;
}

const EMOJI_REACTIONS = ['👍', '🔥', '😎', '🎮', '⚡', '🎯'];

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;

const GAME_MODE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  'crowd-mind': { label: 'Crowd Mind', icon: 'people', color: colors.primary },
  'speed-vote': { label: 'Speed Vote', icon: 'flash', color: colors.secondary },
  'debate': { label: 'Debate', icon: 'chatbubbles', color: colors.accent },
};

const LobbyScreen: React.FC<Props> = ({ route, navigation }) => {
  const { roomId, gameMode } = route.params;

  // WebSocket hook - handles joining room and subscribing to events
  const { setReady, startGame } = useGameRoom(roomId);

  // Store state
  const room = useGameStore((state) => state.room);
  const phase = useGameStore((state) => state.phase);
  const userId = useAuthStore((state) => state.user?.id) || '';

  const [autoStartTimer, setAutoStartTimer] = useState(30);
  const [chatMessages, setChatMessages] = useState<{ id: string; name: string; emoji: string }[]>([]);

  // Animated values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  // Derive player list from room state
  const players: PlayerListItem[] = useMemo(() => {
    if (!room) return [];
    return Object.values(room.players).map((p: Player) => ({
      id: p.userId,
      name: p.displayName || p.username || p.userId,
      avatar: 'person-circle',
      isReady: p.isReady,
      isHost: room.hostId === p.userId,
    }));
  }, [room]);

  const isHost = room?.hostId === userId;
  const isReady = room?.players[userId]?.isReady ?? false;

  const modeConfig = GAME_MODE_CONFIG[gameMode] || GAME_MODE_CONFIG['crowd-mind'];
  const readyCount = players.filter((p) => p.isReady).length;
  const canStart = readyCount >= MIN_PLAYERS;

  // Navigate to ActiveGame when phase changes to 'voting'
  useEffect(() => {
    if (phase === 'voting') {
      navigation.replace('ActiveGame', { roomId, gameMode });
    }
  }, [phase, navigation, roomId, gameMode]);

  // Pulse animation for ready status
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Waiting dots animation
  useEffect(() => {
    const animateDots = Animated.loop(
      Animated.stagger(200, [
        Animated.sequence([
          Animated.timing(dotAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dotAnim1, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dotAnim2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dotAnim2, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dotAnim3, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dotAnim3, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]),
    );
    animateDots.start();
    return () => animateDots.stop();
  }, [dotAnim1, dotAnim2, dotAnim3]);

  // Auto-start countdown (only for host)
  useEffect(() => {
    if (!canStart || !isHost) {
      setAutoStartTimer(30);
      return;
    }
    const interval = setInterval(() => {
      setAutoStartTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          startGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [canStart, isHost, startGame]);

  const handleCopyRoomCode = () => {
    Clipboard.setString(roomId);
    Alert.alert('Copied!', 'Room code copied to clipboard.');
  };

  const handleToggleReady = () => {
    setReady(!isReady);
  };

  const handleStartGame = () => {
    startGame();
  };

  const handleLeaveRoom = () => {
    Alert.alert('Leave Room', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const handleEmojiReaction = (emoji: string) => {
    const currentPlayer = room?.players[userId];
    const displayName = currentPlayer?.displayName || currentPlayer?.username || 'You';
    const newMessage = {
      id: Date.now().toString(),
      name: displayName,
      emoji,
    };
    setChatMessages((prev) => [...prev.slice(-10), newMessage]);
  };

  const formatRoomCode = (code: string) => {
    return code.toUpperCase().replace(/(.{3})/g, '$1 ').trim();
  };

  const renderPlayerItem = ({ item }: { item: PlayerListItem }) => (
    <View style={styles.playerCard}>
      <View style={[styles.avatarContainer, item.isReady && styles.avatarReady]}>
        <Ionicons
          name={item.avatar as any}
          size={40}
          color={item.isReady ? colors.primary : colors.textMuted}
        />
        {item.isHost && (
          <View style={styles.hostBadge}>
            <Ionicons name="star" size={10} color={colors.gold} />
          </View>
        )}
        {item.isReady && (
          <Animated.View
            style={[
              styles.readyPulse,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
        )}
      </View>
      <Text style={styles.playerName} numberOfLines={1}>
        {item.name}
      </Text>
      <View style={[styles.statusBadge, item.isReady ? styles.statusReady : styles.statusWaiting]}>
        <Text style={[styles.statusText, item.isReady && styles.statusTextReady]}>
          {item.isReady ? 'Ready' : 'Waiting'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLeaveRoom} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Game Lobby</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Room Code */}
        <TouchableOpacity style={styles.roomCodeContainer} onPress={handleCopyRoomCode} activeOpacity={0.7}>
          <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
          <View style={styles.roomCodeRow}>
            <Text style={styles.roomCode}>{formatRoomCode(roomId)}</Text>
            <Ionicons name="copy-outline" size={22} color={colors.primaryLight} />
          </View>
          <Text style={styles.roomCodeHint}>Tap to copy</Text>
        </TouchableOpacity>

        {/* Game Mode Badge */}
        <View style={[styles.gameModeBadge, { backgroundColor: modeConfig.color + '20' }]}>
          <Ionicons name={modeConfig.icon as any} size={20} color={modeConfig.color} />
          <Text style={[styles.gameModeText, { color: modeConfig.color }]}>
            {modeConfig.label}
          </Text>
        </View>

        {/* Player Count */}
        <View style={styles.playerCountContainer}>
          <Ionicons name="people" size={20} color={colors.textSecondary} />
          <Text style={styles.playerCountText}>
            {players.length}/{MAX_PLAYERS} Players
          </Text>
          {players.length < MIN_PLAYERS && (
            <Text style={styles.minPlayersWarning}>
              (Need {MIN_PLAYERS - players.length} more)
            </Text>
          )}
        </View>

        {/* Player Grid */}
        <View style={styles.playerGrid}>
          <FlatList
            data={players}
            renderItem={renderPlayerItem}
            keyExtractor={(item) => item.id}
            numColumns={4}
            scrollEnabled={false}
            contentContainerStyle={styles.playerGridContent}
            columnWrapperStyle={styles.playerGridRow}
          />
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, MAX_PLAYERS - players.length) })
            .slice(0, 4)
            .map((_, index) => (
              <View key={`empty-${index}`} style={styles.emptySlot}>
                <Ionicons name="add-circle-outline" size={32} color={colors.textMuted} />
              </View>
            ))}
        </View>

        {/* Waiting indicator */}
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Waiting for players</Text>
          <View style={styles.dotsContainer}>
            {[dotAnim1, dotAnim2, dotAnim3].map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    opacity: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -6],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Auto-start Timer */}
        {canStart && isHost && (
          <View style={styles.autoStartContainer}>
            <Ionicons name="timer-outline" size={18} color={colors.secondary} />
            <Text style={styles.autoStartText}>
              Auto-start in {autoStartTimer}s
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.readyButton, isReady && styles.readyButtonActive]}
            onPress={handleToggleReady}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isReady ? 'checkmark-circle' : 'radio-button-off'}
              size={24}
              color={isReady ? colors.success : colors.text}
            />
            <Text style={[styles.readyButtonText, isReady && styles.readyButtonTextActive]}>
              {isReady ? 'Ready!' : 'Ready Up'}
            </Text>
          </TouchableOpacity>

          {isHost && (
            <TouchableOpacity
              style={[styles.startButton, !canStart && styles.startButtonDisabled]}
              onPress={handleStartGame}
              disabled={!canStart}
              activeOpacity={0.7}
            >
              <Ionicons name="play" size={22} color={canStart ? colors.text : colors.textMuted} />
              <Text style={[styles.startButtonText, !canStart && styles.startButtonTextDisabled]}>
                Start Game
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveRoom} activeOpacity={0.7}>
          <Ionicons name="exit-outline" size={20} color={colors.error} />
          <Text style={styles.leaveButtonText}>Leave Room</Text>
        </TouchableOpacity>

        {/* Chat / Emoji Reactions */}
        <View style={styles.chatContainer}>
          <Text style={styles.chatTitle}>Quick Reactions</Text>
          <View style={styles.emojiRow}>
            {EMOJI_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiButton}
                onPress={() => handleEmojiReaction(emoji)}
                activeOpacity={0.6}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {chatMessages.length > 0 && (
            <View style={styles.chatMessages}>
              {chatMessages.slice(-5).map((msg) => (
                <View key={msg.id} style={styles.chatMessage}>
                  <Text style={styles.chatMessageName}>{msg.name}</Text>
                  <Text style={styles.chatMessageEmoji}>{msg.emoji}</Text>
                </View>
              ))}
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  roomCodeContainer: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.md,
  },
  roomCodeLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  roomCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roomCode: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
    letterSpacing: 6,
  },
  roomCodeHint: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  gameModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  gameModeText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  playerCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  playerCountText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  minPlayersWarning: {
    fontSize: typography.size.sm,
    color: colors.warning,
    fontWeight: typography.weight.medium,
  },
  playerGrid: {
    marginTop: spacing.md,
  },
  playerGridContent: {
    gap: spacing.sm,
  },
  playerGridRow: {
    justifyContent: 'center',
    gap: spacing.sm,
  },
  playerCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    width: 76,
    ...shadows.sm,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  avatarReady: {
    borderColor: colors.primary,
  },
  hostBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  readyPulse: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.4,
  },
  playerName: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statusBadge: {
    marginTop: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusReady: {
    backgroundColor: colors.success + '20',
  },
  statusWaiting: {
    backgroundColor: colors.textMuted + '20',
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  statusTextReady: {
    color: colors.success,
  },
  emptySlot: {
    width: 76,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  waitingText: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  autoStartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.secondary + '15',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
  },
  autoStartText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  readyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  readyButtonActive: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  readyButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  readyButtonTextActive: {
    color: colors.success,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  startButtonDisabled: {
    backgroundColor: colors.backgroundElevated,
  },
  startButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  startButtonTextDisabled: {
    color: colors.textMuted,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  leaveButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.error,
  },
  chatContainer: {
    marginTop: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  chatTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  chatMessages: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  chatMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  chatMessageName: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  chatMessageEmoji: {
    fontSize: 18,
  },
});

export default LobbyScreen;
