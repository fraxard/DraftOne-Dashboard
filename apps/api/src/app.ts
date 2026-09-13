import express, { type Application } from 'express';
import {
  configureBodyParsers,
  configureCookieParser,
  configureCors,
  configureHelmet,
} from './middleware/security.js';
import { requestLogger } from './middleware/request-logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.routes.js';

export function createApp(): Application {
  const app = express();

  // 1. Security HTTP headers
  app.use(configureHelmet());

  // 2. CORS policy with origin whitelist
  app.use(configureCors());

  // 3. Structured request logging & request-id propagation
  app.use(requestLogger);

  // 4. Cookie parser
  app.use(configureCookieParser());

  // 5. Body parsing with safe 1MB limit
  app.use(configureBodyParsers());

  // 6. Versioned API routes
  app.use('/api/v1', healthRouter);

  // 7. Route not found handler
  app.use(notFoundHandler);

  // 8. Centralized error handler
  app.use(errorHandler);

  return app;
}