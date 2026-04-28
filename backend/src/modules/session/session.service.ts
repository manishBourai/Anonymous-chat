import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { redis } from '../../lib/redis.js';
import type { SessionRecord, SessionStatus } from '../../types/chat.js';

function getSessionKey(sessionId: string) {
  return `session:${sessionId}`;
}

function getSocketKey(socketId: string) {
  return `socket:${socketId}`;
}

export async function registerSocket(existingSessionId: string | null, socketId: string) {
  const sessionId = existingSessionId?.trim() || randomUUID();
  const current = await getSession(sessionId);

  const record: SessionRecord = {
    sessionId,
    currentSocketId: socketId,
    serverId: env.SERVER_ID,
    status: current?.status ?? 'idle',
    partnerId: current?.partnerId ?? null,
    updatedAt: new Date().toISOString(),
  };

  await redis
    .multi()
    .set(getSessionKey(sessionId), JSON.stringify(record), 'EX', env.SESSION_TTL_SECONDS)
    .set(getSocketKey(socketId), sessionId, 'EX', env.SESSION_TTL_SECONDS)
    .exec();

  return record;
}

export async function getSession(sessionId: string) {
  const raw = await redis.get(getSessionKey(sessionId));

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as SessionRecord;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<Pick<SessionRecord, 'status' | 'partnerId' | 'currentSocketId'>>,
) {
  const current = await getSession(sessionId);

  if (!current) {
    return null;
  }

  const next: SessionRecord = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(getSessionKey(sessionId), JSON.stringify(next), 'EX', env.SESSION_TTL_SECONDS);

  return next;
}

export async function setSessionStatus(sessionId: string, status: SessionStatus) {
  return updateSession(sessionId, { status });
}

export async function assignPartners(sessionId: string, partnerId: string) {
  await Promise.all([
    updateSession(sessionId, { status: 'chatting', partnerId }),
    updateSession(partnerId, { status: 'chatting', partnerId: sessionId }),
  ]);
}

export async function clearPartnership(sessionId: string) {
  return updateSession(sessionId, { partnerId: null, status: 'idle' });
}

export async function disconnectSocket(sessionId: string, socketId: string) {
  const current = await getSession(sessionId);

  if (!current || current.currentSocketId !== socketId) {
    await redis.del(getSocketKey(socketId));
    return current;
  }

  const next: SessionRecord = {
    ...current,
    currentSocketId: null,
    status: 'disconnected',
    updatedAt: new Date().toISOString(),
  };

  await redis
    .multi()
    .set(getSessionKey(sessionId), JSON.stringify(next), 'EX', env.SESSION_TTL_SECONDS)
    .del(getSocketKey(socketId))
    .exec();

  return next;
}
