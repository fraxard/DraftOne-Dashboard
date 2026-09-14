import { z } from 'zod';
import {
  createClientSchema,
  updateClientSchema,
  clientQuerySchema,
  createClientContactSchema,
  updateClientContactSchema,
  uuidSchema,
  type CreateClientInput,
  type UpdateClientInput,
  type CreateClientContactInput,
  type UpdateClientContactInput,
} from '@draftone/shared';

export {
  createClientSchema,
  updateClientSchema,
  clientQuerySchema,
  createClientContactSchema,
  updateClientContactSchema,
  type CreateClientInput,
  type UpdateClientInput,
  type CreateClientContactInput,
  type UpdateClientContactInput,
};

export const clientIdParamSchema = z.object({
  id: uuidSchema,
});

export const clientScopedParamSchema = z.object({
  clientId: uuidSchema,
});

export const clientContactParamsSchema = z.object({
  clientId: uuidSchema,
  contactId: uuidSchema,
});

export type ClientQueryParams = z.infer<typeof clientQuerySchema>;
