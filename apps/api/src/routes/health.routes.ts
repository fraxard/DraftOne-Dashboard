import { Router, type Request, type Response } from 'express';
import type { ApiSuccessResponse } from '@draftone/shared';

export interface HealthStatusData {
  status: 'ok';
}

export const healthRouter: Router = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const response: ApiSuccessResponse<HealthStatusData> = {
    data: {
      status: 'ok',
    },
    message: 'API is healthy',
  };

  res.status(200).json(response);
});