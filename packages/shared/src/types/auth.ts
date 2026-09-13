import type { Role } from '../rbac/roles.js';
import type { Identifiable, ISODateTimeString, TenantScoped, UUID } from './common.js';

export interface AuthenticatedUser extends Identifiable, TenantScoped {
  email: string;
  fullName: string;
  role: Role;
  department?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
}

export interface AuthSession {
  user: AuthenticatedUser;
  accessToken: string;
  expiresIn: number;
}

export interface JwtTokenPayload {
  sub: UUID;
  email: string;
  role: Role;
  organizationId?: UUID | null;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: UUID;
  tokenVersion?: number;
  organizationId?: UUID | null;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginAuditRecord {
  userId: UUID;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  success: boolean;
  timestamp: ISODateTimeString;
}