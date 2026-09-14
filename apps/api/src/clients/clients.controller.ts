import type { Request, Response, NextFunction } from 'express';
import type { ApiSuccessResponse, PaginatedApiResponse } from '@draftone/shared';
import { clientsService } from './clients.service.js';
import {
  clientIdParamSchema,
  clientScopedParamSchema,
  clientContactParamsSchema,
} from './clients.schemas.js';

export class ClientsController {
  async listClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const result = await clientsService.listClients(orgId, req.query);

      const response: PaginatedApiResponse<unknown> = {
        data: result.data,
        pagination: result.pagination,
        message: 'Clients retrieved successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async getClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = clientIdParamSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const client = await clientsService.getClientById(orgId, id);

      const response: ApiSuccessResponse<typeof client> = {
        data: client,
        message: 'Client retrieved successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async createClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const client = await clientsService.createClient(
        { organizationId: orgId, userId, ipAddress: req.ip },
        req.body
      );

      const response: ApiSuccessResponse<typeof client> = {
        data: client,
        message: 'Client created successfully',
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  async updateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = clientIdParamSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const client = await clientsService.updateClient(
        { organizationId: orgId, userId, ipAddress: req.ip },
        id,
        req.body
      );

      const response: ApiSuccessResponse<typeof client> = {
        data: client,
        message: 'Client updated successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async archiveClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = clientIdParamSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const result = await clientsService.archiveClient(
        { organizationId: orgId, userId, ipAddress: req.ip },
        id
      );

      const response: ApiSuccessResponse<typeof result> = {
        data: result,
        message: 'Client archived successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async listContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = clientScopedParamSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const contacts = await clientsService.listContacts(orgId, clientId);

      const response: ApiSuccessResponse<typeof contacts> = {
        data: contacts,
        message: 'Client contacts retrieved successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async createContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = clientScopedParamSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const contact = await clientsService.createContact(
        { organizationId: orgId, userId, ipAddress: req.ip },
        clientId,
        req.body
      );

      const response: ApiSuccessResponse<typeof contact> = {
        data: contact,
        message: 'Client contact created successfully',
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  async updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId, contactId } = clientContactParamsSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const contact = await clientsService.updateContact(
        { organizationId: orgId, userId, ipAddress: req.ip },
        clientId,
        contactId,
        req.body
      );

      const response: ApiSuccessResponse<typeof contact> = {
        data: contact,
        message: 'Client contact updated successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async deleteContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId, contactId } = clientContactParamsSchema.parse(req.params);
      const orgId = req.user!.organizationId;
      const userId = req.user!.id;
      const result = await clientsService.deleteContact(
        { organizationId: orgId, userId, ipAddress: req.ip },
        clientId,
        contactId
      );

      const response: ApiSuccessResponse<typeof result> = {
        data: result,
        message: 'Client contact deleted successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}

export const clientsController = new ClientsController();
