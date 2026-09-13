import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env if present
dotenv.config();

const INSECURE_SECRET_VALUES = new Set([
  'secret',
  'password',
  'changeme',
  'development',
  'test',
  '12345678',
  'jwt_secret',
  'dev_access_secret_only_for_local_testing_min32chars',
  'dev_refresh_secret_only_for_local_testing_min32chars',
]);

export const rawEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().trim().default('0.0.0.0'),
    DATABASE_URL: z
      .string()
      .trim()
      .default('postgresql://postgres:postgres@localhost:5432/draftone_dev'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((val) =>
        val
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      ),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    JWT_ACCESS_SECRET: z
      .string()
      .trim()
      .default('dev_access_secret_only_for_local_testing_min32chars'),
    JWT_REFRESH_SECRET: z
      .string()
      .trim()
      .default('dev_refresh_secret_only_for_local_testing_min32chars'),
    REDIS_URL: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (
        data.DATABASE_URL.includes('draftone_dev') ||
        !data.DATABASE_URL.startsWith('postgres')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'Valid production DATABASE_URL must be specified',
        });
      }

      if (
        data.JWT_ACCESS_SECRET.length < 32 ||
        INSECURE_SECRET_VALUES.has(data.JWT_ACCESS_SECRET.toLowerCase())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message:
            'JWT_ACCESS_SECRET must be at least 32 characters and cannot be a default or insecure value in production',
        });
      }

      if (
        data.JWT_REFRESH_SECRET.length < 32 ||
        INSECURE_SECRET_VALUES.has(data.JWT_REFRESH_SECRET.toLowerCase())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message:
            'JWT_REFRESH_SECRET must be at least 32 characters and cannot be a default or insecure value in production',
        });
      }

      if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message:
            'JWT_REFRESH_SECRET must be distinct from JWT_ACCESS_SECRET in production',
        });
      }
    }
  });

export type Env = z.infer<typeof rawEnvSchema>;

export function validateEnv(customEnv?: Record<string, unknown>): Env {
  const parsed = rawEnvSchema.safeParse(customEnv ?? process.env);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`\n[FATAL] Environment validation failed:\n${errorMessages}\n`);
  }
  return parsed.data;
}

export const env: Env = validateEnv();