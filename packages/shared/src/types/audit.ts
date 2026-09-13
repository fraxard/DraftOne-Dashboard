import type { Identifiable, ISODateTimeString, TenantScoped, UUID } from './common.js';

export interface AuditLog extends Identifiable, TenantScoped {
  userId?: UUID | null;
  action: string;
  entityType: string;
  entityId?: UUID | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: ISODateTimeString;
}