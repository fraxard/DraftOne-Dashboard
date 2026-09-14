import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma, disconnectPrisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/auth/jwt.js';
import { hashPassword } from '../src/auth/password.js';
import { ROLES } from '@draftone/shared';

describe('Client Management / CRM Backend Layer (Prompt 07)', () => {
  const app = createApp();

  // Test Organizations
  const orgAId = 'a1000000-0000-4000-a000-000000000001';
  const orgBId = 'a1000000-0000-4000-a000-000000000002';

  // Test Users for Org A
  const superAdminId = 'b1000000-0000-4000-b000-000000000001';
  const adminId = 'b1000000-0000-4000-b000-000000000002';
  const pmId = 'b1000000-0000-4000-b000-000000000003';
  const viewerId = 'b1000000-0000-4000-b000-000000000004';
  const financeId = 'b1000000-0000-4000-b000-000000000005';
  const creativeId = 'b1000000-0000-4000-b000-000000000006';

  // Test Users for Org B
  const orgBAdminId = 'b1000000-0000-4000-b000-000000000007';
  const orgBPmId = 'b1000000-0000-4000-b000-000000000008';

  // JWT Access Tokens
  let superAdminToken: string;
  let adminToken: string;
  let pmToken: string;
  let viewerToken: string;
  let financeToken: string;
  let creativeToken: string;
  let orgBAdminToken: string;

  async function cleanupData() {
    try {
      await prisma.auditLog.deleteMany({
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
        { id: orgAId, name: 'CRM Test Org A', slug: 'crm-test-org-a' },
        { id: orgBId, name: 'CRM Test Org B', slug: 'crm-test-org-b' },
      ],
    });

    const passwordHash = await hashPassword('Password123!');

    // 2. Create users
    await prisma.user.createMany({
      data: [
        {
          id: superAdminId,
          organizationId: orgAId,
          email: 'superadmin@orga.test',
          passwordHash,
          fullName: 'Super Admin A',
          role: ROLES.SUPER_ADMIN,
        },
        {
          id: adminId,
          organizationId: orgAId,
          email: 'admin@orga.test',
          passwordHash,
          fullName: 'Admin A',
          role: ROLES.ADMIN,
        },
        {
          id: pmId,
          organizationId: orgAId,
          email: 'pm@orga.test',
          passwordHash,
          fullName: 'PM A',
          role: ROLES.PM,
        },
        {
          id: viewerId,
          organizationId: orgAId,
          email: 'viewer@orga.test',
          passwordHash,
          fullName: 'Viewer A',
          role: ROLES.VIEWER,
        },
        {
          id: financeId,
          organizationId: orgAId,
          email: 'finance@orga.test',
          passwordHash,
          fullName: 'Finance A',
          role: ROLES.FINANCE,
        },
        {
          id: creativeId,
          organizationId: orgAId,
          email: 'creative@orga.test',
          passwordHash,
          fullName: 'Creative A',
          role: ROLES.CREATIVE,
        },
        {
          id: orgBAdminId,
          organizationId: orgBId,
          email: 'admin@orgb.test',
          passwordHash,
          fullName: 'Admin B',
          role: ROLES.ADMIN,
        },
        {
          id: orgBPmId,
          organizationId: orgBId,
          email: 'pm@orgb.test',
          passwordHash,
          fullName: 'PM B',
          role: ROLES.PM,
        },
      ],
    });

    // 3. Issue Tokens
    superAdminToken = createAccessToken({ sub: superAdminId, organizationId: orgAId, role: ROLES.SUPER_ADMIN });
    adminToken = createAccessToken({ sub: adminId, organizationId: orgAId, role: ROLES.ADMIN });
    pmToken = createAccessToken({ sub: pmId, organizationId: orgAId, role: ROLES.PM });
    viewerToken = createAccessToken({ sub: viewerId, organizationId: orgAId, role: ROLES.VIEWER });
    financeToken = createAccessToken({ sub: financeId, organizationId: orgAId, role: ROLES.FINANCE });
    creativeToken = createAccessToken({ sub: creativeId, organizationId: orgAId, role: ROLES.CREATIVE });
    orgBAdminToken = createAccessToken({ sub: orgBAdminId, organizationId: orgBId, role: ROLES.ADMIN });
  });

  afterAll(async () => {
    await cleanupData();
    await disconnectPrisma();
  });

  // ============================================================
  // 1. AUTHENTICATION (Tests 1–2)
  // ============================================================
  describe('Authentication Gates', () => {
    it('1. rejects unauthenticated GET /api/v1/clients with 401', async () => {
      const res = await request(app).get('/api/v1/clients');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('2. rejects unauthenticated POST /api/v1/clients with 401', async () => {
      const res = await request(app).post('/api/v1/clients').send({ name: 'Test Client' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // ============================================================
  // 2. RBAC AUTHORIZATION (Tests 3–8)
  // ============================================================
  describe('RBAC Authorization', () => {
    it('3. super_admin can create client', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Client by SuperAdmin' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Client by SuperAdmin');
    });

    it('4. admin can create client', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Client by Admin' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Client by Admin');
    });

    it('5. pm can create client', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ name: 'Client by PM' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Client by PM');
    });

    it('6. viewer cannot create client (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Client by Viewer' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('7. finance cannot create client (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ name: 'Client by Finance' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('8. creative cannot create client (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${creativeToken}`)
        .send({ name: 'Client by Creative' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ============================================================
  // 3. CREATE CLIENT VALIDATION & TENANCY (Tests 9–15)
  // ============================================================
  describe('Create Client Logic', () => {
    it('9. creates client with default status lead and optional fields', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Apex Innovations',
          industry: 'Technology',
          website: 'https://apex.example.com',
          notes: 'High potential tech account',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('lead');
      expect(res.body.data.industry).toBe('Technology');
      expect(res.body.data.website).toBe('https://apex.example.com');
      expect(res.body.data.notes).toBe('High potential tech account');
    });

    it('10. derives organizationId from authenticated principal, ignoring client-supplied tenant id', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Tenant Spoof Attempt',
          organizationId: orgBId, // Malicious attempt to assign to Org B
        });

      expect(res.status).toBe(201);
      const createdId = res.body.data.id;
      const dbRecord = await prisma.client.findUnique({ where: { id: createdId } });
      expect(dbRecord?.organizationId).toBe(orgAId);
    });

    it('11. derives createdBy from authenticated principal', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Author Verification Client',
          createdBy: '00000000-0000-4000-0000-000000000000',
        });

      expect(res.status).toBe(201);
      const dbRecord = await prisma.client.findUnique({ where: { id: res.body.data.id } });
      expect(dbRecord?.createdBy).toBe(pmId);
    });

    it('12. rejects invalid status with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Bad Status Client',
          status: 'suspended_invalid',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('13. rejects missing or empty name with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('14. rejects non-existent assignedPmId with 400 BAD_REQUEST', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Client with Nonexistent PM',
          assignedPmId: '99999999-9999-4999-9999-999999999999',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('15. rejects cross-tenant assignedPmId with 400 BAD_REQUEST', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Client with Org B PM',
          assignedPmId: orgBPmId, // PM belongs to Org B
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('organization');
    });
  });

  // ============================================================
  // 4. READ, PAGINATION & FILTERING (Tests 16–23)
  // ============================================================
  describe('Read, Pagination & Filtering', () => {
    let clientId1: string;
    let clientId2: string;
    let clientId3: string;

    beforeAll(async () => {
      // Seed specific clients for filtering
      const c1 = await prisma.client.create({
        data: {
          organizationId: orgAId,
          createdBy: pmId,
          name: 'Acme Media Corp',
          industry: 'Entertainment',
          status: 'active',
          assignedPmId: pmId,
        },
      });
      clientId1 = c1.id;

      const c2 = await prisma.client.create({
        data: {
          organizationId: orgAId,
          createdBy: adminId,
          name: 'Beta Healthcare Solutions',
          industry: 'Healthcare',
          status: 'on_hold',
          assignedPmId: adminId,
        },
      });
      clientId2 = c2.id;

      const c3 = await prisma.client.create({
        data: {
          organizationId: orgAId,
          createdBy: pmId,
          name: 'Gamma Fintech',
          industry: 'Finance',
          status: 'completed',
          deletedAt: new Date(), // Soft deleted
        },
      });
      clientId3 = c3.id;
    });

    it('16. lists clients with standard pagination envelope', async () => {
      const res = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.limit).toBe(20);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('17. supports page-based pagination with limit and page parameters', async () => {
      const res = await request(app)
        .get('/api/v1/clients?limit=1&page=1')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.hasNext).toBe(true);
    });

    it('18. filters clients by case-insensitive name/industry search', async () => {
      const res = await request(app)
        .get('/api/v1/clients?search=acme')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((c: { name: string }) => c.name.includes('Acme'))).toBe(true);
      expect(res.body.data.every((c: { name: string }) => !c.name.includes('Beta'))).toBe(true);
    });

    it('19. filters clients by status tag', async () => {
      const res = await request(app)
        .get('/api/v1/clients?status=on_hold')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((c: { status: string }) => c.status === 'on_hold')).toBe(true);
    });

    it('20. filters clients by industry', async () => {
      const res = await request(app)
        .get('/api/v1/clients?industry=Healthcare')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((c: { industry: string }) => c.industry === 'Healthcare')).toBe(true);
    });

    it('21. filters clients by assignedPmId', async () => {
      const res = await request(app)
        .get(`/api/v1/clients?assignedPmId=${pmId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((c: { assignedPmId: string }) => c.assignedPmId === pmId)).toBe(true);
    });

    it('22. retrieves single client by ID with contacts included', async () => {
      const res = await request(app)
        .get(`/api/v1/clients/${clientId1}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(clientId1);
      expect(res.body.data.name).toBe('Acme Media Corp');
      expect(Array.isArray(res.body.data.contacts)).toBe(true);
    });

    it('23. excludes archived clients from standard list and get operations', async () => {
      const listRes = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(listRes.body.data.some((c: { id: string }) => c.id === clientId3)).toBe(false);

      const getRes = await request(app)
        .get(`/api/v1/clients/${clientId3}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ============================================================
  // 5. TENANT ISOLATION (Tests 24–28)
  // ============================================================
  describe('Multi-Tenant Isolation', () => {
    let orgBClientId: string;

    beforeAll(async () => {
      const orgBClient = await prisma.client.create({
        data: {
          organizationId: orgBId,
          createdBy: orgBAdminId,
          name: 'Org B Secret Client',
          status: 'active',
        },
      });
      orgBClientId = orgBClient.id;
    });

    it('24. Tenant A cannot see Tenant B clients in list', async () => {
      const res = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((c: { id: string }) => c.id === orgBClientId)).toBe(false);
    });

    it('25. Tenant A cannot get Tenant B client by ID (returns 404 without data leak)', async () => {
      const res = await request(app)
        .get(`/api/v1/clients/${orgBClientId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('26. Tenant A cannot update Tenant B client (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/clients/${orgBClientId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Hacked Client Name' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');

      const dbRecord = await prisma.client.findUnique({ where: { id: orgBClientId } });
      expect(dbRecord?.name).toBe('Org B Secret Client');
    });

    it('27. Tenant A cannot archive Tenant B client (returns 404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/clients/${orgBClientId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');

      const dbRecord = await prisma.client.findUnique({ where: { id: orgBClientId } });
      expect(dbRecord?.deletedAt).toBeNull();
    });

    it('28. Tenant A cannot assign Tenant B user as PM', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Client with Illegal PM',
          assignedPmId: orgBPmId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  // ============================================================
  // 6. UPDATE CLIENT & IMMUTABILITY (Tests 29–32)
  // ============================================================
  describe('Update Client Logic', () => {
    let targetClientId: string;

    beforeAll(async () => {
      const c = await prisma.client.create({
        data: {
          organizationId: orgAId,
          createdBy: pmId,
          name: 'Original Client Name',
          status: 'lead',
        },
      });
      targetClientId = c.id;
    });

    it('29. partially updates mutable client fields', async () => {
      const res = await request(app)
        .patch(`/api/v1/clients/${targetClientId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Updated Client Name',
          status: 'active',
          industry: 'Aerospace',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Client Name');
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.industry).toBe('Aerospace');
    });

    it('30. rejects invalid field values on update with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/clients/${targetClientId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          status: 'invalid_status_value',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('31. disallows mutating immutable fields (id, organizationId, createdBy)', async () => {
      const res = await request(app)
        .patch(`/api/v1/clients/${targetClientId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          id: '00000000-0000-4000-0000-000000000000',
          organizationId: orgBId,
          createdBy: adminId,
        });

      expect(res.status).toBe(200);
      const dbRecord = await prisma.client.findUnique({ where: { id: targetClientId } });
      expect(dbRecord?.id).toBe(targetClientId);
      expect(dbRecord?.organizationId).toBe(orgAId);
      expect(dbRecord?.createdBy).toBe(pmId);
    });

    it('32. records CLIENT_UPDATED audit entry with oldValues and newValues', async () => {
      await request(app)
        .patch(`/api/v1/clients/${targetClientId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Audit Check Client Name',
        });

      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgAId,
          entityType: 'client',
          entityId: targetClientId,
          action: 'CLIENT_UPDATED',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditEntry).toBeDefined();
      expect(auditEntry?.action).toBe('CLIENT_UPDATED');
      expect(auditEntry?.oldValues).toHaveProperty('name');
      expect(auditEntry?.newValues).toHaveProperty('name', 'Audit Check Client Name');
    });
  });

  // ============================================================
  // 7. ARCHIVE / SOFT DELETE (Tests 33–36)
  // ============================================================
  describe('Archive / Soft Delete', () => {
    let archiveClientId: string;

    beforeAll(async () => {
      const c = await prisma.client.create({
        data: {
          organizationId: orgAId,
          createdBy: pmId,
          name: 'Client To Archive',
          status: 'active',
        },
      });
      archiveClientId = c.id;
    });

    it('33. soft deletes client without physical row deletion', async () => {
      const res = await request(app)
        .delete(`/api/v1/clients/${archiveClientId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.archived).toBe(true);

      const dbRecord = await prisma.client.findUnique({ where: { id: archiveClientId } });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.deletedAt).not.toBeNull();
    });

    it('34. archived client no longer appears in normal list query', async () => {
      const res = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.body.data.some((c: { id: string }) => c.id === archiveClientId)).toBe(false);
    });

    it('35. archived client cannot be normally fetched (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/clients/${archiveClientId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('36. records CLIENT_ARCHIVED audit entry upon archiving', async () => {
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgAId,
          entityType: 'client',
          entityId: archiveClientId,
          action: 'CLIENT_ARCHIVED',
        },
      });

      expect(auditEntry).toBeDefined();
      expect(auditEntry?.action).toBe('CLIENT_ARCHIVED');
      expect(auditEntry?.newValues).toHaveProperty('archivedAt');
    });
  });

  // ============================================================
  // 8. CLIENT CONTACTS (Tests 37–42)
  // ============================================================
  describe('Client Contacts (FR-CRM-02)', () => {
    let activeClientId: string;
    let contactId: string;

    beforeAll(async () => {
      const c = await prisma.client.create({
        data: {
          organizationId: orgAId,
          createdBy: pmId,
          name: 'Contact Test Client',
          status: 'active',
        },
      });
      activeClientId = c.id;
    });

    it('37. creates a contact for an active client', async () => {
      const res = await request(app)
        .post(`/api/v1/clients/${activeClientId}/contacts`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          phone: '+1-555-0199',
          designation: 'VP of Marketing',
          isPrimary: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Jane Doe');
      expect(res.body.data.isPrimary).toBe(true);
      expect(res.body.data.clientId).toBe(activeClientId);
      contactId = res.body.data.id;
    });

    it('38. lists active contacts for a client', async () => {
      const res = await request(app)
        .get(`/api/v1/clients/${activeClientId}/contacts`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some((ct: { id: string }) => ct.id === contactId)).toBe(true);
    });

    it('39. updates contact details', async () => {
      const res = await request(app)
        .patch(`/api/v1/clients/${activeClientId}/contacts/${contactId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          designation: 'Chief Marketing Officer',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.designation).toBe('Chief Marketing Officer');
    });

    it('40. soft deletes a contact', async () => {
      const res = await request(app)
        .delete(`/api/v1/clients/${activeClientId}/contacts/${contactId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      const dbContact = await prisma.clientContact.findUnique({ where: { id: contactId } });
      expect(dbContact?.deletedAt).not.toBeNull();
    });

    it('41. rejects cross-tenant contact operations with 404', async () => {
      // Create a contact in Org B
      const orgBClient = await prisma.client.create({
        data: {
          organizationId: orgBId,
          createdBy: orgBAdminId,
          name: 'Org B Client for Contacts',
        },
      });

      const orgBContact = await prisma.clientContact.create({
        data: {
          organizationId: orgBId,
          clientId: orgBClient.id,
          name: 'Org B Secret Contact',
        },
      });

      // Tenant A tries to access Org B contact
      const getRes = await request(app)
        .get(`/api/v1/clients/${orgBClient.id}/contacts`)
        .set('Authorization', `Bearer ${pmToken}`);
      expect(getRes.status).toBe(404);

      const updateRes = await request(app)
        .patch(`/api/v1/clients/${orgBClient.id}/contacts/${orgBContact.id}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ name: 'Hacked Contact' });
      expect(updateRes.status).toBe(404);
    });

    it('42. rejects creating contacts for archived clients with 404', async () => {
      const archivedClient = await prisma.client.create({
        data: {
          organizationId: orgAId,
          createdBy: pmId,
          name: 'Archived Client No Contacts',
          deletedAt: new Date(),
        },
      });

      const res = await request(app)
        .post(`/api/v1/clients/${archivedClient.id}/contacts`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Should Fail Contact',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ============================================================
  // 9. AUDIT TRAIL VERIFICATION (Tests 43–45)
  // ============================================================
  describe('Audit Trail Verification', () => {
    let auditedClientId: string;

    it('43. records audit log for client creation with safe values', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Full Audit Verification Client',
          industry: 'Automotive',
          status: 'active',
        });

      expect(res.status).toBe(201);
      auditedClientId = res.body.data.id;

      const log = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgAId,
          entityType: 'client',
          entityId: auditedClientId,
          action: 'CLIENT_CREATED',
        },
      });

      expect(log).toBeDefined();
      expect(log?.userId).toBe(pmId);
      expect(log?.newValues).toHaveProperty('name', 'Full Audit Verification Client');
    });

    it('44. records audit log for client update with oldValues and newValues', async () => {
      await request(app)
        .patch(`/api/v1/clients/${auditedClientId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'Audited Client Updated Name',
        });

      const log = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgAId,
          entityType: 'client',
          entityId: auditedClientId,
          action: 'CLIENT_UPDATED',
        },
      });

      expect(log).toBeDefined();
      expect(log?.oldValues).toHaveProperty('name', 'Full Audit Verification Client');
      expect(log?.newValues).toHaveProperty('name', 'Audited Client Updated Name');
    });

    it('45. records audit log for client archival', async () => {
      await request(app)
        .delete(`/api/v1/clients/${auditedClientId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      const log = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgAId,
          entityType: 'client',
          entityId: auditedClientId,
          action: 'CLIENT_ARCHIVED',
        },
      });

      expect(log).toBeDefined();
      expect(log?.action).toBe('CLIENT_ARCHIVED');
      expect(log?.newValues).toHaveProperty('archivedAt');
    });
  });
});
