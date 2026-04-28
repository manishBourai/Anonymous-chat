import { env } from '../../config/env.js';
import { redis } from '../../lib/redis.js';

function getRateLimitKey(sessionId: string) {
  return `rate-limit:${sessionId}`;
}

export async function consumeMessageToken(sessionId: string) {
  const key = getRateLimitKey(sessionId);
  const now = Date.now();
  const windowStart = now - env.MESSAGE_RATE_WINDOW_MS;

  const transaction = redis.multi();
  transaction.zremrangebyscore(key, 0, windowStart);
  transaction.zcard(key);

  const result = await transaction.exec();
  const currentCount = Number(result?.[1]?.[1] ?? 0);

  if (currentCount >= env.MESSAGE_RATE_LIMIT) {
    return false;
  }

  await redis
    .multi()
    .zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`)
    .expire(key, Math.ceil(env.MESSAGE_RATE_WINDOW_MS / 1000))
    .exec();

  return true;
}
