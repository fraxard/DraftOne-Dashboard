import type { Auditable, Identifiable, ISODateString, TenantScoped, UUID } from './common.js';

export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];
export const ALL_TASK_STATUSES: readonly TaskStatus[] = Object.freeze(Object.values(TASK_STATUSES));

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];
export const ALL_TASK_PRIORITIES: readonly TaskPriority[] = Object.freeze(Object.values(TASK_PRIORITIES));

export interface Task extends Identifiable, Auditable, TenantScoped {
  projectId: UUID;
  parentTaskId?: UUID | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: UUID | null;
  dueDate?: ISODateString | null;
  estimatedHours?: number | null;
  subTasks?: Task[];
}

export interface CreateTaskInput {
  projectId: UUID;
  parentTaskId?: UUID | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: UUID | null;
  dueDate?: ISODateString | null;
  estimatedHours?: number | null;
}

export interface UpdateTaskInput {
  parentTaskId?: UUID | null;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: UUID | null;
  dueDate?: ISODateString | null;
  estimatedHours?: number | null;
}