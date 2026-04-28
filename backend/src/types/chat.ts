export type SessionStatus = 'idle' | 'searching' | 'chatting' | 'disconnected';

export interface SessionRecord {
  sessionId: string;
  currentSocketId: string | null;
  serverId: string;
  status: SessionStatus;
  partnerId: string | null;
  updatedAt: string;
}

export interface ChatMessagePayload {
  id: string;
  chatId: string;
  senderSessionId: string;
  recipientSessionId: string;
  text: string;
  createdAt: string;
}

export type ChatEventType =
  | 'searching'
  | 'matched'
  | 'ended'
  | 'partner_disconnected';

export interface ChatEventPayload {
  type: ChatEventType;
  sessionIds: string[];
  chatId?: string;
  reason?: string;
  timestamp: string;
}
