import api from './api';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  score: number;
  gamesWon: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  userRank?: LeaderboardEntry;
}

const leaderboardService = {
  getGlobal: async (
    page = 1,
    limit = 50
  ): Promise<LeaderboardResponse> => {
    const response = await api.get<LeaderboardResponse>('/v1/leaderboard', {
      params: { page, limit },
    });
    return response.data;
  },

  getWeekly: async (
    page = 1,
    limit = 50
  ): Promise<LeaderboardResponse> => {
    const response = await api.get<LeaderboardResponse>('/v1/leaderboard/weekly', {
      params: { page, limit },
    });
    return response.data;
  },

  getFriends: async (): Promise<LeaderboardResponse> => {
    const response = await api.get<LeaderboardResponse>('/v1/leaderboard/friends');
    return response.data;
  },

  getPlayerRank: async (userId: string): Promise<LeaderboardEntry | null> => {
    const response = await api.get<LeaderboardEntry>(`/v1/leaderboard/player/${userId}`);
    return response.data;
  },
};

export default leaderboardService;
