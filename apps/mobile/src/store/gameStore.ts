import { create } from 'zustand';

export interface Player {
  userId: string;
  username?: string;
  displayName?: string;
  joinedAt: number;
  isReady: boolean;
  score: number;
  isConnected: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  votingPhaseDurationSec: number;
  resultsPhaseDurationSec: number;
  isPrivate: boolean;
}

export interface RoomState {
  id: string;
  hostId: string;
  gameMode: string;
  status: 'waiting' | 'active' | 'finished';
  settings: RoomSettings;
  players: Record<string, Player>;
  currentRound: number;
  totalRounds: number;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}

export interface GameResult {
  userId: string;
  score: number;
}

type GamePhase = 'idle' | 'lobby' | 'voting' | 'results' | 'transition' | 'finished';

interface GameState {
  room: RoomState | null;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  votingDuration: number;
  resultsDuration: number;
  votesReceived: number;
  myVote: string | null;
  voteConfirmed: boolean;
  finalResults: GameResult[];
  error: string | null;
}

interface GameActions {
  setRoom: (room: RoomState) => void;
  updatePlayers: (players: Record<string, Player>) => void;
  setPhase: (phase: GamePhase) => void;
  setRound: (round: number, totalRounds: number) => void;
  setVotingDuration: (sec: number) => void;
  incrementVotesReceived: () => void;
  setMyVote: (choice: string) => void;
  confirmVote: () => void;
  setFinalResults: (results: GameResult[]) => void;
  setError: (error: string | null) => void;
  playerJoined: (userId: string) => void;
  playerLeft: (userId: string, newHostId?: string) => void;
  playerReadyChanged: (userId: string, isReady: boolean, players: Record<string, Player>) => void;
  gameStarted: (data: { totalRounds: number; currentRound: number }) => void;
  roundStarted: (data: { round: number; totalRounds: number; votingPhaseDurationSec: number }) => void;
  resetRound: () => void;
  reset: () => void;
}

type GameStore = GameState & GameActions;

const initialState: GameState = {
  room: null,
  phase: 'idle',
  currentRound: 0,
  totalRounds: 0,
  votingDuration: 30,
  resultsDuration: 10,
  votesReceived: 0,
  myVote: null,
  voteConfirmed: false,
  finalResults: [],
  error: null,
};

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,

  setRoom: (room) => set({ room, phase: room.status === 'waiting' ? 'lobby' : get().phase }),

  updatePlayers: (players) => {
    const { room } = get();
    if (room) {
      set({ room: { ...room, players } });
    }
  },

  setPhase: (phase) => set({ phase }),

  setRound: (round, totalRounds) => set({ currentRound: round, totalRounds }),

  setVotingDuration: (sec) => set({ votingDuration: sec }),

  incrementVotesReceived: () => set((s) => ({ votesReceived: s.votesReceived + 1 })),

  setMyVote: (choice) => set({ myVote: choice }),

  confirmVote: () => set({ voteConfirmed: true }),

  setFinalResults: (results) => set({ finalResults: results, phase: 'finished' }),

  setError: (error) => set({ error }),

  playerJoined: (userId) => {
    const { room } = get();
    if (!room) return;
    const players = { ...room.players };
    if (!players[userId]) {
      players[userId] = {
        userId,
        joinedAt: Date.now(),
        isReady: false,
        score: 0,
        isConnected: true,
      };
    }
    set({ room: { ...room, players } });
  },

  playerLeft: (userId, newHostId) => {
    const { room } = get();
    if (!room) return;
    const players = { ...room.players };
    delete players[userId];
    set({
      room: {
        ...room,
        players,
        hostId: newHostId || room.hostId,
      },
    });
  },

  playerReadyChanged: (userId, isReady, players) => {
    const { room } = get();
    if (room) {
      set({ room: { ...room, players } });
    }
  },

  gameStarted: ({ totalRounds, currentRound }) => {
    const { room } = get();
    if (room) {
      set({
        room: { ...room, status: 'active', startedAt: Date.now() },
        phase: 'voting',
        currentRound,
        totalRounds,
      });
    }
  },

  roundStarted: ({ round, totalRounds, votingPhaseDurationSec }) => {
    set({
      phase: 'voting',
      currentRound: round,
      totalRounds,
      votingDuration: votingPhaseDurationSec,
      votesReceived: 0,
      myVote: null,
      voteConfirmed: false,
    });
  },

  resetRound: () => set({ myVote: null, voteConfirmed: false, votesReceived: 0 }),

  reset: () => set(initialState),
}));
