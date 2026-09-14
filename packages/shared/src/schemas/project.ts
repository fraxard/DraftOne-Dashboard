import { z } from 'zod';
import { ALL_PROJECT_STAGES } from '../types/project.js';
import { cursorPaginationSchema, dateStringSchema, isoDateTimeSchema, uuidSchema } from './common.js';

export const projectStageSchema = z.enum(
  ALL_PROJECT_STAGES as [string, ...string[]]
);

export const createProjectSchema = z.object({
  clientId: uuidSchema,
  name: z.string().trim().min(1, { message: 'Project name is required' }).max(255),
  description: z.string().optional().nullable(),
  stage: projectStageSchema.default('brief'),
  pmId: uuidSchema.optional().nullable(),
  startDate: isoDateTimeSchema.or(dateStringSchema).optional().nullable(),
  dueDate: isoDateTimeSchema.or(dateStringSchema).optional().nullable(),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.omit({ clientId: true }).partial();

export const projectQuerySchema = cursorPaginationSchema.extend({
  clientId: uuidSchema.optional(),
  pmId: uuidSchema.optional(),
  stage: projectStageSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
});

export const createProjectMemberSchema = z.object({
  userId: uuidSchema,
  role: z.string().trim().max(50).optional().nullable(),
});

export const updateProjectMemberSchema = z.object({
  role: z.string().trim().max(50).optional().nullable(),
});