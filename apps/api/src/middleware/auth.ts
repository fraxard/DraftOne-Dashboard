import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/jwt.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/app-error.js';

/**
 * Authentication middleware that verifies short-lived Bearer access tokens.
 * Validates token signature, expiration, and claims, verifies active user state in PostgreSQL,
 * and attaches the verified tenant principal to `req.user`.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw AppError.unauthorized('Authentication required');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      throw AppError.unauthorized('Invalid authorization header format');
    }

    const token = parts[1];
    const claims = verifyAccessToken(token);

    // Verify user exists, belongs to the claim's organization, is active, and not soft-deleted
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
    });

    if (
      !user ||
      user.deletedAt !== null ||
      !user.isActive ||
      user.organizationId !== claims.organizationId
    ) {
      throw AppError.unauthorized('Authentication required');
    }

    // Attach verified principal
    req.user = {
      id: user.id,
      organizationId: user.organizationId,
      role: user.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}