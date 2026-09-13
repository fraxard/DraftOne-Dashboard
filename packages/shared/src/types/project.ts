import type { Auditable, Identifiable, ISODateString, TenantScoped, UUID } from './common.js';

export const PROJECT_STAGES = {
  BRIEF: 'brief',
  QUOTATION: 'quotation',
  PRE_PRODUCTION: 'pre_production',
  SHOOT: 'shoot',
  POST_PRODUCTION: 'post_production',
  REVIEW: 'review',
  DELIVERY: 'delivery',
  INVOICED: 'invoiced',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type ProjectStage = (typeof PROJECT_STAGES)[keyof typeof PROJECT_STAGES];
export const ALL_PROJECT_STAGES: readonly ProjectStage[] = Object.freeze(Object.values(PROJECT_STAGES));

export interface Project extends Identifiable, Auditable, TenantScoped {
  clientId: UUID;
  name: string;
  description?: string | null;
  stage: ProjectStage;
  pmId?: UUID | null;
  startDate?: ISODateString | null;
  dueDate?: ISODateString | null;
  budget?: number | null;
}

export interface CreateProjectInput {
  clientId: UUID;
  name: string;
  description?: string | null;
  stage?: ProjectStage;
  pmId?: UUID | null;
  startDate?: ISODateString | null;
  dueDate?: ISODateString | null;
  budget?: number | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  stage?: ProjectStage;
  pmId?: UUID | null;
  startDate?: ISODateString | null;
  dueDate?: ISODateString | null;
  budget?: number | null;
}