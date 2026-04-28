export type ChatStatus = 'connecting' | 'searching' | 'connected' | 'disconnected'

export interface ChatMessage {
  id: string
  text: string
  sender: 'self' | 'partner'
  createdAt: string
}

export interface ServerChatMessage {
  id: string
  chatId: string
  senderSessionId: string
  recipientSessionId: string
  text: string
  createdAt: string
}
