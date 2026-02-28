import api from './api';

export interface Room {
  id: string;
  gameMode: string;
  hostId: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'in_progress' | 'finished';
  createdAt: string;
}

export interface CreateRoomResponse {
  room: Room;
}

export interface JoinRoomResponse {
  room: Room;
}

const gameService = {
  getAvailableRooms: async (): Promise<Room[]> => {
    const response = await api.get<Room[]>('/games/rooms');
    return response.data;
  },

  createRoom: async (gameMode: string): Promise<CreateRoomResponse> => {
    const response = await api.post<CreateRoomResponse>('/games/rooms', {
      gameMode,
    });
    return response.data;
  },

  joinRoom: async (roomId: string): Promise<JoinRoomResponse> => {
    const response = await api.post<JoinRoomResponse>(
      `/games/rooms/${roomId}/join`,
    );
    return response.data;
  },
};

export default gameService;
