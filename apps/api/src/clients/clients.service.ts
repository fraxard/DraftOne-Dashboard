import type { Role } from '@draftone/shared';
import { ROLES } from '@draftone/shared';
import type { Prisma, ClientStatus as PrismaClientStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/app-error.js';
import {
  createClientSchema,
  updateClientSchema,
  clientQuerySchema,
  createClientContactSchema,
  updateClientContactSchema,
  type ClientQueryParams,
} from './clients.schemas.js';

const ALLOWED_PM_ROLES: readonly Role[] = [ROLES.PM, ROLES.ADMIN, ROLES.SUPER_ADMIN];

export interface ClientServiceContext {
  organizationId: string;
  userId: string;
  ipAddress?: string;
}

export class ClientsService {
  /**
   * Retrieves a paginated list of clients scoped strictly to the authenticated organization.
   */
  async listClients(organizationId: string, rawQuery: unknown) {
    const query = clientQuerySchema.parse(rawQuery);
    const limit = query.limit ?? 20;
    const page = query.page;
    const cursor = query.cursor;

    // Base multi-tenant filter: MUST always filter by organizationId and deletedAt: null
    const where: Prisma.ClientWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status as PrismaClientStatus;
    }

    if (query.industry) {
      where.industry = {
        equals: query.industry,
        mode: 'insensitive',
      };
    }

    if (query.assignedPmId) {
      where.assignedPmId = query.assignedPmId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { industry: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.client.count({ where });

    let items: Array<Awaited<ReturnType<typeof prisma.client.findMany>>[number]>;
    let hasMore = false;
    let nextCursor: string | null = null;
    let totalPages: number | undefined = undefined;

    if (page !== undefined && page > 0) {
      const skip = (page - 1) * limit;
      totalPages = Math.ceil(total / limit);
      items = await prisma.client.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          contacts: {
            where: { deletedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      });
      hasMore = page < totalPages;
      const lastItem = items[items.length - 1];
      nextCursor = lastItem ? lastItem.id : null;
    } else {
      // Cursor-based or default first page
      items = await prisma.client.findMany({
        where,
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          contacts: {
            where: { deletedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
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
   * Retrieves a single client by ID strictly scoped to the tenant.
   * Cross-tenant requests behave identically to non-existent records (404).
   */
  async getClientById(organizationId: string, clientId: string) {
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId,
        deletedAt: null,
      },
      include: {
        contacts: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!client) {
      throw AppError.notFound('Client not found');
    }

    return client;
  }

  /**
   * Creates a new client profile scoped to the authenticated organization.
   */
  async createClient(ctx: ClientServiceContext, rawInput: unknown) {
    const input = createClientSchema.parse(rawInput);

    // Validate assigned PM if provided
    if (input.assignedPmId) {
      const pmUser = await prisma.user.findFirst({
        where: {
          id: input.assignedPmId,
          organizationId: ctx.organizationId,
          deletedAt: null,
        },
      });

      if (!pmUser) {
        throw AppError.badRequest('Assigned Project Manager does not exist in this organization');
      }

      if (!ALLOWED_PM_ROLES.includes(pmUser.role as Role)) {
        throw AppError.badRequest('Assigned user must hold a Project Manager or Admin role');
      }
    }

    const client = await prisma.client.create({
      data: {
        organizationId: ctx.organizationId,
        createdBy: ctx.userId,
        name: input.name,
        industry: input.industry ?? null,
        status: input.status as PrismaClientStatus,
        assignedPmId: input.assignedPmId ?? null,
        website: input.website ? input.website : null,
        notes: input.notes ?? null,
      },
      include: {
        contacts: {
          where: { deletedAt: null },
        },
      },
    });

    // Record immutable audit entry
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'CLIENT_CREATED',
        entityType: 'client',
        entityId: client.id,
        ipAddress: ctx.ipAddress ?? null,
        newValues: {
          name: client.name,
          industry: client.industry,
          status: client.status,
          assignedPmId: client.assignedPmId,
          website: client.website,
        },
      },
    });

    return client;
  }

  /**
   * Partially updates an existing client.
   * Disallows changing immutable fields (id, organizationId, createdBy, createdAt, deletedAt).
   */
  async updateClient(ctx: ClientServiceContext, clientId: string, rawInput: unknown) {
    const input = updateClientSchema.parse(rawInput);

    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!existingClient) {
      throw AppError.notFound('Client not found');
    }

    if (input.assignedPmId !== undefined && input.assignedPmId !== null) {
      const pmUser = await prisma.user.findFirst({
        where: {
          id: input.assignedPmId,
          organizationId: ctx.organizationId,
          deletedAt: null,
        },
      });

      if (!pmUser) {
        throw AppError.badRequest('Assigned Project Manager does not exist in this organization');
      }

      if (!ALLOWED_PM_ROLES.includes(pmUser.role as Role)) {
        throw AppError.badRequest('Assigned user must hold a Project Manager or Admin role');
      }
    }

    const updateData: Prisma.ClientUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.industry !== undefined) updateData.industry = input.industry;
    if (input.status !== undefined) updateData.status = input.status as PrismaClientStatus;
    if (input.assignedPmId !== undefined) {
      updateData.assignedPm = input.assignedPmId
        ? {
            connect: {
              organizationId_id: {
                organizationId: ctx.organizationId,
                id: input.assignedPmId,
              },
            },
          }
        : { disconnect: true };
    }
    if (input.website !== undefined) updateData.website = input.website ? input.website : null;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
      include: {
        contacts: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'CLIENT_UPDATED',
        entityType: 'client',
        entityId: clientId,
        ipAddress: ctx.ipAddress ?? null,
        oldValues: {
          name: existingClient.name,
          industry: existingClient.industry,
          status: existingClient.status,
          assignedPmId: existingClient.assignedPmId,
          website: existingClient.website,
        },
        newValues: {
          name: updatedClient.name,
          industry: updatedClient.industry,
          status: updatedClient.status,
          assignedPmId: updatedClient.assignedPmId,
          website: updatedClient.website,
        },
      },
    });

    return updatedClient;
  }

  /**
   * Soft-deletes (archives) a client.
   * Physically preserves the record to protect relational integrity with projects and invoices.
   */
  async archiveClient(ctx: ClientServiceContext, clientId: string) {
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!existingClient) {
      throw AppError.notFound('Client not found');
    }

    const now = new Date();

    await prisma.client.update({
      where: { id: clientId },
      data: { deletedAt: now },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'CLIENT_ARCHIVED',
        entityType: 'client',
        entityId: clientId,
        ipAddress: ctx.ipAddress ?? null,
        oldValues: {
          name: existingClient.name,
          status: existingClient.status,
          archivedAt: null,
        },
        newValues: {
          archivedAt: now.toISOString(),
        },
      },
    });

    return { id: clientId, archived: true };
  }

  /**
   * Lists all active contacts for a client.
   */
  async listContacts(organizationId: string, clientId: string) {
    // Verify client exists and is not archived
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw AppError.notFound('Client not found');
    }

    return prisma.clientContact.findMany({
      where: {
        clientId,
        organizationId,
        deletedAt: null,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Creates a contact for an active client.
   */
  async createContact(ctx: ClientServiceContext, clientId: string, rawInput: unknown) {
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw AppError.notFound('Client not found');
    }

    const input = createClientContactSchema.parse(rawInput);

    if (input.isPrimary) {
      await prisma.clientContact.updateMany({
        where: {
          clientId,
          organizationId: ctx.organizationId,
          isPrimary: true,
          deletedAt: null,
        },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.clientContact.create({
      data: {
        organizationId: ctx.organizationId,
        clientId,
        name: input.name,
        email: input.email ? input.email : null,
        phone: input.phone ?? null,
        designation: input.designation ?? null,
        isPrimary: input.isPrimary ?? false,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'CLIENT_CONTACT_CREATED',
        entityType: 'client_contact',
        entityId: contact.id,
        ipAddress: ctx.ipAddress ?? null,
        newValues: {
          clientId,
          name: contact.name,
          email: contact.email,
          designation: contact.designation,
          isPrimary: contact.isPrimary,
        },
      },
    });

    return contact;
  }

  /**
   * Updates an existing contact for an active client.
   */
  async updateContact(
    ctx: ClientServiceContext,
    clientId: string,
    contactId: string,
    rawInput: unknown
  ) {
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw AppError.notFound('Client not found');
    }

    const existingContact = await prisma.clientContact.findFirst({
      where: {
        id: contactId,
        clientId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!existingContact) {
      throw AppError.notFound('Contact not found');
    }

    const input = updateClientContactSchema.parse(rawInput);

    if (input.isPrimary) {
      await prisma.clientContact.updateMany({
        where: {
          clientId,
          organizationId: ctx.organizationId,
          isPrimary: true,
          deletedAt: null,
          NOT: { id: contactId },
        },
        data: { isPrimary: false },
      });
    }

    const updateData: Parameters<typeof prisma.clientContact.update>[0]['data'] = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email ? input.email : null;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.designation !== undefined) updateData.designation = input.designation;
    if (input.isPrimary !== undefined) updateData.isPrimary = input.isPrimary;

    const updatedContact = await prisma.clientContact.update({
      where: { id: contactId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'CLIENT_CONTACT_UPDATED',
        entityType: 'client_contact',
        entityId: contactId,
        ipAddress: ctx.ipAddress ?? null,
        oldValues: {
          name: existingContact.name,
          email: existingContact.email,
          isPrimary: existingContact.isPrimary,
        },
        newValues: {
          name: updatedContact.name,
          email: updatedContact.email,
          isPrimary: updatedContact.isPrimary,
        },
      },
    });

    return updatedContact;
  }

  /**
   * Soft-deletes a contact.
   */
  async deleteContact(
    ctx: ClientServiceContext,
    clientId: string,
    contactId: string
  ) {
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw AppError.notFound('Client not found');
    }

    const existingContact = await prisma.clientContact.findFirst({
      where: {
        id: contactId,
        clientId,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
    });

    if (!existingContact) {
      throw AppError.notFound('Contact not found');
    }

    const now = new Date();
    await prisma.clientContact.update({
      where: { id: contactId },
      data: { deletedAt: now },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'CLIENT_CONTACT_DELETED',
        entityType: 'client_contact',
        entityId: contactId,
        ipAddress: ctx.ipAddress ?? null,
        oldValues: {
          name: existingContact.name,
          deletedAt: null,
        },
        newValues: {
          deletedAt: now.toISOString(),
        },
      },
    });

    return { id: contactId, deleted: true };
  }
}

export const clientsService = new ClientsService();
