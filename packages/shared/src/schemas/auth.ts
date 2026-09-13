import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Valid email address is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

/**
 * Validates the refresh token when read from secure httpOnly cookies.
 * Refresh tokens MUST NEVER be sent or accepted via JSON request bodies.
 */
export const refreshTokenCookieSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token cookie is required' }),
});