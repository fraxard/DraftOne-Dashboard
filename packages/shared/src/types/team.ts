import type { Role } from '../rbac/roles.js';
import type { Identifiable, TenantScoped, Timestamped, UUID } from './common.js';

export interface User extends Identifiable, Timestamped, TenantScoped {
  email: string;
  fullName: string;
  role: Role;
  department?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  department?: string | null;
  avatarUrl?: string | null;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: Role;
  department?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
}