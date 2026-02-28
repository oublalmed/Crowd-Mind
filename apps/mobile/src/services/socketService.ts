import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:8000';

export interface VoteUpdate {
  roomId: string;
  roundId: string;
  votes: Record<string, number>;
  totalVotes: number;
}

export interface GameState {
  roomId: string;
  status: 'waiting' | 'countdown' | 'voting' | 'results' | 'finished';
  currentRound?: number;
  totalRounds?: number;
  roundData?: Record<string, unknown>;
  timeRemaining?: number;
}

export interface Player {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId: string): void {
    this.socket?.emit('room:join', { roomId });
  }

  leaveRoom(roomId: string): void {
    this.socket?.emit('room:leave', { roomId });
  }

  submitVote(roomId: string, roundId: string, choice: string): void {
    this.socket?.emit('vote:submit', { roomId, roundId, choice });
  }

  onVoteUpdate(callback: (data: VoteUpdate) => void): () => void {
    this.socket?.on('vote:update', callback);
    return () => {
      this.socket?.off('vote:update', callback);
    };
  }

  onGameStateChange(callback: (data: GameState) => void): () => void {
    this.socket?.on('game:state', callback);
    return () => {
      this.socket?.off('game:state', callback);
    };
  }

  onPlayerJoined(callback: (player: Player) => void): () => void {
    this.socket?.on('player:joined', callback);
    return () => {
      this.socket?.off('player:joined', callback);
    };
  }

  onPlayerLeft(callback: (player: Player) => void): () => void {
    this.socket?.on('player:left', callback);
    return () => {
      this.socket?.off('player:left', callback);
    };
  }
}

const socketService = new SocketService();
export default socketService;
