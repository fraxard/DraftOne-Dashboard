import { env } from '../config/env.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  error?: Error | unknown;
  [key: string]: unknown;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /token/i,
  /auth(orization)?/i,
  /cookie/i,
  /secret/i,
  /credit[-_]?card/i,
];

function sanitizeObject(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 3) return { '[Truncated]': true };
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Error)
    ) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    this.minLevel = env.NODE_ENV === 'development' ? 'debug' : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      if (context.error instanceof Error) {
        payload.error = {
          name: context.error.name,
          message: context.error.message,
          stack: env.NODE_ENV !== 'production' ? context.error.stack : undefined,
        };
        const { error, ...rest } = context;
        Object.assign(payload, sanitizeObject(rest));
      } else {
        Object.assign(payload, sanitizeObject(context));
      }
    }

    const output = JSON.stringify(payload);
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write('error', message, context);
  }
}

export const logger = new Logger();