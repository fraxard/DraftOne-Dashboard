import { z } from 'zod';
import { ALL_CLIENT_STATUSES } from '../types/client.js';
import { cursorPaginationSchema, uuidSchema } from './common.js';

export const clientStatusSchema = z.enum(
  ALL_CLIENT_STATUSES as [string, ...string[]]
);

export const createClientSchema = z.object({
  name: z.string().trim().min(1, { message: 'Client name is required' }).max(255),
  industry: z.string().trim().max(100).optional().nullable(),
  status: clientStatusSchema.default('lead'),
  assignedPmId: uuidSchema.optional().nullable(),
  website: z.string().trim().url({ message: 'Invalid website URL' }).optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
});

export const updateClientSchema = createClientSchema.partial();

export const clientQuerySchema = cursorPaginationSchema.extend({
  status: clientStatusSchema.optional(),
  assignedPmId: uuidSchema.optional(),
  search: z.string().trim().optional(),
});