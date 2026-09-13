import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { validateEnv } from '../src/config/env.js';
import { AppError } from '../src/lib/app-error.js';
import { API_ERROR_CODES } from '@draftone/shared';

describe('API Foundation', () => {
  const app = createApp();

  describe('Health Endpoint (GET /api/v1/health)', () => {
    it('returns HTTP 200 with canonical success envelope', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.version).toBe('v1');
      expect(typeof res.body.data.timestamp).toBe('string');
      expect(typeof res.body.data.uptimeSeconds).toBe('number');
      expect(res.body.message).toBe('API is healthy');
    });
  });

  describe('Unknown Routes (404 Handling)', () => {
    it('returns HTTP 404 with canonical error envelope', async () => {
      const res = await request(app).get('/api/v1/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe(API_ERROR_CODES.NOT_FOUND);
      expect(res.body.error.message).toContain('Route not found');
    });
  });

  describe('Request ID / Correlation', () => {
    it('generates an X-Request-ID header when none is provided', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.headers).toHaveProperty('x-request-id');
      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('propagates a valid incoming X-Request-ID header', async () => {
      const customId = '123e4567-e89b-12d3-a456-426614174000';
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Request-ID', customId);
      expect(res.headers['x-request-id']).toBe(customId);
    });
  });

  describe('Error Handling Integration', () => {
    it('formats AppError into canonical ApiErrorResponse', () => {
      const appErr = AppError.badRequest('Invalid parameter', [
        { field: 'test', message: 'Test error message' },
      ]);
      expect(appErr.statusCode).toBe(400);
      expect(appErr.code).toBe(API_ERROR_CODES.BAD_REQUEST);
      expect(appErr.details).toHaveLength(1);
    });

    it('handles malformed JSON with BAD_REQUEST 400', async () => {
      const res = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send('{"invalid-json": ');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(API_ERROR_CODES.BAD_REQUEST);
    });
  });

  describe('CORS Policy', () => {
    it('allows requests from configured origin', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:5173');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('rejects unauthorized browser origins with FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://malicious-website.com');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.FORBIDDEN);
      expect(res.body.error.message).toContain('not allowed by CORS policy');
    });
  });

  describe('Environment Validation', () => {
    it('fails fast on missing or insecure production secrets', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/draftone_dev',
          JWT_ACCESS_SECRET: 'short',
          JWT_REFRESH_SECRET: 'short',
        })
      ).toThrowError(/Environment validation failed/);
    });

    it('validates a valid production configuration', () => {
      const validProdEnv = validateEnv({
        NODE_ENV: 'production',
        PORT: '4000',
        DATABASE_URL: 'postgresql://prod_user:strong_password@prod_host:5432/draftone_prod',
        CORS_ORIGINS: 'https://dashboard.draftone.in',
        LOG_LEVEL: 'info',
        JWT_ACCESS_SECRET: 'a_very_secure_production_access_secret_32_chars_long',
        JWT_REFRESH_SECRET: 'a_very_secure_production_refresh_secret_32_chars_long',
      });
      expect(validProdEnv.NODE_ENV).toBe('production');
      expect(validProdEnv.CORS_ORIGINS).toEqual(['https://dashboard.draftone.in']);
      expect(validProdEnv.LOG_LEVEL).toBe('info');
    });
  });
});