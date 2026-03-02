import { useEffect, useRef, useCallback } from 'react';
import socketService from '../services/socketService';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

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

export function useGameRoom(roomId: string) {
  const userId = useAuthStore((state) => state.user?.id) || '';
  const store = useGameStore;

  useEffect(() => {
    socketService.joinRoom(roomId, userId);

    const unsubs: (() => void)[] = [];

    unsubs.push(socketService.on('room-state', (data) => {
      store.getState().setRoom(data);
    }));

    unsubs.push(socketService.on('player-joined', (data: { userId: string; playerCount: number }) => {
      store.getState().playerJoined(data.userId);
    }));

    unsubs.push(socketService.on('player-left', (data: { userId: string; newHostId?: string }) => {
      store.getState().playerLeft(data.userId, data.newHostId);
    }));

    unsubs.push(socketService.on('player-ready-changed', (data: { userId: string; isReady: boolean; players: Record<string, any> }) => {
      store.getState().playerReadyChanged(data.userId, data.isReady, data.players);
    }));

    unsubs.push(socketService.on('game-started', (data: { roomId: string; totalRounds: number; currentRound: number }) => {
      store.getState().gameStarted(data);
    }));

    unsubs.push(socketService.on('round-started', (data: { round: number; totalRounds: number; votingPhaseDurationSec: number }) => {
      store.getState().roundStarted(data);
    }));

    unsubs.push(socketService.on('vote-confirmed', () => {
      store.getState().confirmVote();
    }));

    unsubs.push(socketService.on('vote-received', () => {
      store.getState().incrementVotesReceived();
    }));

    unsubs.push(socketService.on('game-ended', (data: { results: Array<{ userId: string; score: number }> }) => {
      store.getState().setFinalResults(data.results);
    }));

    unsubs.push(socketService.on('error', (data: { message: string }) => {
      store.getState().setError(data.message);
    }));

    return () => {
      socketService.leaveRoom(roomId, userId);
      unsubs.forEach((unsub) => unsub());
    };
  }, [roomId, userId]);

  const setReady = useCallback(
    (isReady: boolean) => socketService.setReady(roomId, userId, isReady),
    [roomId, userId],
  );

  const startGame = useCallback(
    () => socketService.startGame(roomId),
    [roomId],
  );

  const submitVote = useCallback(
    (choice: string) => {
      store.getState().setMyVote(choice);
      socketService.submitVote(roomId, userId, choice);
    },
    [roomId, userId],
  );

  return { setReady, startGame, submitVote };
}
