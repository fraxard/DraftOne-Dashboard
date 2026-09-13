import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();
const server = http.createServer(app);

server.listen(env.PORT, env.HOST, () => {
  logger.info(`Draftone API server listening on http://${env.HOST}:${env.PORT}`, {
    nodeEnv: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    corsOrigins: env.CORS_ORIGINS,
  });
});

let isShuttingDown = false;

function gracefulShutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, initiating graceful shutdown...`);

  server.close((err) => {
    if (err) {
      logger.error('Error during HTTP server shutdown:', { error: err });
      process.exit(1);
    }
    logger.info('HTTP server closed cleanly. Process exiting.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s, forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', { error: reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error });
  process.exit(1);
});