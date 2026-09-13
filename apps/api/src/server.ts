import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { disconnectPrisma } from './lib/prisma.js';

const app = createApp();
const server = http.createServer(app);

server.listen(env.PORT, env.HOST, () => {
  logger.info(
    {
      nodeEnv: env.NODE_ENV,
      host: env.HOST,
      port: env.PORT,
      corsOrigins: env.CORS_ORIGINS,
    },
    `Draftone API server listening on http://${env.HOST}:${env.PORT}`
  );
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, initiating graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error during HTTP server closure');
    }

    try {
      await disconnectPrisma();
      logger.info('Database connection closed cleanly.');
    } catch (dbErr) {
      logger.error({ err: dbErr }, 'Error disconnecting from database');
    }

    logger.info('Graceful shutdown completed. Process exiting.');
    process.exit(err ? 1 : 0);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});