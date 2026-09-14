import type { Request, Response, NextFunction } from 'express';
import type { ApiSuccessResponse, PaginatedApiResponse } from '@draftone/shared';
import { projectsService } from './projects.service.js';
import {
  projectIdParamSchema,
  projectScopedParamSchema,
  projectMemberParamsSchema,
} from './projects.schemas.js';

export class ProjectsController {
  async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const result = await projectsService.listProjects(orgId, req.query);

      const response: PaginatedApiResponse<unknown> = {
        data: result.data,
        pagination: result.pagination,
        message: 'Projects retrieved successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = projectIdParamSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const project = await projectsService.getProjectById(orgId, id);

      const response: ApiSuccessResponse<typeof project> = {
        data: project,
        message: 'Project retrieved successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const project = await projectsService.createProject(
        { organizationId: orgId, userId, ipAddress: req.ip },
        req.body
      );

      const response: ApiSuccessResponse<typeof project> = {
        data: project,
        message: 'Project created successfully',
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = projectIdParamSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const project = await projectsService.updateProject(
        { organizationId: orgId, userId, ipAddress: req.ip },
        id,
        req.body
      );

      const response: ApiSuccessResponse<typeof project> = {
        data: project,
        message: 'Project updated successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async archiveProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = projectIdParamSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const result = await projectsService.archiveProject(
        { organizationId: orgId, userId, ipAddress: req.ip },
        id
      );

      const response: ApiSuccessResponse<typeof result> = {
        data: result,
        message: 'Project archived successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = projectScopedParamSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const members = await projectsService.listMembers(orgId, projectId);

      const response: ApiSuccessResponse<typeof members> = {
        data: members,
        message: 'Project members retrieved successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = projectScopedParamSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const member = await projectsService.addMember(
        { organizationId: orgId, userId, ipAddress: req.ip },
        projectId,
        req.body
      );

      const response: ApiSuccessResponse<typeof member> = {
        data: member,
        message: 'Project member added successfully',
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, memberId } = projectMemberParamsSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const member = await projectsService.updateMember(
        { organizationId: orgId, userId, ipAddress: req.ip },
        projectId,
        memberId,
        req.body
      );

      const response: ApiSuccessResponse<typeof member> = {
        data: member,
        message: 'Project member updated successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, memberId } = projectMemberParamsSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const result = await projectsService.removeMember(
        { organizationId: orgId, userId, ipAddress: req.ip },
        projectId,
        memberId
      );

      const response: ApiSuccessResponse<typeof result> = {
        data: result,
        message: 'Project member removed successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}

export const projectsController = new ProjectsController();
