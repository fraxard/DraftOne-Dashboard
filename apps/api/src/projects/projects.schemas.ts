import { z } from 'zod';
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  createProjectMemberSchema,
  updateProjectMemberSchema,
  uuidSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
  type CreateProjectMemberInput,
  type UpdateProjectMemberInput,
} from '@draftone/shared';

export {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  createProjectMemberSchema,
  updateProjectMemberSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
  type CreateProjectMemberInput,
  type UpdateProjectMemberInput,
};

export const projectIdParamSchema = z.object({
  id: uuidSchema,
});

export const projectScopedParamSchema = z.object({
  projectId: uuidSchema,
});

export const projectMemberParamsSchema = z.object({
  projectId: uuidSchema,
  memberId: uuidSchema,
});

export type ProjectQueryParams = z.infer<typeof projectQuerySchema>;
