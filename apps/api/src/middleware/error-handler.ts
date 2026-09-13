import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  API_ERROR_CODES,
  type ApiErrorCode,
  type ApiErrorDetail,
  type ApiErrorResponse,
} from '@draftone/shared';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: Error | unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let code: ApiErrorCode = API_ERROR_CODES.INTERNAL_ERROR;
  let message = 'An unexpected internal server error occurred';
  let details: ApiErrorDetail[] | undefined = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = API_ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
  } else if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status: number }).status === 400
  ) {
    statusCode = 400;
    code = API_ERROR_CODES.BAD_REQUEST;
    message = 'Malformed JSON payload in request body';
  } else if (
    err &&
    typeof err === 'object' &&
    'type' in err &&
    (err as { type: string }).type === 'entity.too.large'
  ) {
    statusCode = 413;
    code = API_ERROR_CODES.PAYLOAD_TOO_LARGE;
    message = 'Request payload exceeds the maximum allowed limit';
  }

  logger.error(
    {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      errorCode: code,
      err,
    },
    err instanceof Error ? err.message : 'Unknown server error'
  );

  const responseBody: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };

  res.status(statusCode).json(responseBody);
}