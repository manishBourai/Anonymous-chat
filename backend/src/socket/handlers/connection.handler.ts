import { CLIENT_EVENTS, SERVER_EVENTS } from '../../constants/events.js';
import { buildChatId, persistDeliveredMessage, queueMessage } from '../../modules/chat/chat.service.js';
import { enqueue, handleDisconnect, skipCurrentChat } from '../../modules/matchmaking/matchmaking.service.js';
import { registerSocket } from '../../modules/session/session.service.js';
import type { AppSocket } from '../../types/socket.js';
import { attachSocket, detachSocket, getSocket } from '../socket.registry.js';

export function registerConnectionHandler(socket: AppSocket) {
  void (async () => {
    const existingSessionId =
      typeof socket.handshake.auth.sessionId === 'string' ? socket.handshake.auth.sessionId : null;

    const session = await registerSocket(existingSessionId, socket.id);
    socket.data.sessionId = session.sessionId;
    attachSocket(session.sessionId, socket);

    socket.emit(SERVER_EVENTS.SESSION_READY, {
      sessionId: session.sessionId,
    });

    if (session.partnerId) {
      socket.emit(SERVER_EVENTS.CHAT_MATCHED, {
        chatId: buildChatId(session.sessionId, session.partnerId),
      });
    } else {
      await enqueue(session.sessionId);
    }
  })().catch((error: unknown) => {
    socket.emit(SERVER_EVENTS.CHAT_ERROR, {
      message: error instanceof Error ? error.message : 'Unable to initialize session',
    });
  });

  socket.on(CLIENT_EVENTS.CHAT_MESSAGE, async (payload) => {
    try {
      const message = await queueMessage(socket.data.sessionId, payload.text);
      socket.emit(SERVER_EVENTS.CHAT_MESSAGE_ACK, message);
      getSocket(message.recipientSessionId)?.emit(SERVER_EVENTS.CHAT_MESSAGE, message);
      await persistDeliveredMessage(message);
    } catch (error: unknown) {
      socket.emit(SERVER_EVENTS.CHAT_ERROR, {
        message: error instanceof Error ? error.message : 'Unable to send message',
      });
    }
  });

  socket.on(CLIENT_EVENTS.CHAT_SKIP, async () => {
    try {
      await skipCurrentChat(socket.data.sessionId);
    } catch (error: unknown) {
      socket.emit(SERVER_EVENTS.CHAT_ERROR, {
        message: error instanceof Error ? error.message : 'Unable to skip chat',
      });
    }
  });

  socket.on('disconnect', () => {
    detachSocket(socket.data.sessionId, socket.id);
    void handleDisconnect(socket.data.sessionId, socket.id);
  });
}
