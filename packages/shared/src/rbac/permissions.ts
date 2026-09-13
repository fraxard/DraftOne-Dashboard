import { ROLES, type Role } from './roles.js';

export const PERMISSIONS = {
  // Users
  USERS_MANAGE: 'users:manage',
  USERS_READ: 'users:read',

  // Clients
  CLIENTS_READ: 'clients:read',
  CLIENTS_WRITE: 'clients:write',

  // Projects
  PROJECTS_READ: 'projects:read',
  PROJECTS_WRITE: 'projects:write',

  // Tasks
  TASKS_READ: 'tasks:read',
  TASKS_WRITE: 'tasks:write',
  TASKS_MANAGE_OWN: 'tasks:manage_own',

  // Finance
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',

  // Assets
  ASSETS_READ: 'assets:read',
  ASSETS_WRITE: 'assets:write',

  // System & Audit
  SETTINGS_MANAGE: 'settings:manage',
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly Permission[] = Object.freeze(Object.values(PERMISSIONS));

/**
 * Authoritative mapping of roles to granted permissions.
 * Derived directly from the SDLC v1.0.0 RBAC matrix (Section 4.1).
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = Object.freeze({
  [ROLES.SUPER_ADMIN]: Object.freeze([...ALL_PERMISSIONS]),

  [ROLES.ADMIN]: Object.freeze([
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_WRITE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_WRITE,
    PERMISSIONS.TASKS_MANAGE_OWN,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.ASSETS_READ,
    PERMISSIONS.ASSETS_WRITE,
    PERMISSIONS.AUDIT_READ,
  ]),

  [ROLES.PM]: Object.freeze([
    PERMISSIONS.USERS_READ,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_WRITE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_WRITE,
    PERMISSIONS.TASKS_MANAGE_OWN,
    PERMISSIONS.ASSETS_READ,
    PERMISSIONS.ASSETS_WRITE,
  ]),

  [ROLES.CREATIVE]: Object.freeze([
    PERMISSIONS.TASKS_MANAGE_OWN,
    PERMISSIONS.ASSETS_READ,
    PERMISSIONS.ASSETS_WRITE,
  ]),

  [ROLES.FINANCE]: Object.freeze([
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.ASSETS_READ,
  ]),

  [ROLES.VIEWER]: Object.freeze([
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.PROJECTS_READ,
  ]),
});

export function hasPermission(role: Role, permission: Permission): boolean {
  const granted = ROLE_PERMISSIONS[role];
  return granted ? (granted as readonly string[]).includes(permission) : false;
}

export function hasAnyPermission(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.some((perm) => hasPermission(role, perm));
}

export function hasAllPermissions(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}