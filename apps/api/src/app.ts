import express, { type Application, type Router } from 'express';
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
import { authRouter } from './routes/auth.routes.js';
import { clientsRouter } from './clients/clients.routes.js';
import { projectsRouter } from './projects/projects.routes.js';

export function createApp(testRouter?: Router): Application {
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
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/clients', clientsRouter);
  app.use('/api/v1/projects', projectsRouter);

  if (testRouter) {
    app.use('/api/v1/test', testRouter);
  }

  // 7. Route not found handler
  app.use(notFoundHandler);

  // 8. Centralized error handler
  app.use(errorHandler);

  return app;
}