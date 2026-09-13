import { z } from 'zod';
import { ALL_ASSET_STATUSES } from '../types/asset.js';
import { cursorPaginationSchema, uuidSchema } from './common.js';

export const assetStatusSchema = z.enum(
  ALL_ASSET_STATUSES as [string, ...string[]]
);

export const createAssetMetadataSchema = z.object({
  projectId: uuidSchema,
  taskId: uuidSchema.optional().nullable(),
  fileName: z.string().trim().min(1).max(255),
  fileUrl: z.string().trim().url({ message: 'Invalid asset file URL' }),
  fileSize: z.coerce.number().positive().max(50 * 1024 * 1024, { message: 'File size must not exceed 50MB' }),
  mimeType: z.string().trim().min(1),
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