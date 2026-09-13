import helmet from 'helmet';
import cors, { type CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Handler } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { AppError } from '../lib/app-error.js';

export function configureHelmet(): Handler {
  return helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  });
}

export function configureCors(): Handler {
  const allowedOrigins = new Set(env.CORS_ORIGINS);

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser requests with no origin (e.g. server-to-server, curl, health probes)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked request from unauthorized origin: ${origin}`);
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

export function configureBodyParsers(): Handler[] {
  return [
    express.json({ limit: '1mb' }),
    express.urlencoded({ extended: true, limit: '1mb' }),
  ];
}

export function configureCookieParser(): Handler {
  return cookieParser();
}