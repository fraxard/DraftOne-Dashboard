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
 * Strict tenant scoping contract:
 * All tenant-owned domain entities MUST carry an organizationId.
 */
export interface TenantScoped {
  organizationId: UUID;
}