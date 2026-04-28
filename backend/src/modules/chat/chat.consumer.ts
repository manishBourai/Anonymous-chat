import { env } from '../../config/env.js';
import { KAFKA_EVENT_TYPES, SERVER_EVENTS } from '../../constants/events.js';
import { createKafkaConsumer } from '../../lib/kafka.js';
import type { ChatEventPayload, ChatMessagePayload } from '../../types/chat.js';
import { logger } from '../../utils/logger.js';
import { setSessionStatus } from '../session/session.service.js';
import { getSocket } from '../../socket/socket.registry.js';

export async function startChatConsumer() {
  const consumer = createKafkaConsumer(`chat-server-${env.SERVER_ID}`);

  await consumer.connect();
  await consumer.subscribe({ topic: env.KAFKA_CHAT_MESSAGES_TOPIC, fromBeginning: false });
  await consumer.subscribe({ topic: env.KAFKA_CHAT_EVENTS_TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const raw = message.value?.toString();

      if (!raw) {
        return;
      }

      if (topic === env.KAFKA_CHAT_MESSAGES_TOPIC) {
        return;
      }

      const event = JSON.parse(raw) as ChatEventPayload;
      await handleChatEvent(event);
    },
  });

  return consumer;
}

async function handleChatEvent(event: ChatEventPayload) {
  switch (event.type) {
    case KAFKA_EVENT_TYPES.SEARCHING: {
      for (const sessionId of event.sessionIds) {
        getSocket(sessionId)?.emit(SERVER_EVENTS.CHAT_SEARCHING, {
          reason: event.reason ?? 'Searching for a new partner',
        });
      }
      break;
    }
    case KAFKA_EVENT_TYPES.MATCHED: {
      if (!event.chatId) {
        logger.warn('Matched event missing chatId', event);
        return;
      }

      for (const sessionId of event.sessionIds) {
        getSocket(sessionId)?.emit(SERVER_EVENTS.CHAT_MATCHED, {
          chatId: event.chatId,
        });
      }
      break;
    }
    case KAFKA_EVENT_TYPES.ENDED: {
      for (const sessionId of event.sessionIds) {
        getSocket(sessionId)?.emit(SERVER_EVENTS.CHAT_ENDED, {
          reason: event.reason ?? 'Chat ended',
        });
      }
      break;
    }
    case KAFKA_EVENT_TYPES.PARTNER_DISCONNECTED: {
      const [sessionId] = event.sessionIds;

      if (!sessionId) {
        return;
      }

      getSocket(sessionId)?.emit(SERVER_EVENTS.CHAT_PARTNER_DISCONNECTED, {
        reason: event.reason ?? 'Partner disconnected',
      });
      await setSessionStatus(sessionId, 'searching');
      break;
    }
    default:
      logger.warn('Unhandled event received', event);
  }
}
