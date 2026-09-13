import { z } from 'zod';

export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const isoDateTimeSchema = z.string().datetime({ message: 'Invalid ISO date-time string' });

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' });

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});