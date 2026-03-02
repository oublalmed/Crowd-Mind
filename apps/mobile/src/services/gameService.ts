import api from './api';
import type { RoomState } from '../store/gameStore';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const gameService = {
  getAvailableRooms: async (): Promise<RoomState[]> => {
    const response = await api.get<ApiResponse<RoomState[]>>('/api/v1/games/rooms');
    return response.data.data;
  },

  createRoom: async (
    hostId: string,
    gameMode: string,
    settings?: {
      maxPlayers?: number;
      rounds?: number;
      votingPhaseDurationSec?: number;
      isPrivate?: boolean;
    },
  ): Promise<RoomState> => {
    const response = await api.post<ApiResponse<RoomState>>('/api/v1/games/rooms', {
      hostId,
      gameMode,
      settings: {
        maxPlayers: settings?.maxPlayers ?? 8,
        rounds: settings?.rounds ?? 5,
        votingPhaseDurationSec: settings?.votingPhaseDurationSec ?? 30,
        resultsPhaseDurationSec: 10,
        isPrivate: settings?.isPrivate ?? false,
      },
    });
    return response.data.data;
  },

  joinRoom: async (roomId: string, userId: string): Promise<RoomState> => {
    const response = await api.post<ApiResponse<RoomState>>(
      `/api/v1/games/rooms/${roomId}/join`,
      { userId },
    );
    return response.data.data;
  },

  getRoomState: async (roomId: string): Promise<RoomState> => {
    const response = await api.get<ApiResponse<RoomState>>(
      `/api/v1/games/rooms/${roomId}`,
    );
    return response.data.data;
  },
};

export default gameService;
