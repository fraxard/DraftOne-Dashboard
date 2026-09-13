import { z } from 'zod';
import { ALL_ASSET_STATUSES, MAX_ASSET_FILE_SIZE_BYTES } from '../types/asset.js';
import { cursorPaginationSchema, uuidSchema } from './common.js';

export const assetStatusSchema = z.enum(
  ALL_ASSET_STATUSES as [string, ...string[]]
);

/**
 * Validates metadata for an asset registered in object storage.
 * Invariant: Clients register assets using an authoritative storage key,
 * rather than arbitrary or self-chosen canonical URLs.
 */
export const createAssetMetadataSchema = z.object({
  projectId: uuidSchema,
  taskId: uuidSchema.optional().nullable(),
  fileName: z.string().trim().min(1, { message: 'File name is required' }).max(255),
  storageKey: z.string().trim().min(1, { message: 'Storage key is required' }).max(500),
  fileSize: z.coerce
    .number()
    .positive({ message: 'File size must be greater than 0' })
    .max(MAX_ASSET_FILE_SIZE_BYTES, { message: 'File size must not exceed 50MB' }),
  mimeType: z.string().trim().min(1, { message: 'MIME type is required' }).max(100),
  version: z.coerce.number().int().positive().default(1),
});

export const updateAssetApprovalSchema = z.object({
  status: assetStatusSchema,
  comment: z.string().trim().max(1000).optional().nullable(),
});

export const assetQuerySchema = cursorPaginationSchema.extend({
  projectId: uuidSchema.optional(),
  taskId: uuidSchema.optional(),
  status: assetStatusSchema.optional(),
});