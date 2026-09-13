import type { Auditable, Identifiable, ISODateString, TenantScoped, UUID } from './common.js';

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES];
export const ALL_INVOICE_STATUSES: readonly InvoiceStatus[] = Object.freeze(Object.values(INVOICE_STATUSES));

export interface Invoice extends Identifiable, Auditable, TenantScoped {
  invoiceNumber: string;
  clientId: UUID;
  projectId?: UUID | null;
  status: InvoiceStatus;
  subtotal: number;
  taxPercent: number;
  total: number;
  dueDate?: ISODateString | null;
  issuedDate: ISODateString;
}

export interface CreateInvoiceInput {
  invoiceNumber?: string;
  clientId: UUID;
  projectId?: UUID | null;
  status?: InvoiceStatus;
  subtotal: number;
  taxPercent?: number;
  dueDate?: ISODateString | null;
  issuedDate?: ISODateString;
}

export interface UpdateInvoiceInput {
  status?: InvoiceStatus;
  subtotal?: number;
  taxPercent?: number;
  dueDate?: ISODateString | null;
  issuedDate?: ISODateString;
}