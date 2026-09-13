import type { ApiErrorCode } from './errors.js';

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return typeof response === 'object' && response !== null && 'data' in response && !('error' in response);
}

export function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return typeof response === 'object' && response !== null && 'error' in response;
}