import 'dotenv/config';
import { createServer } from 'node:http';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { connectKafkaInfrastructure, disconnectKafkaInfrastructure } from './lib/kafka.js';
import { disconnectPrisma } from './lib/prisma.js';
import { disconnectRedis } from './lib/redis.js';
import { startChatConsumer } from './modules/chat/chat.consumer.js';
import { createSocketServer } from './socket/server.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  await connectKafkaInfrastructure();
  const consumer = await startChatConsumer();

  const app = buildApp();
  const server = createServer(app);

  createSocketServer(server);

  server.listen(env.PORT, () => {
    logger.info(`Backend listening on http://localhost:${env.PORT} as ${env.SERVER_ID}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    server.close();
    await consumer.disconnect();
    await disconnectKafkaInfrastructure();
    await disconnectRedis();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap().catch((error: unknown) => {
  logger.error('Failed to bootstrap backend', error);
  process.exit(1);
});
