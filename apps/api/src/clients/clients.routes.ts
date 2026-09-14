import { Router } from 'express';
import { PERMISSIONS } from '@draftone/shared';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { clientsController } from './clients.controller.js';

export const clientsRouter: Router = Router();

// Apply requireAuth to all client routes
clientsRouter.use(requireAuth);

// Client CRUD routes
clientsRouter.get(
  '/',
  requirePermission(PERMISSIONS.CLIENTS_READ),
  clientsController.listClients.bind(clientsController)
);

clientsRouter.post(
  '/',
  requirePermission(PERMISSIONS.CLIENTS_WRITE),
  clientsController.createClient.bind(clientsController)
);

clientsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.CLIENTS_READ),
  clientsController.getClient.bind(clientsController)
);

clientsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.CLIENTS_WRITE),
  clientsController.updateClient.bind(clientsController)
);

clientsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.CLIENTS_WRITE),
  clientsController.archiveClient.bind(clientsController)
);

// Client Contact nested routes
clientsRouter.get(
  '/:clientId/contacts',
  requirePermission(PERMISSIONS.CLIENTS_READ),
  clientsController.listContacts.bind(clientsController)
);

clientsRouter.post(
  '/:clientId/contacts',
  requirePermission(PERMISSIONS.CLIENTS_WRITE),
  clientsController.createContact.bind(clientsController)
);

clientsRouter.patch(
  '/:clientId/contacts/:contactId',
  requirePermission(PERMISSIONS.CLIENTS_WRITE),
  clientsController.updateContact.bind(clientsController)
);

clientsRouter.delete(
  '/:clientId/contacts/:contactId',
  requirePermission(PERMISSIONS.CLIENTS_WRITE),
  clientsController.deleteContact.bind(clientsController)
);
