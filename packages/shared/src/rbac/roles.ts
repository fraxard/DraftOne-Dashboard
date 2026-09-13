export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PM: 'pm',
  CREATIVE: 'creative',
  FINANCE: 'finance',
  VIEWER: 'viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: readonly Role[] = Object.freeze(Object.values(ROLES));

export function isValidRole(value: unknown): value is Role {
  return typeof value === 'string' && (ALL_ROLES as readonly string[]).includes(value);
}