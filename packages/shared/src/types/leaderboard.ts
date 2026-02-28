import { UUID } from './common';

export type LeaderboardType = 'global' | 'weekly' | 'season';

export interface LeaderboardEntry {
  rank: number;
  userId: UUID;
  username: string;
  avatarUrl: string | null;
  score: number;
  gamesPlayed: number;
  isPremium: boolean;
}

export interface LeaderboardPage {
  type: LeaderboardType;
  seasonId?: string;
  weekNumber?: number;
  entries: LeaderboardEntry[];
  page: number;
  limit: number;
  total: number;
}

export interface UserRank {
  type: LeaderboardType;
  userId: UUID;
  rank: number;
  score: number;
  totalPlayers: number;
  percentile: number;
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  rewards: SeasonReward[];
}

export interface SeasonReward {
  minRank: number;
  maxRank: number;
  reward: string;
  description: string;
}
