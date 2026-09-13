import type { ApiSuccessResponse } from './response.js';

export interface CursorPaginationParams {
  cursor?: string | null;
  limit?: number;
}

export interface CursorPaginationMeta {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  total?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: CursorPaginationMeta;
}

export type PaginatedApiResponse<T> = ApiSuccessResponse<T[]> & {
  pagination: CursorPaginationMeta;
};