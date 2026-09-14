import type { Role } from '@draftone/shared';
import { ROLES } from '@draftone/shared';
import { Prisma, type ProjectStage as PrismaProjectStage } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/app-error.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  createProjectMemberSchema,
  updateProjectMemberSchema,
} from './projects.schemas.js';

const ALLOWED_PM_ROLES: readonly Role[] = [ROLES.PM, ROLES.ADMIN, ROLES.SUPER_ADMIN];

export interface ProjectServiceContext {
  organizationId: string;
  userId: string;
  ipAddress?: string;
}

export class ProjectsService {
  /**
   * Retrieves a paginated list of projects scoped strictly to the authenticated organization.
   */
  async listProjects(organizationId: string, rawQuery: unknown) {
    const query = projectQuerySchema.parse(rawQuery);
    const limit = query.limit ?? 20;
    const page = query.page;
    const cursor = query.cursor;

    const where: Prisma.ProjectWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (query.stage) {
      where.stage = query.stage as PrismaProjectStage;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.pmId) {
      where.pmId = query.pmId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.project.count({ where });

    let items: Array<Awaited<ReturnType<typeof prisma.project.findMany>>[number]>;
    let hasMore = false;
    let nextCursor: string | null = null;
    let totalPages: number | undefined = undefined;

    const includeRelations = {
      client: {
        select: { id: true, name: true, status: true },
      },
      pm: {
        select: { id: true, fullName: true, email: true, role: true },
      },
      members: {
        where: { deletedAt: null },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
          },
        },
      },
    };

    if (page !== undefined && page > 0) {
      const skip = (page - 1) * limit;
      totalPages = Math.ceil(total / limit);
      items = await prisma.project.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: includeRelations,
      });
      hasMore = page < totalPages;
      const lastItem = items[items.length - 1];
      nextCursor = lastItem ? lastItem.id : null;
    } else {
      items = await prisma.project.findMany({
        where,
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: includeRelations,
      });

      hasMore = items.length > limit;
      if (hasMore) {
        items.pop();
      }
      const lastItem = items[items.length - 1];
      nextCursor = hasMore && lastItem ? lastItem.id : null;
      totalPages = Math.ceil(total / limit);
    }

    return {
      data: items,
      pagination: {
        cursor: cursor ?? null,
        nextCursor,
        hasMore,
        limit,
        total,
        page: page ?? 1,
        totalPages,
        hasNext: hasMore,
        hasPrev: page ? page > 1 : Boolean(cursor),
      },
    };
  }

  /**
   * Retrieves a single project by ID strictly scoped to the tenant.
   */
  async getProjectById(organizationId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        deletedAt: null,
      },
      include: {
        client: true,
        pm: {
          select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
        },
        members: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
            },
          },
        },
        assets: {
          where: { deletedAt: null },
        },
      },
    });

    if (!project) {
      throw AppError.notFound('Project not found');
    }

    return project;
  }

  /**
   * Creates a new project linked to an active client within the authenticated organization.
   */
  async createProject(ctx: ProjectServiceContext, rawInput: unknown) {
    const input = createProjectSchema.parse(rawInput);

    // 1. Verify client belongs to same organization and is active
    const client = await prisma.client.findFirst({
      where: {
        id: input.clientId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw AppError.notFound('Client not found');
    }

    // 2. Validate assigned PM if provided
    if (input.pmId) {
      const pmUser = await prisma.user.findFirst({
        where: {
          id: input.pmId,
          organizationId: ctx.organizationId,
          deletedAt: null,
        },
      });

      if (!pmUser) {
        throw AppError.notFound('Assigned Project Manager not found');
      }

      if (!ALLOWED_PM_ROLES.includes(pmUser.role as Role)) {
        throw AppError.validation('Assigned user must hold a Project Manager or Admin role');
      }
    }

    // 3. Timeline validation: startDate <= dueDate
    if (input.startDate && input.dueDate) {
      const start = new Date(input.startDate);
      const due = new Date(input.dueDate);
      if (start > due) {
        throw AppError.validation('Due date cannot precede start date');
      }
    }

    const project = await prisma.project.create({
      data: {
        organizationId: ctx.organizationId,
        createdBy: ctx.userId,
        clientId: input.clientId,
        name: input.name,
        description: input.description ?? null,
        stage: input.stage as PrismaProjectStage,
        pmId: input.pmId ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        budget: input.budget !== undefined && input.budget !== null ? new Prisma.Decimal(input.budget) : null,
        notes: input.notes ?? null,
      },
      include: {
        client: true,
        pm: true,
      },
    });

    // Record immutable audit entry
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'PROJECT_CREATED',
        entityType: 'project',
        entityId: project.id,
        ipAddress: ctx.ipAddress ?? null,
        newValues: {
          clientId: project.clientId,
          name: project.name,
          stage: project.stage,
          pmId: project.pmId,
          startDate: project.startDate,
          dueDate: project.dueDate,
          budget: project.budget ? project.budget.toString() : null,
        },
      },
    });

    return project;
  }

  /**
   * Partially updates a project.
   */
  async updateProject(ctx: ProjectServiceContext, projectId: string, rawInput: unknown) {
    const input = updateProjectSchema.parse(rawInput);

    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!existingProject) {
      throw AppError.notFound('Project not found');
    }

    // Validate assigned PM if updated
    if (input.pmId !== undefined && input.pmId !== null) {
      const pmUser = await prisma.user.findFirst({
        where: {
          id: input.pmId,
          organizationId: ctx.organizationId,
          deletedAt: null,
        },
      });

      if (!pmUser) {
        throw AppError.notFound('Assigned Project Manager not found');
      }

      if (!ALLOWED_PM_ROLES.includes(pmUser.role as Role)) {
        throw AppError.validation('Assigned user must hold a Project Manager or Admin role');
      }
    }

    // Timeline validation with persisted values
    const effectiveStart = input.startDate !== undefined
      ? (input.startDate ? new Date(input.startDate) : null)
      : existingProject.startDate;

    const effectiveDue = input.dueDate !== undefined
      ? (input.dueDate ? new Date(input.dueDate) : null)
      : existingProject.dueDate;

    if (effectiveStart && effectiveDue && effectiveStart > effectiveDue) {
      throw AppError.validation('Due date cannot precede start date');
    }

    const updateData: Prisma.ProjectUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.stage !== undefined) updateData.stage = input.stage as PrismaProjectStage;
    if (input.pmId !== undefined) {
      if (input.pmId) {
        updateData.pm = {
          connect: {
            organizationId_id: {
              organizationId: ctx.organizationId,
              id: input.pmId,
            },
          },
        };
      } else {
        // Disconnecting a composite relation where organizationId is non-nullable:
        // Set pmId directly to null on the model
        (updateData as Record<string, unknown>).pmId = null;
      }
    }
    if (input.startDate !== undefined) {
      updateData.startDate = input.startDate ? new Date(input.startDate) : null;
    }
    if (input.dueDate !== undefined) {
      updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }
    if (input.budget !== undefined) {
      updateData.budget = input.budget !== null ? new Prisma.Decimal(input.budget) : null;
    }
    if (input.notes !== undefined) updateData.notes = input.notes;

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        client: true,
        pm: true,
        members: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
            },
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'PROJECT_UPDATED',
        entityType: 'project',
        entityId: projectId,
        ipAddress: ctx.ipAddress ?? null,
        oldValues: {
          name: existingProject.name,
          stage: existingProject.stage,
          pmId: existingProject.pmId,
          startDate: existingProject.startDate,
          dueDate: existingProject.dueDate,
          budget: existingProject.budget ? existingProject.budget.toString() : null,
        },
        newValues: {
          name: updatedProject.name,
          stage: updatedProject.stage,
          pmId: updatedProject.pmId,
          startDate: updatedProject.startDate,
          dueDate: updatedProject.dueDate,
          budget: updatedProject.budget ? updatedProject.budget.toString() : null,
        },
      },
    });

    if (input.stage && input.stage !== existingProject.stage) {
      await prisma.auditLog.create({
        data: {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          action: 'PROJECT_STAGE_CHANGED',
          entityType: 'project',
          entityId: projectId,
          ipAddress: ctx.ipAddress ?? null,
          oldValues: { stage: existingProject.stage },
          newValues: { stage: updatedProject.stage },
        },
      });
    }

    return updatedProject;
  }

  /**
   * Soft-deletes a project.
   */
  async archiveProject(ctx: ProjectServiceContext, projectId: string) {
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!existingProject) {
      throw AppError.notFound('Project not found');
    }

    const now = new Date();

    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: now },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'PROJECT_ARCHIVED',
        entityType: 'project',
        entityId: projectId,
        ipAddress: ctx.ipAddress ?? null,
        oldValues: {
          name: existingProject.name,
          stage: existingProject.stage,
          archivedAt: null,
        },
        newValues: {
          archivedAt: now.toISOString(),
        },
      },
    });

    return { id: projectId, archived: true };
  }

  /**
   * Lists active team members for a project.
   */
  async listMembers(organizationId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw AppError.notFound('Project not found');
    }

    return prisma.projectMember.findMany({
      where: {
        projectId,
        organizationId,
        deletedAt: null,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Adds a team member to an active project.
   */
  async addMember(ctx: ProjectServiceContext, projectId: string, rawInput: unknown) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw AppError.notFound('Project not found');
    }

    const input = createProjectMemberSchema.parse(rawInput);

    // Verify user exists in the same tenant and is active
    const user = await prisma.user.findFirst({
      where: {
        id: input.userId,
        organizationId: ctx.organizationId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!user) {
      throw AppError.notFound('Target user not found');
    }

    // Check if user is already an active member of this project
    const existingMembership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: input.userId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (existingMembership) {
      throw AppError.conflict('User is already an active member of this project');
    }

    const member = await prisma.projectMember.create({
      data: {
        organizationId: ctx.organizationId,
        projectId,
        userId: input.userId,
        role: input.role ?? null,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'PROJECT_MEMBER_ADDED',
        entityType: 'project_member',
        entityId: member.id,
        ipAddress: ctx.ipAddress ?? null,
        newValues: {
          projectId,
          userId: member.userId,
          role: member.role,
        },
      },
    });

    return member;
  }

  /**
   * Updates a project member role.
   */
  async updateMember(
    ctx: ProjectServiceContext,
    projectId: string,
    memberId: string,
    rawInput: unknown
  ) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw AppError.notFound('Project not found');
    }

    const existingMember = await prisma.projectMember.findFirst({
      where: {
        id: memberId,
        projectId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!existingMember) {
      throw AppError.notFound('Project member not found');
    }

    const input = updateProjectMemberSchema.parse(rawInput);

    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: {
        role: input.role !== undefined ? input.role : existingMember.role,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'PROJECT_MEMBER_UPDATED',
        entityType: 'project_member',
        entityId: memberId,
        ipAddress: ctx.ipAddress ?? null,
        oldValues: { role: existingMember.role },
        newValues: { role: updatedMember.role },
      },
    });

    return updatedMember;
  }

  /**
   * Soft-deletes a project member.
   */
  async removeMember(
    ctx: ProjectServiceContext,
    projectId: string,
    memberId: string
  ) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw AppError.notFound('Project not found');
    }

    const existingMember = await prisma.projectMember.findFirst({
      where: {
        id: memberId,
        projectId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!existingMember) {
      throw AppError.notFound('Project member not found');
    }

    const now = new Date();
    await prisma.projectMember.update({
      where: { id: memberId },
      data: { deletedAt: now },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'PROJECT_MEMBER_REMOVED',
        entityType: 'project_member',
        entityId: memberId,
        ipAddress: ctx.ipAddress ?? null,
        oldValues: { userId: existingMember.userId, role: existingMember.role },
        newValues: { deletedAt: now.toISOString() },
      },
    });

    return { id: memberId, removed: true };
  }
}

export const projectsService = new ProjectsService();
