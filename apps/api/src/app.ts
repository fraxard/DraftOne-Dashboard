import express, { type Application } from 'express';
import cookieParser from 'cookie-parser';
import { requestIdMiddleware } from './middleware/request-id.js';
import { configureCors, configureHelmet, requestLogger } from './middleware/security.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';

export function createApp(): Application {
  const app = express();

  // 1. Request ID correlation
  app.use(requestIdMiddleware);

  // 2. Security headers via Helmet
  app.use(configureHelmet());

  // 3. CORS with whitelist policy
  app.use(configureCors());

  // 4. Cookie parser
  app.use(cookieParser());

  // 5. Structured request logging
  app.use(requestLogger);

  // 6. Body parsing with safe JSON and URL limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 7. Versioned API routes
  app.use('/api/v1', healthRouter);

  // 8. 404 handler for unknown routes
  app.use(notFoundHandler);

  // 9. Centralized error handling
  app.use(errorHandler);

  return app;
}