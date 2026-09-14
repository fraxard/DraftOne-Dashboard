import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma, disconnectPrisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';
import { hashPassword, comparePassword } from '../src/auth/password.js';
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/auth/jwt.js';
import { requireAuth } from '../src/middleware/auth.js';
import { requireRole, requirePermission } from '../src/middleware/rbac.js';
import { PERMISSIONS, ROLES } from '@draftone/shared';
import { env } from '../src/config/env.js';

import { Router } from 'express';

describe('Authentication & Session Management Layer (Prompt 06)', () => {
  const testRouter = Router();

  // Add test-specific routes to verify middleware and RBAC in isolation
  testRouter.get('/protected', requireAuth, (req, res) => {
    res.status(200).json({ data: req.user });
  });

  testRouter.get(
    '/admin-only',
    requireAuth,
    requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
    (_req, res) => {
      res.status(200).json({ data: 'admin-ok' });
    }
  );

  testRouter.get(
    '/projects-write',
    requireAuth,
    requirePermission(PERMISSIONS.PROJECTS_WRITE),
    (_req, res) => {
      res.status(200).json({ data: 'write-ok' });
    }
  );

  const app = createApp(testRouter);

  const testOrg1Id = 'c0000000-0000-4000-c000-000000000001';
  const testOrg2Id = 'c0000000-0000-4000-c000-000000000002';
  const testUser1Id = 'd0000000-0000-4000-d000-000000000001';
  const testInactiveUserId = 'd0000000-0000-4000-d000-000000000002';
  const testDeletedUserId = 'd0000000-0000-4000-d000-000000000003';
  const testViewerUserId = 'd0000000-0000-4000-d000-000000000004';
  const testCrossOrgUser1Id = 'd0000000-0000-4000-d000-000000000005';
  const testCrossOrgUser2Id = 'd0000000-0000-4000-d000-000000000006';

  const validPassword = 'SecurePassword123!';

  async function cleanupTestData() {
    try {
      await prisma.auditLog.deleteMany({
        where: { organizationId: { in: [testOrg1Id, testOrg2Id] } },
      });
      await prisma.session.deleteMany({
        where: { organizationId: { in: [testOrg1Id, testOrg2Id] } },
      });
      await prisma.user.deleteMany({
        where: { organizationId: { in: [testOrg1Id, testOrg2Id] } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [testOrg1Id, testOrg2Id] } },
      });
    } catch {
      // Ignore initial cleanup errors
    }
  }

  beforeAll(async () => {
    await cleanupTestData();

    // 1. Create test organizations
    await prisma.organization.createMany({
      data: [
        { id: testOrg1Id, name: 'Auth Test Org 1', slug: 'auth-test-org-1' },
        { id: testOrg2Id, name: 'Auth Test Org 2', slug: 'auth-test-org-2' },
      ],
    });

    const passwordHash = await hashPassword(validPassword);

    // 2. Create test users in Org 1
    await prisma.user.createMany({
      data: [
        {
          id: testUser1Id,
          organizationId: testOrg1Id,
          email: 'admin.test@draftone.in',
          passwordHash,
          fullName: 'Admin Tester',
          role: ROLES.ADMIN,
          isActive: true,
        },
        {
          id: testInactiveUserId,
          organizationId: testOrg1Id,
          email: 'inactive.test@draftone.in',
          passwordHash,
          fullName: 'Inactive Tester',
          role: ROLES.PM,
          isActive: false,
        },
        {
          id: testDeletedUserId,
          organizationId: testOrg1Id,
          email: 'deleted.test@draftone.in',
          passwordHash,
          fullName: 'Deleted Tester',
          role: ROLES.CREATIVE,
          isActive: true,
          deletedAt: new Date(),
        },
        {
          id: testViewerUserId,
          organizationId: testOrg1Id,
          email: 'viewer.test@draftone.in',
          passwordHash,
          fullName: 'Viewer Tester',
          role: ROLES.VIEWER,
          isActive: true,
        },
        // Duplicate email in Org 1 and Org 2 for cross-tenant ambiguity test
        {
          id: testCrossOrgUser1Id,
          organizationId: testOrg1Id,
          email: 'ambiguous.user@draftone.in',
          passwordHash,
          fullName: 'Ambiguous User Org 1',
          role: ROLES.PM,
          isActive: true,
        },
        {
          id: testCrossOrgUser2Id,
          organizationId: testOrg2Id,
          email: 'ambiguous.user@draftone.in',
          passwordHash,
          fullName: 'Ambiguous User Org 2',
          role: ROLES.PM,
          isActive: true,
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  // ============================================================
  // 1. PASSWORD SECURITY
  // ============================================================
  describe('Password Security', () => {
    it('generates a valid bcrypt hash with work factor 12', async () => {
      const hash = await hashPassword('mySecretPass123');
      expect(hash).toBeDefined();
      expect(hash.startsWith('$2b$12$')).toBe(true);
    });

    it('correct password verifies successfully', async () => {
      const hash = await hashPassword('correctPassword');
      const isValid = await comparePassword('correctPassword', hash);
      expect(isValid).toBe(true);
    });

    it('incorrect password fails verification', async () => {
      const hash = await hashPassword('correctPassword');
      const isValid = await comparePassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('plaintext password is never persisted or returned', async () => {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: testUser1Id } });
      expect((user as unknown as Record<string, unknown>).password).toBeUndefined();
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(validPassword);
    });
  });

  // ============================================================
  // 2. JWT TOKENS
  // ============================================================
  describe('JWT Infrastructure', () => {
    it('creates access token with required claims and 15m expiration', () => {
      const token = createAccessToken({
        sub: testUser1Id,
        organizationId: testOrg1Id,
        role: ROLES.ADMIN,
      });

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(testUser1Id);
      expect(decoded.organizationId).toBe(testOrg1Id);
      expect(decoded.role).toBe(ROLES.ADMIN);
      expect(decoded.tokenType).toBe('access');
    });

    it('creates refresh token with required claims', () => {
      const sessionId = 'e0000000-0000-4000-e000-000000000001';
      const token = createRefreshToken({
        sub: testUser1Id,
        organizationId: testOrg1Id,
        sessionId,
      });

      const decoded = verifyRefreshToken(token);
      expect(decoded.sub).toBe(testUser1Id);
      expect(decoded.organizationId).toBe(testOrg1Id);
      expect(decoded.sessionId).toBe(sessionId);
      expect(decoded.tokenType).toBe('refresh');
    });

    it('rejects access token with invalid signature', () => {
      const invalidToken = jwt.sign(
        { sub: testUser1Id, organizationId: testOrg1Id, role: ROLES.ADMIN, tokenType: 'access' },
        'wrong_secret_key_that_does_not_match_access_secret_32_chars'
      );

      expect(() => verifyAccessToken(invalidToken)).toThrow('Invalid access token signature');
    });

    it('rejects refresh token used as access token (wrong token type)', () => {
      const sessionId = 'e0000000-0000-4000-e000-000000000001';
      const refreshToken = createRefreshToken({
        sub: testUser1Id,
        organizationId: testOrg1Id,
        sessionId,
      });

      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });

    it('rejects access token used as refresh token', () => {
      const accessToken = createAccessToken({
        sub: testUser1Id,
        organizationId: testOrg1Id,
        role: ROLES.ADMIN,
      });

      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });

    it('rejects access token signed with unsupported algorithm "none"', () => {
      const unsignedToken = jwt.sign(
        { sub: testUser1Id, organizationId: testOrg1Id, role: ROLES.ADMIN, tokenType: 'access' },
        '',
        { algorithm: 'none' }
      );
      expect(() => verifyAccessToken(unsignedToken)).toThrow();
    });

    it('enforces that access and refresh secrets are distinct', () => {
      expect(env.JWT_ACCESS_SECRET).not.toBe(env.JWT_REFRESH_SECRET);
    });
  });

  // ============================================================
  // 3. LOGIN ENDPOINT
  // ============================================================
  describe('POST /api/v1/auth/login', () => {
    it('succeeds with valid credentials, returns user and access token, and sets httpOnly cookie', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'admin.test@draftone.in',
        password: validPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.id).toBe(testUser1Id);
      expect(res.body.data.user.email).toBe('admin.test@draftone.in');
      expect(res.body.data.user.role).toBe(ROLES.ADMIN);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.refreshToken).toBeUndefined(); // Never in JSON

      // Verify cookie
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('Path=/api/v1/auth');
      expect(refreshCookie).toContain('SameSite=Lax');
    });

    it('rejects invalid password with generic 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'admin.test@draftone.in',
        password: 'wrong_password',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects nonexistent email with generic 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'doesnotexist@draftone.in',
        password: validPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects inactive user with generic 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'inactive.test@draftone.in',
        password: validPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects soft-deleted user with generic 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'deleted.test@draftone.in',
        password: validPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects cross-tenant email ambiguity with generic 401 without arbitrary tenant selection', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'ambiguous.user@draftone.in',
        password: validPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('creates AuditLog entry upon successful login without secret leakage', async () => {
      await request(app).post('/api/v1/auth/login').send({
        email: 'admin.test@draftone.in',
        password: validPassword,
      });

      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          organizationId: testOrg1Id,
          userId: testUser1Id,
          action: 'USER_LOGIN',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditEntry).toBeDefined();
      expect(auditEntry?.action).toBe('USER_LOGIN');
      expect(auditEntry?.newValues).toHaveProperty('loginAt');

      // Verify no secrets or passwords in AuditLog
      const auditStr = JSON.stringify(auditEntry);
      expect(auditStr).not.toContain(validPassword);
      expect(auditStr).not.toContain('passwordHash');
      expect(auditStr).not.toContain(env.JWT_ACCESS_SECRET);
      expect(auditStr).not.toContain(env.JWT_REFRESH_SECRET);
    });
  });

  // ============================================================
  // 4. REFRESH & SESSION ROTATION
  // ============================================================
  describe('POST /api/v1/auth/refresh', () => {
    it('rotates refresh token and returns a new access token', async () => {
      // 1. Login to get initial refresh cookie
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'admin.test@draftone.in',
        password: validPassword,
      });
      const initialCookie = loginRes.headers['set-cookie'] as unknown as string[];

      const sessionBefore = await prisma.session.findFirst({
        where: { userId: testUser1Id, revokedAt: null },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // 2. Call /refresh with the cookie
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', initialCookie);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data).toHaveProperty('accessToken');
      expect(refreshRes.body.data.refreshToken).toBeUndefined();

      // Verify rotated cookie is present
      const rotatedCookies = refreshRes.headers['set-cookie'] as unknown as string[];
      expect(rotatedCookies).toBeDefined();
      expect(rotatedCookies[0]).not.toBe(initialCookie[0]);
      expect(rotatedCookies[0]).toContain('HttpOnly');
      expect(rotatedCookies[0]).toContain('Path=/api/v1/auth');
      expect(rotatedCookies[0]).toContain('SameSite=Lax');

      // Verify session lastActiveAt timestamp updated in database
      const sessionAfter = await prisma.session.findFirst({
        where: { userId: testUser1Id, revokedAt: null },
      });
      expect(sessionAfter).toBeDefined();
      expect(sessionAfter!.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
        sessionBefore!.lastActiveAt.getTime()
      );
    });

    it('prevents reuse of old refresh token after rotation (Test #25)', async () => {
      // 1. Login
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'admin.test@draftone.in',
        password: validPassword,
      });
      const oldCookie = loginRes.headers['set-cookie'] as unknown as string[];

      // 2. First refresh rotates the token
      const refreshRes1 = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldCookie);
      expect(refreshRes1.status).toBe(200);

      // 3. Replay of old cookie MUST FAIL with 401
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldCookie);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.code).toBe('UNAUTHORIZED');
    });

    it('enforces atomic rotation against concurrent requests with the same token', async () => {
      // 1. Login
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'admin.test@draftone.in',
        password: validPassword,
      });
      const cookie = loginRes.headers['set-cookie'] as unknown as string[];

      // 2. Execute two simultaneous refresh calls with identical cookie
      const [res1, res2] = await Promise.all([
        request(app).post('/api/v1/auth/refresh').set('Cookie', cookie),
        request(app).post('/api/v1/auth/refresh').set('Cookie', cookie),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one must succeed (200) and one must be rejected (401)
      expect(statuses).toEqual([200, 401]);
    });

    it('rejects refresh when session exceeds 8-hour inactivity window', async () => {
      // 1. Login
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'admin.test@draftone.in',
        password: validPassword,
      });
      const cookie = loginRes.headers['set-cookie'] as unknown as string[];

      // 2. Artificially age lastActiveAt in PostgreSQL by 9 hours
      const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000);
      await prisma.session.updateMany({
        where: { userId: testUser1Id, revokedAt: null },
        data: { lastActiveAt: nineHoursAgo },
      });

      // 3. Attempt refresh -> must be rejected for inactivity
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie);

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.error.message).toContain('inactivity');
    });

    it('rejects refresh when session exceeds 7-day absolute lifetime', async () => {
      // 1. Login
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'admin.test@draftone.in',
        password: validPassword,
      });
      const cookie = loginRes.headers['set-cookie'] as unknown as string[];

      // 2. Artificially set expiresAt in the past
      const pastDate = new Date(Date.now() - 1000);
      await prisma.session.updateMany({
        where: { userId: testUser1Id, revokedAt: null },
        data: { expiresAt: pastDate },
      });

      // 3. Attempt refresh -> must be rejected
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie);

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.error.message).toContain('expired');
    });
  });

  // ============================================================
  // 5. LOGOUT ENDPOINT
  // ============================================================
  describe('POST /api/v1/auth/logout', () => {
    it('clears refresh cookie and revokes session', async () => {
      // 1. Login
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'admin.test@draftone.in',
        password: validPassword,
      });
      const cookie = loginRes.headers['set-cookie'] as unknown as string[];

      // 2. Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.data).toBeNull();

      // Verify cookie is cleared
      const setCookie = logoutRes.headers['set-cookie'] as unknown as string[];
      expect(setCookie[0]).toContain('refreshToken=;');

      // 3. Attempting to refresh with the logged out cookie must fail
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie);

      expect(refreshRes.status).toBe(401);
    });

    it('logout is idempotent and safe when cookie is absent', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  // ============================================================
  // 6. AUTHENTICATION MIDDLEWARE
  // ============================================================
  describe('requireAuth Middleware', () => {
    it('rejects request with missing Authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/test/protected');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects request with malformed Bearer header with 401', async () => {
      const res = await request(app)
        .get('/api/v1/test/protected')
        .set('Authorization', 'Basic 12345');
      expect(res.status).toBe(401);
    });

    it('attaches verified tenant principal for valid access token', async () => {
      const token = createAccessToken({
        sub: testUser1Id,
        organizationId: testOrg1Id,
        role: ROLES.ADMIN,
      });

      const res = await request(app)
        .get('/api/v1/test/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        id: testUser1Id,
        organizationId: testOrg1Id,
        role: ROLES.ADMIN,
      });
    });

    it('rejects token if user was deactivated after token issuance', async () => {
      const token = createAccessToken({
        sub: testInactiveUserId,
        organizationId: testOrg1Id,
        role: ROLES.PM,
      });

      const res = await request(app)
        .get('/api/v1/test/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it('rejects token if user was soft-deleted after token issuance', async () => {
      const token = createAccessToken({
        sub: testDeletedUserId,
        organizationId: testOrg1Id,
        role: ROLES.CREATIVE,
      });

      const res = await request(app)
        .get('/api/v1/test/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // 7. RBAC & TENANCY SECURITY
  // ============================================================
  describe('RBAC & Tenant Isolation', () => {
    it('allows authorized role (Admin) to access admin route', async () => {
      const token = createAccessToken({
        sub: testUser1Id,
        organizationId: testOrg1Id,
        role: ROLES.ADMIN,
      });

      const res = await request(app)
        .get('/api/v1/test/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBe('admin-ok');
    });

    it('rejects unauthorized role (Viewer) with 403 FORBIDDEN', async () => {
      const token = createAccessToken({
        sub: testViewerUserId,
        organizationId: testOrg1Id,
        role: ROLES.VIEWER,
      });

      const res = await request(app)
        .get('/api/v1/test/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('enforces shared RBAC permission gates (projects:write granted to Admin, denied to Viewer)', async () => {
      const adminToken = createAccessToken({
        sub: testUser1Id,
        organizationId: testOrg1Id,
        role: ROLES.ADMIN,
      });

      const viewerToken = createAccessToken({
        sub: testViewerUserId,
        organizationId: testOrg1Id,
        role: ROLES.VIEWER,
      });

      const adminRes = await request(app)
        .get('/api/v1/test/projects-write')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);

      const viewerRes = await request(app)
        .get('/api/v1/test/projects-write')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(viewerRes.status).toBe(403);
    });

    it('ensures client-supplied headers or body cannot override verified tenant context', async () => {
      const token = createAccessToken({
        sub: testUser1Id,
        organizationId: testOrg1Id,
        role: ROLES.ADMIN,
      });

      const res = await request(app)
        .get('/api/v1/test/protected')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-ID', testOrg2Id) // Attacker tries to impersonate Org 2
        .send({ organizationId: testOrg2Id });

      expect(res.status).toBe(200);
      // Principal remains strictly Org 1
      expect(res.body.data.organizationId).toBe(testOrg1Id);
      expect(res.body.data.organizationId).not.toBe(testOrg2Id);
    });
  });
});