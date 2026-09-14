import type { Role } from '@draftone/shared';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: Role;
}

export interface AccessTokenClaims {
  sub: string;
  organizationId: string;
  role: Role;
  tokenType: 'access';
}

export interface RefreshTokenClaims {
  sub: string;
  organizationId: string;
  sessionId: string;
  jti: string;
  tokenType: 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserDto {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface LoginResult {
  user: AuthUserDto;
  tokens: AuthTokens;
}

export interface RefreshResult {
  accessToken: string;
  newRefreshToken: string;
}