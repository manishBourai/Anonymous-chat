import { createHash, randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { KAFKA_EVENT_TYPES } from '../../constants/events.js';
import { kafkaProducer } from '../../lib/kafka.js';
import { prisma } from '../../lib/prisma.js';
import type { ChatEventPayload, ChatMessagePayload } from '../../types/chat.js';
import { logger } from '../../utils/logger.js';
import { consumeMessageToken } from '../rate-limit/rate-limit.service.js';
import { getSession } from '../session/session.service.js';

export function buildChatId(sessionA: string, sessionB: string) {
  const [first, second] = [sessionA, sessionB].sort();
  return createHash('sha256').update(`${first}:${second}`).digest('hex');
}

export async function queueMessage(sessionId: string, text: string) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error('Message cannot be empty');
  }

  if (normalizedText.length > env.MESSAGE_MAX_LENGTH) {
    throw new Error(`Message exceeds ${env.MESSAGE_MAX_LENGTH} characters`);
  }

  const allowed = await consumeMessageToken(sessionId);

  if (!allowed) {
    throw new Error('Rate limit exceeded. Slow down a little.');
  }

  const session = await getSession(sessionId);

  if (!session?.partnerId) {
    throw new Error('No active partner found');
  }

  const payload: ChatMessagePayload = {
    id: randomUUID(),
    chatId: buildChatId(sessionId, session.partnerId),
    senderSessionId: sessionId,
    recipientSessionId: session.partnerId,
    text: normalizedText,
    createdAt: new Date().toISOString(),
  };

  await prisma.chatSession.upsert({
    where: { chatId: payload.chatId },
    create: {
      chatId: payload.chatId,
      userOneId: sessionId < session.partnerId ? sessionId : session.partnerId,
      userTwoId: sessionId < session.partnerId ? session.partnerId : sessionId,
      startedAt: new Date(payload.createdAt),
    },
    update: {
      messageCount: {
        increment: 1,
      },
    },
  });

  await kafkaProducer.send({
    topic: env.KAFKA_CHAT_MESSAGES_TOPIC,
    messages: [
      {
        key: payload.chatId,
        value: JSON.stringify(payload),
      },
    ],
  });

  return payload;
}

export async function publishEvent(event: ChatEventPayload) {
  await kafkaProducer.send({
    topic: env.KAFKA_CHAT_EVENTS_TOPIC,
    messages: [
      {
        key: [...event.sessionIds].sort().join(':'),
        value: JSON.stringify(event),
      },
    ],
  });
}

export async function publishSearching(sessionId: string, reason: string) {
  await publishEvent({
    type: KAFKA_EVENT_TYPES.SEARCHING,
    sessionIds: [sessionId],
    reason,
    timestamp: new Date().toISOString(),
  });
}

export async function publishMatched(sessionIds: [string, string]) {
  await publishEvent({
    type: KAFKA_EVENT_TYPES.MATCHED,
    sessionIds,
    chatId: buildChatId(sessionIds[0], sessionIds[1]),
    timestamp: new Date().toISOString(),
  });
}

export async function publishEnded(sessionIds: string[], reason: string) {
  await publishEvent({
    type: KAFKA_EVENT_TYPES.ENDED,
    sessionIds,
    reason,
    timestamp: new Date().toISOString(),
  });
}

export async function publishPartnerDisconnected(sessionId: string, reason: string) {
  await publishEvent({
    type: KAFKA_EVENT_TYPES.PARTNER_DISCONNECTED,
    sessionIds: [sessionId],
    reason,
    timestamp: new Date().toISOString(),
  });
}

export async function persistDeliveredMessage(message: ChatMessagePayload) {
  try {
    await prisma.chatMessage.create({
      data: {
        id: message.id,
        chatId: message.chatId,
        senderId: message.senderSessionId,
        recipientId: message.recipientSessionId,
        body: message.text,
        createdAt: new Date(message.createdAt),
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to persist chat message', error);
  }
}
