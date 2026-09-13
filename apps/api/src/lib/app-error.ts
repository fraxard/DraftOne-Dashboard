import { API_ERROR_CODES, type ApiErrorCode, type ApiErrorDetail } from '@draftone/shared';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly details?: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetail[],
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: ApiErrorDetail[]): AppError {
    return new AppError(400, API_ERROR_CODES.BAD_REQUEST, message, details);
  }

  static validation(message = 'Validation failed', details?: ApiErrorDetail[]): AppError {
    return new AppError(400, API_ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(401, API_ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Access forbidden'): AppError {
    return new AppError(403, API_ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, API_ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message: string, details?: ApiErrorDetail[]): AppError {
    return new AppError(409, API_ERROR_CODES.CONFLICT, message, details);
  }

  static payloadTooLarge(message = 'Payload too large'): AppError {
    return new AppError(413, API_ERROR_CODES.PAYLOAD_TOO_LARGE, message);
  }

  static rateLimited(message = 'Too many requests, please try again later'): AppError {
    return new AppError(429, API_ERROR_CODES.RATE_LIMITED, message);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(500, API_ERROR_CODES.INTERNAL_ERROR, message, undefined, false);
  }
}