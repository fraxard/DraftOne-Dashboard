import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { AppError } from '../lib/app-error.js';

export function configureHelmet() {
  return helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  });
}

export function configureCors() {
  const allowedOrigins = new Set(env.CORS_ORIGINS);

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, health probes)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // Explicitly reject unauthorized browser origins
      logger.warn(`CORS blocked request from origin: ${origin}`);
      return callback(
        AppError.forbidden(`Origin '${origin}' is not allowed by CORS policy`)
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400,
  };

  return cors(corsOptions);
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    const { method, originalUrl, id } = req;
    const { statusCode } = res;

    const logContext = {
      requestId: id,
      method,
      path: originalUrl,
      statusCode,
      durationMs,
    };

    if (statusCode >= 500) {
      logger.error(
        `HTTP ${method} ${originalUrl} ${statusCode} in ${durationMs}ms`,
        logContext
      );
    } else if (statusCode >= 400) {
      logger.warn(
        `HTTP ${method} ${originalUrl} ${statusCode} in ${durationMs}ms`,
        logContext
      );
    } else {
      logger.info(
        `HTTP ${method} ${originalUrl} ${statusCode} in ${durationMs}ms`,
        logContext
      );
    }
  });

  next();
}