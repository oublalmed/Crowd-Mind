import { UUID } from './common';

export type GameMode = 'crowd_mind' | 'speed_vote' | 'debate';
export type GameStatus = 'waiting' | 'starting' | 'in_progress' | 'round_end' | 'completed' | 'cancelled';
export type RoundPhase = 'question' | 'voting' | 'reveal' | 'scoring';

export interface GameRoom {
  id: UUID;
  mode: GameMode;
  status: GameStatus;
  hostId: UUID;
  players: GamePlayer[];
  currentRound: number;
  totalRounds: number;
  settings: GameSettings;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface GamePlayer {
  userId: UUID;
  username: string;
  avatarUrl: string | null;
  score: number;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: string;
}

export interface GameSettings {
  maxPlayers: number;
  minPlayers: number;
  roundTimeSeconds: number;
  totalRounds: number;
  isPrivate: boolean;
  allowBotBackfill: boolean;
}

export interface GameRound {
  roundNumber: number;
  phase: RoundPhase;
  question: GameQuestion;
  votes: Vote[];
  results: RoundResult | null;
  startedAt: string;
  endsAt: string;
}

export interface GameQuestion {
  id: UUID;
  text: string;
  category: string;
  options: string[];
}

export interface Vote {
  userId: UUID;
  optionIndex: number;
  timestamp: string;
}

export interface RoundResult {
  majorityOption: number;
  voteCounts: Record<number, number>;
  playerScores: Record<UUID, number>;
}

export interface GameResult {
  gameId: UUID;
  mode: GameMode;
  players: GamePlayerResult[];
  totalRounds: number;
  duration: number;
  completedAt: string;
}

export interface GamePlayerResult {
  userId: UUID;
  username: string;
  finalScore: number;
  rank: number;
  ratingChange: number;
  xpEarned: number;
}

export interface MatchmakingRequest {
  userId: UUID;
  gameMode: GameMode;
  skillRating: number;
  timestamp: string;
}

export interface MatchmakingResult {
  roomId: UUID;
  players: UUID[];
  gameMode: GameMode;
}

// WebSocket event types
export enum GameEvent {
  JOIN_ROOM = 'game:join_room',
  LEAVE_ROOM = 'game:leave_room',
  PLAYER_JOINED = 'game:player_joined',
  PLAYER_LEFT = 'game:player_left',
  PLAYER_READY = 'game:player_ready',
  GAME_STARTING = 'game:starting',
  ROUND_START = 'game:round_start',
  SUBMIT_VOTE = 'game:submit_vote',
  VOTE_RECEIVED = 'game:vote_received',
  ROUND_END = 'game:round_end',
  GAME_END = 'game:game_end',
  ERROR = 'game:error',
  MATCHMAKING_JOINED = 'matchmaking:joined',
  MATCHMAKING_FOUND = 'matchmaking:found',
  MATCHMAKING_CANCELLED = 'matchmaking:cancelled',
}
