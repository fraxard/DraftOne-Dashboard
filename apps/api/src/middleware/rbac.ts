import type { Request, Response, NextFunction } from 'express';
import { hasAllPermissions, hasAnyPermission, type Role, type Permission } from '@draftone/shared';
import { AppError } from '../lib/app-error.js';

/**
 * RBAC middleware that requires the authenticated user to possess one of the allowed roles.
 */
export function requireRole(...allowedRoles: readonly Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('Access forbidden'));
    }

    next();
  };
}

/**
 * RBAC middleware that requires the authenticated user to possess all specified permissions,
 * evaluated via the canonical `@draftone/shared` permission matrix.
 */
export function requirePermission(...requiredPermissions: readonly Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!hasAllPermissions(req.user.role, requiredPermissions)) {
      return next(AppError.forbidden('Access forbidden'));
    }

    next();
  };
}

/**
 * RBAC middleware that requires the authenticated user to possess at least one of the specified permissions.
 */
export function requireAnyPermission(...permissions: readonly Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!hasAnyPermission(req.user.role, permissions)) {
      return next(AppError.forbidden('Access forbidden'));
    }

    next();
  };
}