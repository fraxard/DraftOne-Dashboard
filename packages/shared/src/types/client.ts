import type { Auditable, Identifiable, TenantScoped, UUID } from './common.js';

export const CLIENT_STATUSES = {
  LEAD: 'lead',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CHURNED: 'churned',
} as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[keyof typeof CLIENT_STATUSES];
export const ALL_CLIENT_STATUSES: readonly ClientStatus[] = Object.freeze(Object.values(CLIENT_STATUSES));

export interface ClientContact extends Identifiable {
  clientId: UUID;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  isPrimary?: boolean;
}

export interface Client extends Identifiable, Auditable, TenantScoped {
  name: string;
  industry?: string | null;
  status: ClientStatus;
  assignedPmId?: UUID | null;
  website?: string | null;
  notes?: string | null;
  contacts?: ClientContact[];
}

export interface CreateClientInput {
  name: string;
  industry?: string | null;
  status?: ClientStatus;
  assignedPmId?: UUID | null;
  website?: string | null;
  notes?: string | null;
}

export interface UpdateClientInput {
  name?: string;
  industry?: string | null;
  status?: ClientStatus;
  assignedPmId?: UUID | null;
  website?: string | null;
  notes?: string | null;
}