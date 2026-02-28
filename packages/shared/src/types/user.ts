import { Timestamps, UUID } from './common';

export interface User extends Timestamps {
  id: UUID;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  skillRating: number;
  level: number;
  xp: number;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  provider: AuthProvider;
  providerId: string | null;
  preferences: UserPreferences;
  stats: UserStats;
}

export interface UserPreferences {
  language: string;
  notifications: NotificationPreferences;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface NotificationPreferences {
  gameInvites: boolean;
  matchFound: boolean;
  tournamentStart: boolean;
  dailyChallenge: boolean;
  friendActivity: boolean;
  marketing: boolean;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  totalScore: number;
  averageScore: number;
}

export interface UserProfile {
  id: UUID;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  level: number;
  stats: UserStats;
  isPremium: boolean;
}

export interface FriendRequest {
  id: UUID;
  fromUserId: UUID;
  toUserId: UUID;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export type AuthProvider = 'email' | 'google' | 'apple';

export interface CreateUserDto {
  email: string;
  username: string;
  displayName: string;
  password?: string;
  provider: AuthProvider;
  providerId?: string;
}

export interface UpdateUserDto {
  displayName?: string;
  bio?: string;
  preferences?: Partial<UserPreferences>;
}
