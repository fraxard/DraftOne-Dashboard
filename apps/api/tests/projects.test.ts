import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma, disconnectPrisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/auth/jwt.js';
import { hashPassword } from '../src/auth/password.js';
import { ROLES, PROJECT_STAGES } from '@draftone/shared';

describe('Project Management Backend Layer (Prompt 08)', () => {
  const app = createApp();

  // Test Organizations
  const orgAId = 'a2000000-0000-4000-a000-000000000001';
  const orgBId = 'a2000000-0000-4000-a000-000000000002';

  // Test Users for Org A
  const superAdminId = 'b2000000-0000-4000-b000-000000000001';
  const adminId = 'b2000000-0000-4000-b000-000000000002';
  const pmId = 'b2000000-0000-4000-b000-000000000003';
  const viewerId = 'b2000000-0000-4000-b000-000000000004';
  const financeId = 'b2000000-0000-4000-b000-000000000005';
  const creativeId = 'b2000000-0000-4000-b000-000000000006';

  // Test Users for Org B
  const orgBAdminId = 'b2000000-0000-4000-b000-000000000007';
  const orgBPmId = 'b2000000-0000-4000-b000-000000000008';

  // Test Clients
  const clientA1Id = 'c2000000-0000-4000-c000-000000000001';
  const clientAArchivedId = 'c2000000-0000-4000-c000-000000000002';
  const clientB1Id = 'c2000000-0000-4000-c000-000000000003';

  // JWT Access Tokens
  let superAdminToken: string;
  let adminToken: string;
  let pmToken: string;
  let viewerToken: string;
  let financeToken: string;
  let creativeToken: string;
  let orgBAdminToken: string;
  let orgBPmToken: string;

  async function cleanupData() {
    try {
      await prisma.auditLog.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.asset.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.projectMember.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.project.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.clientContact.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.client.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.session.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.user.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [orgAId, orgBId] } },
      });
    } catch {
      // Ignore initial errors
    }
  }

  beforeAll(async () => {
    await cleanupData();

    // 1. Create test organizations
    await prisma.organization.createMany({
      data: [
        { id: orgAId, name: 'Projects Test Org A', slug: 'projects-test-org-a' },
        { id: orgBId, name: 'Projects Test Org B', slug: 'projects-test-org-b' },
      ],
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create users
    await prisma.user.createMany({
      data: [
        {
          id: superAdminId,
          organizationId: orgAId,
          email: 'superadmin@proj.test',
          passwordHash,
          fullName: 'Super Admin Proj',
          role: ROLES.SUPER_ADMIN,
        },
        {
          id: adminId,
          organizationId: orgAId,
          email: 'admin@proj.test',
          passwordHash,
          fullName: 'Admin Proj',
          role: ROLES.ADMIN,
        },
        {
          id: pmId,
          organizationId: orgAId,
          email: 'pm@proj.test',
          passwordHash,
          fullName: 'PM Proj',
          role: ROLES.PM,
        },
        {
          id: viewerId,
          organizationId: orgAId,
          email: 'viewer@proj.test',
          passwordHash,
          fullName: 'Viewer Proj',
          role: ROLES.VIEWER,
        },
        {
          id: financeId,
          organizationId: orgAId,
          email: 'finance@proj.test',
          passwordHash,
          fullName: 'Finance Proj',
          role: ROLES.FINANCE,
        },
        {
          id: creativeId,
          organizationId: orgAId,
          email: 'creative@proj.test',
          passwordHash,
          fullName: 'Creative Proj',
          role: ROLES.CREATIVE,
        },
        {
          id: orgBAdminId,
          organizationId: orgBId,
          email: 'adminb@proj.test',
          passwordHash,
          fullName: 'Admin B Proj',
          role: ROLES.ADMIN,
        },
        {
          id: orgBPmId,
          organizationId: orgBId,
          email: 'pmb@proj.test',
          passwordHash,
          fullName: 'PM B Proj',
          role: ROLES.PM,
        },
      ],
    });

    // 3. Create test clients
    await prisma.client.createMany({
      data: [
        {
          id: clientA1Id,
          organizationId: orgAId,
          name: 'Active Client A1',
          status: 'active',
        },
        {
          id: clientAArchivedId,
          organizationId: orgAId,
          name: 'Archived Client A',
          status: 'on_hold',
          deletedAt: new Date(),
        },
        {
          id: clientB1Id,
          organizationId: orgBId,
          name: 'Active Client B1',
          status: 'active',
        },
      ],
    });

    // 4. Issue Tokens
    superAdminToken = createAccessToken({ sub: superAdminId, organizationId: orgAId, role: ROLES.SUPER_ADMIN });
    adminToken = createAccessToken({ sub: adminId, organizationId: orgAId, role: ROLES.ADMIN });
    pmToken = createAccessToken({ sub: pmId, organizationId: orgAId, role: ROLES.PM });
    viewerToken = createAccessToken({ sub: viewerId, organizationId: orgAId, role: ROLES.VIEWER });
    financeToken = createAccessToken({ sub: financeId, organizationId: orgAId, role: ROLES.FINANCE });
    creativeToken = createAccessToken({ sub: creativeId, organizationId: orgAId, role: ROLES.CREATIVE });
    orgBAdminToken = createAccessToken({ sub: orgBAdminId, organizationId: orgBId, role: ROLES.ADMIN });
    orgBPmToken = createAccessToken({ sub: orgBPmId, organizationId: orgBId, role: ROLES.PM });
  });

  afterAll(async () => {
    await cleanupData();
    await disconnectPrisma();
  });

  // ============================================================
  // 1. AUTHENTICATION GATES
  // ============================================================
  describe('Authentication Gates', () => {
    it('1. rejects unauthenticated GET /api/v1/projects with 401', async () => {
      const res = await request(app).get('/api/v1/projects');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('2. rejects unauthenticated POST /api/v1/projects with 401', async () => {
      const res = await request(app).post('/api/v1/projects').send({
        clientId: clientA1Id,
        name: 'Brand Campaign',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // ============================================================
  // 2. RBAC AUTHORIZATION
  // ============================================================
  describe('RBAC Authorization', () => {
    it('3. super_admin can create project (201)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          clientId: clientA1Id,
          name: 'SuperAdmin Project',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('SuperAdmin Project');
    });

    it('4. admin can create project (201)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Admin Project',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Admin Project');
    });

    it('5. pm can create project (201)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'PM Project',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('PM Project');
    });

    it('6. viewer cannot create project (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Viewer Project',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('7. finance cannot create project (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Finance Project',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('8. creative cannot create project (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${creativeToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Creative Project',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('9. viewer can read projects (200)', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('10. finance can read projects (200)', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${financeToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('11. creative cannot read projects (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${creativeToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ============================================================
  // 3. CREATE PROJECT VALIDATION & BUSINESS RULES
  // ============================================================
  describe('Create Project Business Logic', () => {
    it('12. creates project with default stage brief and optional fields', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Summer Commercial 2026',
          description: 'A 30-second TVC shoot',
          pmId: pmId,
          startDate: '2026-06-01T00:00:00.000Z',
          dueDate: '2026-08-01T00:00:00.000Z',
          budget: 50000,
          notes: 'Internal kickoff notes',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Summer Commercial 2026');
      expect(res.body.data.stage).toBe('brief');
      expect(res.body.data.clientId).toBe(clientA1Id);
      expect(res.body.data.pmId).toBe(pmId);
      expect(res.body.data.notes).toBe('Internal kickoff notes');
      expect(Number(res.body.data.budget)).toBe(50000);
    });

    it('13. rejects project creation when startDate > dueDate (400)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Invalid Timeline Project',
          startDate: '2026-09-01T00:00:00.000Z',
          dueDate: '2026-08-01T00:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('14. allows startDate == dueDate (400 not thrown, 201)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'One Day Shoot Project',
          startDate: '2026-07-15T00:00:00.000Z',
          dueDate: '2026-07-15T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('One Day Shoot Project');
    });

    it('15. rejects cross-tenant client (client from Org B) with 404 NOT_FOUND', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientB1Id,
          name: 'Cross Tenant Client Project',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('16. rejects non-existent client with 404 NOT_FOUND', async () => {
      const nonExistentClientId = 'c2000000-0000-4000-c000-999999999999';
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: nonExistentClientId,
          name: 'Non-existent Client Project',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('17. rejects soft-deleted (archived) client with 400 or 404', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientAArchivedId,
          name: 'Archived Client Project',
        });

      expect([400, 404]).toContain(res.status);
    });

    it('18. rejects non-existent PM user with 404 NOT_FOUND', async () => {
      const nonExistentUserId = 'b2000000-0000-4000-b000-999999999999';
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Unknown PM Project',
          pmId: nonExistentUserId,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('19. rejects cross-tenant PM user (Org B user) with 404 NOT_FOUND', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Cross Org PM Project',
          pmId: orgBPmId,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('20. rejects assigning PM with non-PM role (e.g. creative/viewer) with 400', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Invalid Role PM Project',
          pmId: creativeId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ============================================================
  // 4. LIFECYCLE STAGES
  // ============================================================
  describe('Project Lifecycle Stages', () => {
    let lifecycleProjectId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Stage Transition Project',
        });
      lifecycleProjectId = res.body.data.id;
    });

    it('21. allows valid stage progression through defined lifecycle', async () => {
      const stages = [
        PROJECT_STAGES.QUOTATION,
        PROJECT_STAGES.PRE_PRODUCTION,
        PROJECT_STAGES.SHOOT,
        PROJECT_STAGES.POST_PRODUCTION,
        PROJECT_STAGES.REVIEW,
        PROJECT_STAGES.DELIVERY,
        PROJECT_STAGES.INVOICED,
        PROJECT_STAGES.COMPLETED,
      ];

      for (const stage of stages) {
        const res = await request(app)
          .patch(`/api/v1/projects/${lifecycleProjectId}`)
          .set('Authorization', `Bearer ${pmToken}`)
          .send({ stage });

        expect(res.status).toBe(200);
        expect(res.body.data.stage).toBe(stage);
      }
    });

    it('22. allows transitioning to cancelled stage', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${lifecycleProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ stage: PROJECT_STAGES.CANCELLED });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('cancelled');
    });

    it('23. rejects invalid stage string with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${lifecycleProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ stage: 'not_a_real_stage' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ============================================================
  // 5. UPDATE PROJECT TIMELINE & LOGIC
  // ============================================================
  describe('Update Project & Timeline Validation', () => {
    let timelineProjectId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Timeline Check Project',
          startDate: '2026-04-01T00:00:00.000Z',
          dueDate: '2026-05-01T00:00:00.000Z',
        });
      timelineProjectId = res.body.data.id;
    });

    it('24. rejects partial update changing dueDate to earlier than existing startDate (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${timelineProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ dueDate: '2026-03-01T00:00:00.000Z' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('25. rejects partial update changing startDate to later than existing dueDate (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${timelineProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ startDate: '2026-06-01T00:00:00.000Z' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('26. allows valid timeline update changing both dates together (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${timelineProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          startDate: '2026-07-01T00:00:00.000Z',
          dueDate: '2026-08-01T00:00:00.000Z',
        });

      expect(res.status).toBe(200);
      expect(new Date(res.body.data.startDate).toISOString()).toBe('2026-07-01T00:00:00.000Z');
      expect(new Date(res.body.data.dueDate).toISOString()).toBe('2026-08-01T00:00:00.000Z');
    });

    it('27. allows clearing PM with null (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${timelineProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ pmId: null });

      expect(res.status).toBe(200);
      expect(res.body.data.pmId).toBeNull();
    });

    it('28. allows updating internal notes field (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${timelineProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ notes: 'Updated confidential notes' });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('Updated confidential notes');
    });
  });

  // ============================================================
  // 6. LIST, FILTER, SEARCH & PAGINATION
  // ============================================================
  describe('List, Filter, Search & Pagination', () => {
    beforeAll(async () => {
      // Create 15 projects in Org A
      for (let i = 1; i <= 15; i++) {
        await prisma.project.create({
          data: {
            organizationId: orgAId,
            clientId: clientA1Id,
            name: `Project Alpha ${i.toString().padStart(2, '0')}`,
            stage: i % 2 === 0 ? 'shoot' : 'brief',
            pmId: i % 3 === 0 ? pmId : null,
          },
        });
      }

      // Create 3 projects in Org B
      for (let i = 1; i <= 3; i++) {
        await prisma.project.create({
          data: {
            organizationId: orgBId,
            clientId: clientB1Id,
            name: `Org B Project ${i}`,
            stage: 'brief',
          },
        });
      }
    });

    it('29. returns dual-pagination metadata structure', async () => {
      const res = await request(app)
        .get('/api/v1/projects?limit=5&page=1')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination).toHaveProperty('page', 1);
      expect(res.body.pagination).toHaveProperty('limit', 5);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');
      expect(res.body.pagination).toHaveProperty('hasNext', true);
      expect(res.body.pagination).toHaveProperty('hasPrev', false);
      expect(res.body.pagination).toHaveProperty('hasMore', true);
    });

    it('30. filters projects by stage', async () => {
      const res = await request(app)
        .get('/api/v1/projects?stage=shoot')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      for (const p of res.body.data) {
        expect(p.stage).toBe('shoot');
      }
    });

    it('31. filters projects by clientId', async () => {
      const res = await request(app)
        .get(`/api/v1/projects?clientId=${clientA1Id}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      for (const p of res.body.data) {
        expect(p.clientId).toBe(clientA1Id);
      }
    });

    it('32. filters projects by pmId', async () => {
      const res = await request(app)
        .get(`/api/v1/projects?pmId=${pmId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      for (const p of res.body.data) {
        expect(p.pmId).toBe(pmId);
      }
    });

    it('33. searches projects by text search', async () => {
      const res = await request(app)
        .get('/api/v1/projects?search=Alpha 05')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toContain('Alpha 05');
    });

    it('34. cursor-based pagination returns nextCursor and advances', async () => {
      const res1 = await request(app)
        .get('/api/v1/projects?limit=3')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data).toHaveLength(3);
      const nextCursor = res1.body.pagination.nextCursor;
      expect(nextCursor).toBeDefined();

      const res2 = await request(app)
        .get(`/api/v1/projects?limit=3&cursor=${nextCursor}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data).toHaveLength(3);
      // None of the IDs in page 2 should match page 1
      const ids1 = res1.body.data.map((p: { id: string }) => p.id);
      const ids2 = res2.body.data.map((p: { id: string }) => p.id);
      for (const id of ids2) {
        expect(ids1).not.toContain(id);
      }
    });
  });

  // ============================================================
  // 7. MULTI-TENANT ISOLATION GATES
  // ============================================================
  describe('Multi-Tenant Isolation Gates', () => {
    let orgAProjectId: string;
    let orgBProjectId: string;

    beforeAll(async () => {
      const resA = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Tenant A Secret Project',
        });
      orgAProjectId = resA.body.data.id;

      const resB = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${orgBPmToken}`)
        .send({
          clientId: clientB1Id,
          name: 'Tenant B Secret Project',
        });
      orgBProjectId = resB.body.data.id;
    });

    it('35. Org A cannot see Org B projects in list query', async () => {
      const res = await request(app)
        .get('/api/v1/projects?limit=100')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((p: { id: string }) => p.id);
      expect(ids).not.toContain(orgBProjectId);
    });

    it('36. Org B cannot see Org A projects in list query', async () => {
      const res = await request(app)
        .get('/api/v1/projects?limit=100')
        .set('Authorization', `Bearer ${orgBPmToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((p: { id: string }) => p.id);
      expect(ids).not.toContain(orgAProjectId);
    });

    it('37. Org A user GET /api/v1/projects/:id on Org B project returns 404 NOT_FOUND', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${orgBProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('38. Org B user GET /api/v1/projects/:id on Org A project returns 404 NOT_FOUND', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${orgAProjectId}`)
        .set('Authorization', `Bearer ${orgBPmToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('39. Org A user PATCH on Org B project returns 404 NOT_FOUND', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${orgBProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ name: 'Cross Tenant Tampering' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('40. Org A user DELETE on Org B project returns 404 NOT_FOUND', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${orgBProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ============================================================
  // 8. ARCHIVING (SOFT DELETE)
  // ============================================================
  describe('Project Archival & Soft Delete', () => {
    let projectToArchiveId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Project to be Archived',
        });
      projectToArchiveId = res.body.data.id;
    });

    it('41. archiving project sets deletedAt and returns success message', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectToArchiveId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('archived');

      // Verify in DB that deletedAt is set
      const dbProject = await prisma.project.findUnique({
        where: { id: projectToArchiveId },
      });
      expect(dbProject?.deletedAt).not.toBeNull();
    });

    it('42. archived project is omitted from list queries', async () => {
      const res = await request(app)
        .get('/api/v1/projects?limit=100')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((p: { id: string }) => p.id);
      expect(ids).not.toContain(projectToArchiveId);
    });

    it('43. archived project returns 404 on GET by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectToArchiveId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ============================================================
  // 9. PROJECT MEMBERS JUNCTION & TEAM ASSIGNMENT
  // ============================================================
  describe('Project Members Management', () => {
    let memberProjectId: string;
    let memberId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Team Project',
        });
      memberProjectId = res.body.data.id;
    });

    it('44. adds team member to project (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${memberProjectId}/members`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          userId: creativeId,
          role: 'Lead Animator',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.userId).toBe(creativeId);
      expect(res.body.data.role).toBe('Lead Animator');
      memberId = res.body.data.id;
    });

    it('45. lists team members of project (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${memberProjectId}/members`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].userId).toBe(creativeId);
    });

    it('46. prevents duplicate active membership for same user in project (409 CONFLICT)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${memberProjectId}/members`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          userId: creativeId,
          role: 'Duplicate Member',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('47. rejects adding cross-tenant user as member (Org B user) with 404 NOT_FOUND', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${memberProjectId}/members`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          userId: orgBPmId,
          role: 'Cross Tenant Spy',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('48. updates project member role (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${memberProjectId}/members/${memberId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          role: 'Art Director',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('Art Director');
    });

    it('49. removes project member via soft delete (200)', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${memberProjectId}/members/${memberId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('removed');

      // Verify soft deletion in DB
      const dbMember = await prisma.projectMember.findUnique({
        where: { id: memberId },
      });
      expect(dbMember?.deletedAt).not.toBeNull();
    });

    it('50. removed member is excluded from member list', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${memberProjectId}/members`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((m: { id: string }) => m.id);
      expect(ids).not.toContain(memberId);
    });

    it('51. cross-tenant access to member endpoints returns 404', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${memberProjectId}/members`)
        .set('Authorization', `Bearer ${orgBPmToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ============================================================
  // 10. AUDIT TRAIL VERIFICATION
  // ============================================================
  describe('Audit Trail Verification', () => {
    let auditedProjectId: string;

    it('52. records audit log for project creation with safe values', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          clientId: clientA1Id,
          name: 'Audit Log Verification Project',
          budget: 12000,
        });

      expect(res.status).toBe(201);
      auditedProjectId = res.body.data.id;

      const log = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgAId,
          entityType: 'project',
          entityId: auditedProjectId,
          action: 'PROJECT_CREATED',
        },
      });

      expect(log).toBeDefined();
      expect(log?.userId).toBe(pmId);
      expect(log?.newValues).toHaveProperty('name', 'Audit Log Verification Project');
    });

    it('53. records audit log for project stage changed', async () => {
      await request(app)
        .patch(`/api/v1/projects/${auditedProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ stage: PROJECT_STAGES.PRE_PRODUCTION });

      const log = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgAId,
          entityType: 'project',
          entityId: auditedProjectId,
          action: 'PROJECT_STAGE_CHANGED',
        },
      });

      expect(log).toBeDefined();
      expect(log?.oldValues).toHaveProperty('stage', 'brief');
      expect(log?.newValues).toHaveProperty('stage', 'pre_production');
    });

    it('54. records audit log for project update', async () => {
      await request(app)
        .patch(`/api/v1/projects/${auditedProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ name: 'Audit Project New Name' });

      const log = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgAId,
          entityType: 'project',
          entityId: auditedProjectId,
          action: 'PROJECT_UPDATED',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(log).toBeDefined();
      expect(log?.oldValues).toHaveProperty('name', 'Audit Log Verification Project');
      expect(log?.newValues).toHaveProperty('name', 'Audit Project New Name');
    });

    it('55. records audit log for project archival', async () => {
      await request(app)
        .delete(`/api/v1/projects/${auditedProjectId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      const log = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgAId,
          entityType: 'project',
          entityId: auditedProjectId,
          action: 'PROJECT_ARCHIVED',
        },
      });

      expect(log).toBeDefined();
      expect(log?.action).toBe('PROJECT_ARCHIVED');
      expect(log?.newValues).toHaveProperty('archivedAt');
    });
  });
});
