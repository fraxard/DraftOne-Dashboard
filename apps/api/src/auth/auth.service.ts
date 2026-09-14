import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/app-error.js';
import { comparePassword } from './password.js';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from './jwt.js';
import { loginSchema, refreshTokenCookieSchema } from './auth.schemas.js';
import { env } from '../config/env.js';
import type { LoginResult, RefreshResult } from './types.js';

const INACTIVITY_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const REFRESH_COOKIE_NAME = 'refreshToken';

export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/v1/auth',
    maxAge: SEVEN_DAYS_MS,
  };
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export class AuthService {
  /**
   * Authenticates a user with email and password, creating a new session and audit log entry.
   * Protects against user enumeration by returning generic 401 on any mismatch.
   */
  async login(
    input: unknown,
    meta: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<LoginResult> {
    const parseResult = loginSchema.safeParse(input);
    if (!parseResult.success) {
      throw AppError.validation('Invalid login request', [
        ...parseResult.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      ]);
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Query for all active users matching email across organizations
    const matchingUsers = await prisma.user.findMany({
      where: {
        email: normalizedEmail,
        deletedAt: null,
      },
    });

    // If zero matches, return generic 401
    if (matchingUsers.length === 0) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // If multiple matches across tenants and no explicit tenant context provided, reject ambiguity
    if (matchingUsers.length > 1) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const user = matchingUsers[0]!;

    if (!user.isActive) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Session initialization
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SEVEN_DAYS_MS);

    const rawRefreshToken = createRefreshToken({
      sub: user.id,
      organizationId: user.organizationId,
      sessionId,
    });

    const tokenHash = hashToken(rawRefreshToken);

    // Create session in database
    await prisma.session.create({
      data: {
        id: sessionId,
        organizationId: user.organizationId,
        userId: user.id,
        tokenHash,
        expiresAt,
        lastActiveAt: now,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
      },
    });

    // Create immutable audit log entry (no passwords, hashes, or tokens stored)
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'user',
        entityId: user.id,
        ipAddress: meta.ipAddress ?? null,
        newValues: {
          loginAt: now.toISOString(),
          userAgent: meta.userAgent ?? null,
        },
      },
    });

    const accessToken = createAccessToken({
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
      },
    };
  }

  /**
   * Validates refresh token cookie and atomically rotates the refresh credential.
   * Prevents replay and concurrent rotation race conditions.
   */
  async refresh(
    rawRefreshToken: unknown,
    meta: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<RefreshResult> {
    const parseResult = refreshTokenCookieSchema.safeParse({ refreshToken: rawRefreshToken });
    if (!parseResult.success) {
      throw AppError.unauthorized('Authentication required');
    }

    const token = parseResult.data.refreshToken;
    const claims = verifyRefreshToken(token);
    const presentedHash = hashToken(token);

    // Find the session and associated user
    const session = await prisma.session.findUnique({
      where: { id: claims.sessionId },
      include: { user: true },
    });

    if (!session || session.revokedAt !== null || session.tokenHash !== presentedHash) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const now = new Date();

    // Check 7-day absolute session lifetime
    if (now > session.expiresAt) {
      await prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      throw AppError.unauthorized('Session has expired');
    }

    // Check 8-hour inactivity sliding window
    if (now.getTime() - session.lastActiveAt.getTime() > INACTIVITY_TIMEOUT_MS) {
      await prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      throw AppError.unauthorized('Session has expired due to inactivity');
    }

    // Verify user is still active and non-deleted
    if (!session.user || session.user.deletedAt !== null || !session.user.isActive) {
      await prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      throw AppError.unauthorized('User is no longer active');
    }

    // Generate new rotated refresh token
    const newRawRefreshToken = createRefreshToken({
      sub: session.userId,
      organizationId: session.organizationId,
      sessionId: session.id,
    });
    const newTokenHash = hashToken(newRawRefreshToken);

    // ATOMIC REFRESH ROTATION:
    // Only update if tokenHash still equals presentedHash and revokedAt is null.
    // If a concurrent request rotated it first, count will be 0.
    const updateResult = await prisma.session.updateMany({
      where: {
        id: session.id,
        tokenHash: presentedHash,
        revokedAt: null,
      },
      data: {
        tokenHash: newTokenHash,
        lastActiveAt: now,
        userAgent: meta.userAgent ?? session.userAgent,
        ipAddress: meta.ipAddress ?? session.ipAddress,
      },
    });

    if (updateResult.count === 0) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const accessToken = createAccessToken({
      sub: session.user.id,
      organizationId: session.organizationId,
      role: session.user.role,
    });

    return {
      accessToken,
      newRefreshToken: newRawRefreshToken,
    };
  }

  /**
   * Revokes the session associated with the presented refresh token.
   * Safe and idempotent.
   */
  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      return;
    }

    try {
      const claims = verifyRefreshToken(rawRefreshToken);
      await prisma.session.updateMany({
        where: { id: claims.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Logout is always safe and idempotent; ignore invalid token errors
    }
  }
}

export const authService = new AuthService();