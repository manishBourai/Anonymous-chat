import './App.css'
import { ChatComposer } from './components/ChatComposer'
import { MessageList } from './components/MessageList'
import { StatusBadge } from './components/StatusBadge'
import { useAnonymousChat } from './hooks/useAnonymousChat'

function App() {
  const {
    status,
    messages,
    isConnected,
    isBusy,
    error,
    sessionId,
    sendMessage,
    skipChat,
  } = useAnonymousChat()

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Anonymous Random Text Chat</p>
        <h1>Meet a stranger. Type fast. Stay ephemeral.</h1>
        <p className="hero-copy">
          This demo uses WebSockets for real-time delivery, Redis for distributed matchmaking and
          rate limits, Kafka for event fan-out, and PostgreSQL for optional persistence.
        </p>

        <div className="meta-row">
          <StatusBadge status={status} />
          <span className="session-pill">Session: {sessionId ? sessionId.slice(0, 8) : '...'}</span>
        </div>

        <div className="status-card">
          <p className="status-title">Current state</p>
          <p className="status-copy">
            {status === 'connecting' && 'Connecting to the real-time gateway.'}
            {status === 'searching' && 'Searching the Redis queue for the next available stranger.'}
            {status === 'connected' && 'You are connected. Messages are streaming over Kafka-backed events.'}
            {status === 'disconnected' && 'The partner left. We will place you back into the queue automatically.'}
          </p>
          {error ? <p className="error-copy">{error}</p> : null}
        </div>
      </section>

      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <p className="chat-label">Live chat</p>
            <h2>Anonymous conversation</h2>
          </div>
          <button type="button" className="ghost-button" onClick={skipChat} disabled={!isBusy}>
            Skip
          </button>
        </header>

        <MessageList messages={messages} status={status} />

        <ChatComposer onSend={sendMessage} disabled={!isConnected} />
      </section>
    </main>
  )
}

export default App
