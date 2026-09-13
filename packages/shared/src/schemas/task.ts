import { z } from 'zod';
import { ALL_TASK_PRIORITIES, ALL_TASK_STATUSES } from '../types/task.js';
import { cursorPaginationSchema, dateStringSchema, uuidSchema } from './common.js';

export const taskStatusSchema = z.enum(
  ALL_TASK_STATUSES as [string, ...string[]]
);

export const taskPrioritySchema = z.enum(
  ALL_TASK_PRIORITIES as [string, ...string[]]
);

export const createTaskSchema = z.object({
  projectId: uuidSchema,
  parentTaskId: uuidSchema.optional().nullable(),
  title: z.string().trim().min(1, { message: 'Task title is required' }).max(500),
  description: z.string().optional().nullable(),
  status: taskStatusSchema.default('todo'),
  priority: taskPrioritySchema.default('medium'),
  assigneeId: uuidSchema.optional().nullable(),
  dueDate: dateStringSchema.optional().nullable(),
  estimatedHours: z.coerce.number().positive().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.omit({ projectId: true }).partial();

export const taskQuerySchema = cursorPaginationSchema.extend({
  projectId: uuidSchema.optional(),
  assigneeId: uuidSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  search: z.string().trim().optional(),
});