# Anonymous Random Text Chat System

This project is a full-stack anonymous 1-to-1 text chat system inspired by Omegle-style text chat.

Tech stack:
- Backend: Node.js, TypeScript, Express, Socket.IO
- Frontend: React, TypeScript, Vite
- Database: PostgreSQL with Prisma
- Cache / shared state: Redis
- Messaging / event stream: Kafka

Live URLs:
- Frontend: `http://anonymous-chat.bourai.online`
- Backend: `http://anonymous-chat-backend.bourai.online`

## Architecture Overview

The system is split into a React frontend and a real-time backend.

Frontend responsibilities:
- Open a WebSocket connection to the backend
- Store a temporary anonymous session id per browser tab
- Show chat states like searching, connected, and disconnected
- Send chat messages and skip requests

Backend responsibilities:
- Create anonymous sessions when a socket connects
- Put unmatched users into a Redis-backed matchmaking queue
- Pair two users into one active chat
- Validate and persist messages
- Notify clients about chat lifecycle events

Infrastructure responsibilities:
- Redis stores short-lived session state, matchmaking queue membership, and message rate limit counters
- Kafka carries chat lifecycle events such as searching, matched, ended, and partner disconnected
- PostgreSQL stores chat sessions and chat messages for optional persistence

Current backend shape:
- `backend/src/index.ts` starts Express, Socket.IO, Kafka producer setup, and the Kafka event consumer
- `backend/src/socket/handlers/connection.handler.ts` handles connect, send message, skip, and disconnect
- `backend/src/modules/matchmaking/matchmaking.service.ts` manages the Redis queue and pairing logic
- `backend/src/modules/chat/chat.service.ts` validates messages, writes persistence metadata, and publishes Kafka events
- `backend/src/modules/chat/chat.consumer.ts` listens to Kafka chat events and pushes state updates to connected sockets

## Matchmaking And Chat Flow

### 1. User connects

1. The frontend opens a Socket.IO connection.
2. The backend creates or restores a temporary session id.
3. The socket is registered in an in-memory socket map.
4. If the user does not already have a partner, they are added to the Redis matchmaking queue.

### 2. Matchmaking

1. `enqueue()` pushes the user into a Redis list and set.
2. `tryMatch()` acquires a small Redis lock so only one matcher pairs users at a time.
3. Two eligible waiting sessions are popped from the queue.
4. Both session records are updated to `chatting` with each other as partner ids.
5. A Kafka `matched` event is published.
6. The Kafka consumer emits `chat:matched` to both sockets.

### 3. Sending a message

1. The sender emits `chat:message`.
2. The backend validates:
   - message is not empty
   - message length is within the configured max
   - sender is within the Redis rate limit
   - sender currently has a partner
3. The backend creates a `chatId` from the two session ids.
4. The chat session metadata is upserted in PostgreSQL.
5. The message payload is published to Kafka.
6. The sender receives `chat:message_ack`.
7. The receiver currently gets the message through the live socket map immediately from the connection handler.
8. The message is stored in PostgreSQL.

### 4. Skip / end chat

1. The user emits `chat:skip`.
2. Both users are detached from the current chat state.
3. A Kafka `ended` event is published.
4. Both users are put back into the matchmaking queue.

### 5. Disconnect

1. The socket disconnects.
2. The backend removes the socket from the in-memory socket map.
3. If the user had a partner, that partner is notified through a Kafka `partner_disconnected` event.
4. The partner is re-queued for another match.

## Deployment Approach

This project is deployed on AWS ECS.

Deployed endpoints:
- Frontend: `http://anonymous-chat.bourai.online`
- Backend: `http://anonymous-chat-backend.bourai.online`

Deployment layout:
- The frontend is built as static assets and served behind Nginx.
- The backend runs as a Node.js service on ECS.
- PostgreSQL stores persistent chat data.
- Redis stores matchmaking state, short-lived sessions, and rate-limit counters.
- Kafka carries chat lifecycle events across the backend.

Typical ECS deployment flow:

1. Build the frontend and backend artifacts.
2. Package the backend into a Docker image and push it to a container registry.
3. Deploy the backend container to an ECS service.
4. Serve the frontend build through Nginx.
5. Route traffic using domain-based reverse proxy rules:
   - `anonymous-chat.bourai.online` -> frontend
   - `anonymous-chat-backend.bourai.online` -> backend
6. Configure backend environment variables for PostgreSQL, Redis, Kafka, port, and CORS.
7. Set the frontend `VITE_SOCKET_URL` to the backend public URL.

Environment variable references:
- Backend example: [backend/.env.example](/abs/c:/Users/mukul/Desktop/Anonymous-chate/backend/.env.example)
- Frontend example: [frontend/.env.example](/abs/c:/Users/mukul/Desktop/Anonymous-chate/frontend/.env.example)

Operational notes:
- The backend should allow `CORS_ORIGIN=http://anonymous-chat.bourai.online`.
- The frontend should use `VITE_SOCKET_URL=http://anonymous-chat-backend.bourai.online`.
- Redis remains the shared source of truth for matchmaking state.
- Kafka currently matters most for chat lifecycle events rather than message fanout.

## Known Limitations

- Message delivery is currently simplified. The receiver gets messages from the backend process's in-memory socket map, not from Kafka consumer fanout.
- Because of that simplification, message delivery is reliable only when both users are connected to the same backend instance.
- Kafka still receives the message payload, but the current consumer does not fan chat messages back out to sockets.
- The socket registry is in memory, so a backend restart drops live socket mappings.
- There is no authentication or abuse prevention beyond simple rate limiting and message length validation.
- Old anonymous session records can remain in Redis until TTL expiry.
- Chat persistence is write-through but there is no message replay API for reconnecting clients.
- The UI is intentionally minimal and does not yet include delivery indicators, timestamps in the view, or reconnect recovery.
- Running two chats in the same browser required per-tab session storage; this is already handled with `sessionStorage`, but old tabs may need refresh after code changes.

## Interview Summary

This system demonstrates:
- anonymous session handling
- Redis-based distributed matchmaking
- WebSocket-based real-time chat
- Kafka-backed event publishing
- PostgreSQL persistence with Prisma
- clean separation between frontend, backend, state management, and event flow

The current codebase is intentionally simplified so the core real-time flow is easier to explain in an interview or assignment walkthrough.
