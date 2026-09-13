import type { Request, Response } from 'express';
import { API_ERROR_CODES, type ApiErrorResponse } from '@draftone/shared';

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiErrorResponse = {
    error: {
      code: API_ERROR_CODES.NOT_FOUND,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  };

  res.status(404).json(response);
}