import type { ChatMessage, ChatStatus } from '../types/chat'

interface MessageListProps {
  messages: ChatMessage[]
  status: ChatStatus
}

export function MessageList({ messages, status }: MessageListProps) {
  if (!messages.length) {
    return (
      <div className="message-list">
        <div className="message-empty">
          <p>{status === 'connected' ? 'Your chat is live. Break the ice.' : 'Messages will appear here.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message-row ${message.sender === 'self' ? 'self' : 'partner'}`}
        >
          <div className="message-bubble">{message.text}</div>
        </div>
      ))}
    </div>
  )
}
