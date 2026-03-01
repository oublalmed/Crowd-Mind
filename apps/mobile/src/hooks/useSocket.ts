import { useEffect, useRef, useCallback } from 'react';
import socketService from '../services/socketService';
import { useAuthStore } from '../store/authStore';
import type { GameState, VoteUpdate, Player } from '../services/socketService';

/**
 * Hook to manage socket connection lifecycle.
 * Connects on mount if authenticated, disconnects on unmount.
 */
export function useSocketConnection(): void {
  const accessToken = useAuthStore((state) => state.accessToken);
  const connected = useRef(false);

  useEffect(() => {
    if (accessToken && !connected.current) {
      socketService.connect(accessToken);
      connected.current = true;
    }

    return () => {
      if (connected.current) {
        socketService.disconnect();
        connected.current = false;
      }
    };
  }, [accessToken]);
}

/**
 * Hook for game room socket events.
 * Joins the room on mount, leaves on unmount, and subscribes to game events.
 */
export function useGameRoom(
  roomId: string,
  callbacks: {
    onGameState?: (state: GameState) => void;
    onVoteUpdate?: (update: VoteUpdate) => void;
    onPlayerJoined?: (player: Player) => void;
    onPlayerLeft?: (player: Player) => void;
  }
) {
  useEffect(() => {
    socketService.joinRoom(roomId);

    const unsubscribers: (() => void)[] = [];

    if (callbacks.onGameState) {
      unsubscribers.push(socketService.onGameStateChange(callbacks.onGameState));
    }
    if (callbacks.onVoteUpdate) {
      unsubscribers.push(socketService.onVoteUpdate(callbacks.onVoteUpdate));
    }
    if (callbacks.onPlayerJoined) {
      unsubscribers.push(socketService.onPlayerJoined(callbacks.onPlayerJoined));
    }
    if (callbacks.onPlayerLeft) {
      unsubscribers.push(socketService.onPlayerLeft(callbacks.onPlayerLeft));
    }

    return () => {
      socketService.leaveRoom(roomId);
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [roomId]);

  const submitVote = useCallback(
    (roundId: string, choice: string) => {
      socketService.submitVote(roomId, roundId, choice);
    },
    [roomId]
  );

  return { submitVote };
}
