import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/anonymous_chat?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('anonymous-chat-backend'),
  KAFKA_CHAT_MESSAGES_TOPIC: z.string().default('chat-messages'),
  KAFKA_CHAT_EVENTS_TOPIC: z.string().default('chat-events'),
  SERVER_ID: z.string().default(randomUUID()),
  MESSAGE_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  MESSAGE_RATE_WINDOW_MS: z.coerce.number().int().positive().default(1000),
  MESSAGE_MAX_LENGTH: z.coerce.number().int().positive().default(500),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  MATCHMAKING_LOCK_SECONDS: z.coerce.number().int().positive().default(2),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

export const env = {
  ...parsed.data,
  KAFKA_BROKERS: parsed.data.KAFKA_BROKERS.split(',').map((value) => value.trim()),
};
