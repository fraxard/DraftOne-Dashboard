import { Router, type Request, type Response } from 'express';
import type { ApiSuccessResponse } from '@draftone/shared';

export interface HealthStatusData {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  uptimeSeconds: number;
}

export const healthRouter: Router = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const response: ApiSuccessResponse<HealthStatusData> = {
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: 'v1',
      uptimeSeconds: Math.floor(process.uptime()),
    },
    message: 'API is healthy',
  };

  res.status(200).json(response);
});