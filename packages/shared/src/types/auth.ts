import type { Role } from '../rbac/roles.js';
import type { Identifiable, ISODateTimeString, TenantScoped, UUID } from './common.js';

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

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
  organizationId: UUID;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: UUID;
  organizationId: UUID;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginAuditRecord {
  userId?: UUID | null;
  organizationId?: UUID | null;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  success: boolean;
  timestamp: ISODateTimeString;
}