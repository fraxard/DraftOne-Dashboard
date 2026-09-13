import type { Identifiable, ISODateTimeString, TenantScoped, Timestamped, UUID } from './common.js';

export const MAX_ASSET_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB per SDLC specification

export const ASSET_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type AssetStatus = (typeof ASSET_STATUSES)[keyof typeof ASSET_STATUSES];
export const ALL_ASSET_STATUSES: readonly AssetStatus[] = Object.freeze(Object.values(ASSET_STATUSES));

export interface Asset extends Identifiable, Timestamped, TenantScoped {
  projectId: UUID;
  taskId?: UUID | null;
  fileName: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  version: number;
  status: AssetStatus;
  uploadedBy: UUID;
  approvalComment?: string | null;
  approvedBy?: UUID | null;
  approvedAt?: ISODateTimeString | null;
}

export interface CreateAssetInput {
  projectId: UUID;
  taskId?: UUID | null;
  fileName: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  version?: number;
}

export interface UpdateAssetApprovalInput {
  status: AssetStatus;
  comment?: string | null;
}