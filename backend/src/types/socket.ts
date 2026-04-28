import type { Socket } from 'socket.io';
import type { ChatMessagePayload } from './chat.js';

export interface ClientToServerEvents {
  'chat:message': (payload: { text: string }) => void;
  'chat:skip': () => void;
}

export interface ServerToClientEvents {
  'session:ready': (payload: { sessionId: string }) => void;
  'chat:searching': (payload: { reason: string }) => void;
  'chat:matched': (payload: { chatId: string }) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'chat:message_ack': (payload: ChatMessagePayload) => void;
  'chat:partner_disconnected': (payload: { reason: string }) => void;
  'chat:ended': (payload: { reason: string }) => void;
  'chat:error': (payload: { message: string }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  sessionId: string;
}

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
