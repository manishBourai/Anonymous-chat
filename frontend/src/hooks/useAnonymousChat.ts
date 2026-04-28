import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { ChatMessage, ChatStatus, ServerChatMessage } from '../types/chat'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8080'
const SESSION_STORAGE_KEY = 'anonymous-chat-session-id'

function mapIncomingMessage(message: ServerChatMessage, sender: 'self' | 'partner'): ChatMessage {
  return {
    id: message.id,
    text: message.text,
    sender,
    createdAt: message.createdAt,
  }
}

export function useAnonymousChat() {
  const socketRef = useRef<Socket | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<ChatStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const persistedSessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY)

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: persistedSessionId ? { sessionId: persistedSessionId } : {},
    })

    socketRef.current = socket

    socket.on('session:ready', ({ sessionId: nextSessionId }) => {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextSessionId)
      setSessionId(nextSessionId)
      setStatus('searching')
      setError(null)
    })

    socket.on('chat:searching', () => {
      setStatus('searching')
      setError(null)
    })

    socket.on('chat:matched', () => {
      setStatus('connected')
      setMessages([])
      setError(null)
    })

    socket.on('chat:message', (message: ServerChatMessage) => {
      setMessages((current) => [...current, mapIncomingMessage(message, 'partner')])
    })

    socket.on('chat:message_ack', (message: ServerChatMessage) => {
      setMessages((current) => [...current, mapIncomingMessage(message, 'self')])
    })

    socket.on('chat:partner_disconnected', ({ reason }: { reason: string }) => {
      setStatus('disconnected')
      setError(reason)
    })

    socket.on('chat:ended', ({ reason }: { reason: string }) => {
      setStatus('searching')
      setError(reason)
    })

    socket.on('chat:error', ({ message }: { message: string }) => {
      setError(message)
    })

    socket.on('disconnect', () => {
      setStatus('disconnected')
      setError('Connection lost. Trying to reconnect...')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const sendMessage = (text: string) => {
    socketRef.current?.emit('chat:message', { text })
  }

  const skipChat = () => {
    socketRef.current?.emit('chat:skip')
  }

  return {
    sessionId,
    status,
    error,
    messages,
    isConnected: status === 'connected',
    isBusy: status === 'connected' || status === 'searching',
    sendMessage,
    skipChat,
  }
}
