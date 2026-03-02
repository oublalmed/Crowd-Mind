import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:8000';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      path: '/ws/game',
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

  getSocket(): Socket | null {
    return this.socket;
  }

  joinRoom(roomId: string, userId: string): void {
    this.socket?.emit('join-room', { roomId, userId });
  }

  leaveRoom(roomId: string, userId: string): void {
    this.socket?.emit('leave-room', { roomId, userId });
  }

  setReady(roomId: string, userId: string, isReady: boolean): void {
    this.socket?.emit('player-ready', { roomId, userId, isReady });
  }

  startGame(roomId: string): void {
    this.socket?.emit('start-game', { roomId });
  }

  submitVote(roomId: string, userId: string, choice: string): void {
    this.socket?.emit('submit-vote', { roomId, userId, choice });
  }

  nextRound(roomId: string): void {
    this.socket?.emit('next-round', { roomId });
  }

  on(event: string, callback: (...args: any[]) => void): () => void {
    this.socket?.on(event, callback);
    return () => {
      this.socket?.off(event, callback);
    };
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }
}

const socketService = new SocketService();
export default socketService;
