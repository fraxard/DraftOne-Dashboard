import { z } from 'zod';
import { ALL_ROLES } from '../rbac/roles.js';
import { cursorPaginationSchema, uuidSchema } from './common.js';

export const userRoleSchema = z.enum(
  ALL_ROLES as [string, ...string[]]
);

export const createUserSchema = z.object({
  email: z.string().trim().email({ message: 'Valid email is required' }).max(255),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  fullName: z.string().trim().min(1, { message: 'Full name is required' }).max(255),
  role: userRoleSchema,
  department: z.string().trim().max(100).optional().nullable(),
  avatarUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1).max(255).optional(),
  role: userRoleSchema.optional(),
  department: z.string().trim().max(100).optional().nullable(),
  avatarUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export const userQuerySchema = cursorPaginationSchema.extend({
  role: userRoleSchema.optional(),
  department: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().optional(),
});