export type UUID = string;
export type ISODateTimeString = string;
export type ISODateString = string;

export interface Identifiable {
  id: UUID;
}

export interface Timestamped {
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  deletedAt?: ISODateTimeString | null;
}

export interface Auditable extends Timestamped {
  createdBy?: UUID | null;
}

/**
 * Tenant scoping placeholder:
 * Contracts permit optional organizationId so that future multi-tenancy
 * can be introduced without breaking API client and shared interfaces.
 */
export interface TenantScoped {
  organizationId?: UUID | null;
}