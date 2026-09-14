import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { isValidRole } from '@draftone/shared';
import { AppError } from '../lib/app-error.js';
import type { AccessTokenClaims, RefreshTokenClaims } from './types.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function createAccessToken(claims: Omit<AccessTokenClaims, 'tokenType'>): string {
  if (!UUID_REGEX.test(claims.sub)) {
    throw AppError.badRequest('Invalid user identifier in token claims');
  }
  if (!UUID_REGEX.test(claims.organizationId)) {
    throw AppError.badRequest('Invalid organization identifier in token claims');
  }
  if (!isValidRole(claims.role)) {
    throw AppError.badRequest('Invalid role in token claims');
  }

  const payload: AccessTokenClaims = {
    sub: claims.sub,
    organizationId: claims.organizationId,
    role: claims.role,
    tokenType: 'access',
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

import crypto from 'node:crypto';

export function createRefreshToken(
  claims: Omit<RefreshTokenClaims, 'tokenType' | 'jti'> & { jti?: string }
): string {
  if (!UUID_REGEX.test(claims.sub)) {
    throw AppError.badRequest('Invalid user identifier in token claims');
  }
  if (!UUID_REGEX.test(claims.organizationId)) {
    throw AppError.badRequest('Invalid organization identifier in token claims');
  }
  if (!UUID_REGEX.test(claims.sessionId)) {
    throw AppError.badRequest('Invalid session identifier in token claims');
  }

  const jti = claims.jti ?? crypto.randomUUID();

  const payload: RefreshTokenClaims = {
    sub: claims.sub,
    organizationId: claims.organizationId,
    sessionId: claims.sessionId,
    jti,
    tokenType: 'refresh',
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as unknown;

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('sub' in decoded) ||
      !('organizationId' in decoded) ||
      !('role' in decoded) ||
      !('tokenType' in decoded)
    ) {
      throw AppError.unauthorized('Invalid access token payload');
    }

    const payload = decoded as Record<string, unknown>;

    if (payload.tokenType !== 'access') {
      throw AppError.unauthorized('Invalid token type');
    }

    if (
      typeof payload.sub !== 'string' ||
      !UUID_REGEX.test(payload.sub) ||
      typeof payload.organizationId !== 'string' ||
      !UUID_REGEX.test(payload.organizationId) ||
      !isValidRole(payload.role)
    ) {
      throw AppError.unauthorized('Malformed access token claims');
    }

    return {
      sub: payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
      tokenType: 'access',
    };
  } catch (err: unknown) {
    if (err instanceof AppError) {
      throw err;
    }
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Access token has expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthorized('Invalid access token signature');
    }
    throw AppError.unauthorized('Authentication required');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    }) as unknown;

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('sub' in decoded) ||
      !('organizationId' in decoded) ||
      !('sessionId' in decoded) ||
      !('jti' in decoded) ||
      !('tokenType' in decoded)
    ) {
      throw AppError.unauthorized('Invalid refresh token payload');
    }

    const payload = decoded as Record<string, unknown>;

    if (payload.tokenType !== 'refresh') {
      throw AppError.unauthorized('Invalid token type');
    }

    if (
      typeof payload.sub !== 'string' ||
      !UUID_REGEX.test(payload.sub) ||
      typeof payload.organizationId !== 'string' ||
      !UUID_REGEX.test(payload.organizationId) ||
      typeof payload.sessionId !== 'string' ||
      !UUID_REGEX.test(payload.sessionId) ||
      typeof payload.jti !== 'string' ||
      !UUID_REGEX.test(payload.jti)
    ) {
      throw AppError.unauthorized('Malformed refresh token claims');
    }

    return {
      sub: payload.sub,
      organizationId: payload.organizationId,
      sessionId: payload.sessionId,
      jti: payload.jti,
      tokenType: 'refresh',
    };
  } catch (err: unknown) {
    if (err instanceof AppError) {
      throw err;
    }
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Refresh token has expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthorized('Invalid refresh token signature');
    }
    throw AppError.unauthorized('Authentication required');
  }
}