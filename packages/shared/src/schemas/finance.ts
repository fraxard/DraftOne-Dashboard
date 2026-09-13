import { z } from 'zod';
import { ALL_INVOICE_STATUSES } from '../types/finance.js';
import { cursorPaginationSchema, dateStringSchema, uuidSchema } from './common.js';

export const invoiceStatusSchema = z.enum(
  ALL_INVOICE_STATUSES as [string, ...string[]]
);

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(50).optional(),
  clientId: uuidSchema,
  projectId: uuidSchema.optional().nullable(),
  status: invoiceStatusSchema.default('draft'),
  subtotal: z.coerce.number().nonnegative(),
  taxPercent: z.coerce.number().min(0).max(100).default(18),
  dueDate: dateStringSchema.optional().nullable(),
  issuedDate: dateStringSchema.optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.omit({ clientId: true, invoiceNumber: true }).partial();

export const invoiceQuerySchema = cursorPaginationSchema.extend({
  clientId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  status: invoiceStatusSchema.optional(),
  search: z.string().trim().optional(),
});