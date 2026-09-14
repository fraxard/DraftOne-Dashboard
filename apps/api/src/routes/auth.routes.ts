import { Router, type Request, type Response, type NextFunction } from 'express';
import type { ApiSuccessResponse } from '@draftone/shared';
import { authService, REFRESH_COOKIE_NAME, getRefreshCookieOptions } from '../auth/auth.service.js';
import type { AuthUserDto } from '../auth/types.js';

export interface LoginResponseData {
  user: AuthUserDto;
  accessToken: string;
}

export interface RefreshResponseData {
  accessToken: string;
}

export const authRouter: Router = Router();

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.login(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getRefreshCookieOptions());

    const response: ApiSuccessResponse<LoginResponseData> = {
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
      message: 'Login successful',
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const result = await authService.refresh(cookieToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.cookie(REFRESH_COOKIE_NAME, result.newRefreshToken, getRefreshCookieOptions());

    const response: ApiSuccessResponse<RefreshResponseData> = {
      data: {
        accessToken: result.accessToken,
      },
      message: 'Token refreshed successfully',
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(cookieToken);

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());

    const response: ApiSuccessResponse<null> = {
      data: null,
      message: 'Logged out successfully',
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});