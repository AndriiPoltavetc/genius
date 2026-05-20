import { io, type Socket } from 'socket.io-client';

import type { ClientToServerEvents, ServerToClientEvents } from '../../shared-types';

type GeniusSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GeniusSocket | null = null;

export function getSocket(): GeniusSocket {
  if (!socket) {
    throw new Error('Socket not initialized. Call initSocket() first.');
  }
  return socket;
}

export function initSocket(token: string): GeniusSocket {
  if (socket?.connected) return socket;

  socket = io(import.meta.env['VITE_SOCKET_URL'] as string, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  }) as GeniusSocket;

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
