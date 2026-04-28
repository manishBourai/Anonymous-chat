import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { createHealthRouter } from './routes/health.route.js';

export function buildApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/', (_, response) => {
    response.json({
      service: 'anonymous-random-chat',
      status: 'ok',
      serverId: env.SERVER_ID,
    });
  });

  app.use('/health', createHealthRouter());

  return app;
}
