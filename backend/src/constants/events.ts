export const CLIENT_EVENTS = {
  CHAT_MESSAGE: 'chat:message',
  CHAT_SKIP: 'chat:skip',
} as const;

export const SERVER_EVENTS = {
  SESSION_READY: 'session:ready',
  CHAT_SEARCHING: 'chat:searching',
  CHAT_MATCHED: 'chat:matched',
  CHAT_MESSAGE: 'chat:message',
  CHAT_MESSAGE_ACK: 'chat:message_ack',
  CHAT_PARTNER_DISCONNECTED: 'chat:partner_disconnected',
  CHAT_ENDED: 'chat:ended',
  CHAT_ERROR: 'chat:error',
} as const;

export const KAFKA_EVENT_TYPES = {
  SEARCHING: 'searching',
  MATCHED: 'matched',
  ENDED: 'ended',
  PARTNER_DISCONNECTED: 'partner_disconnected',
} as const;
