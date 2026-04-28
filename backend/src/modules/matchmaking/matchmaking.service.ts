import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { redis } from '../../lib/redis.js';
import {
  publishEnded,
  publishMatched,
  publishPartnerDisconnected,
  publishSearching,
} from '../chat/chat.service.js';
import {
  assignPartners,
  clearPartnership,
  disconnectSocket,
  getSession,
  updateSession,
} from '../session/session.service.js';

const queueKey = 'matchmaking:queue';
const queueMembersKey = 'matchmaking:queue:members';
const lockKey = 'matchmaking:lock';

export async function enqueue(sessionId: string, reason = 'Searching for a new partner') {
  const session = await getSession(sessionId);

  if (!session?.currentSocketId) {
    return;
  }

  const alreadyQueued = await redis.sismember(queueMembersKey, sessionId);

  if (alreadyQueued) {
    await publishSearching(sessionId, reason);
    return;
  }

  await updateSession(sessionId, {
    status: 'searching',
    partnerId: null,
  });

  await redis.multi().sadd(queueMembersKey, sessionId).rpush(queueKey, sessionId).exec();
  await publishSearching(sessionId, reason);
  await tryMatch();
}

export async function skipCurrentChat(sessionId: string) {
  const session = await getSession(sessionId);

  if (!session) {
    return;
  }

  const partnerId = session.partnerId;
  await removeFromQueue(sessionId);
  await clearPartnership(sessionId);

  if (partnerId) {
    await removeFromQueue(partnerId);
    await clearPartnership(partnerId);
    await publishEnded([sessionId, partnerId], 'Stranger skipped the chat');
    await Promise.all([
      enqueue(sessionId, 'Finding a new stranger...'),
      enqueue(partnerId, 'Partner skipped. Finding someone new...'),
    ]);
    return;
  }

  await enqueue(sessionId, 'Finding a new stranger...');
}

export async function handleDisconnect(sessionId: string, socketId: string) {
  const session = await disconnectSocket(sessionId, socketId);

  if (!session) {
    return;
  }

  await removeFromQueue(sessionId);

  if (!session.partnerId) {
    return;
  }

  const partnerId = session.partnerId;
  await clearPartnership(partnerId);
  await publishPartnerDisconnected(partnerId, 'Partner disconnected. Reconnecting you to the queue...');
  await enqueue(partnerId, 'Searching for someone new...');
}

async function tryMatch() {
  const lockValue = randomUUID();
  const lockAcquired = await redis.set(lockKey, lockValue, 'EX', env.MATCHMAKING_LOCK_SECONDS, 'NX');

  if (!lockAcquired) {
    return;
  }

  try {
    while (true) {
      const first = await popEligibleSession();

      if (!first) {
        break;
      }

      const second = await popEligibleSession(first);

      if (!second) {
        await requeueRaw(first);
        break;
      }

      await assignPartners(first, second);
      await publishMatched([first, second]);
    }
  } finally {
    const currentLockValue = await redis.get(lockKey);

    if (currentLockValue === lockValue) {
      await redis.del(lockKey);
    }
  }
}

async function popEligibleSession(excludedSessionId?: string) {
  while (true) {
    const sessionId = await redis.lpop(queueKey);

    if (!sessionId) {
      return null;
    }

    await redis.srem(queueMembersKey, sessionId);

    if (excludedSessionId && sessionId === excludedSessionId) {
      continue;
    }

    const session = await getSession(sessionId);

    if (!session?.currentSocketId) {
      continue;
    }

    if (session.status === 'chatting') {
      continue;
    }

    return sessionId;
  }
}

async function requeueRaw(sessionId: string) {
  await redis.multi().sadd(queueMembersKey, sessionId).rpush(queueKey, sessionId).exec();
}

async function removeFromQueue(sessionId: string) {
  await redis.srem(queueMembersKey, sessionId);
}
