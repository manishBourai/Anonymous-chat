import type { AppSocket } from '../types/socket.js';

const sockets = new Map<string, AppSocket>();

export function attachSocket(sessionId: string, socket: AppSocket) {
  sockets.set(sessionId, socket);
}

export function detachSocket(sessionId: string, socketId: string) {
  const current = sockets.get(sessionId);

  if (current?.id === socketId) {
    sockets.delete(sessionId);
  }
}

export function getSocket(sessionId: string) {
  return sockets.get(sessionId);
}
