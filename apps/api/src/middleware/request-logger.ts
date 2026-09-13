import { pinoHttp, type HttpLogger, type Options } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { logger } from '../lib/logger.js';
import { randomUUID } from 'node:crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const options: Options = {
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse): string => {
    const header = req.headers['x-request-id'];
    const id =
      typeof header === 'string' && UUID_REGEX.test(header)
        ? header
        : randomUUID();
    res.setHeader('X-Request-ID', id);
    return id;
  },
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (
    req: IncomingMessage,
    res: ServerResponse,
    responseTime: number
  ) => {
    return `HTTP ${req.method ?? 'UNKNOWN'} ${req.url ?? ''} ${res.statusCode} in ${responseTime}ms`;
  },
  customErrorMessage: (
    req: IncomingMessage,
    res: ServerResponse,
    err: Error
  ) => {
    return `HTTP ${req.method ?? 'UNKNOWN'} ${req.url ?? ''} ${res.statusCode} failed: ${err.message}`;
  },
  serializers: {
    req: (req: IncomingMessage & { id?: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: ServerResponse) => ({
      statusCode: res.statusCode,
    }),
    err: (err: Error & { type?: string }) => ({
      type: err.type,
      message: err.message,
    }),
  },
};

export const requestLogger: HttpLogger = pinoHttp(options);