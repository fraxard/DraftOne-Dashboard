import { Router } from 'express';
import { PERMISSIONS } from '@draftone/shared';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { projectsController } from './projects.controller.js';

export const projectsRouter: Router = Router();

// Require authentication for all project endpoints
projectsRouter.use(requireAuth);

// Project CRUD routes
projectsRouter.get(
  '/',
  requirePermission(PERMISSIONS.PROJECTS_READ),
  projectsController.listProjects.bind(projectsController)
);

projectsRouter.post(
  '/',
  requirePermission(PERMISSIONS.PROJECTS_WRITE),
  projectsController.createProject.bind(projectsController)
);

projectsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.PROJECTS_READ),
  projectsController.getProject.bind(projectsController)
);

projectsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.PROJECTS_WRITE),
  projectsController.updateProject.bind(projectsController)
);

projectsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.PROJECTS_WRITE),
  projectsController.archiveProject.bind(projectsController)
);

// Project Member nested routes
projectsRouter.get(
  '/:projectId/members',
  requirePermission(PERMISSIONS.PROJECTS_READ),
  projectsController.listMembers.bind(projectsController)
);

projectsRouter.post(
  '/:projectId/members',
  requirePermission(PERMISSIONS.PROJECTS_WRITE),
  projectsController.addMember.bind(projectsController)
);

projectsRouter.patch(
  '/:projectId/members/:memberId',
  requirePermission(PERMISSIONS.PROJECTS_WRITE),
  projectsController.updateMember.bind(projectsController)
);

projectsRouter.delete(
  '/:projectId/members/:memberId',
  requirePermission(PERMISSIONS.PROJECTS_WRITE),
  projectsController.removeMember.bind(projectsController)
);
