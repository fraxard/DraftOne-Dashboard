import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma, disconnectPrisma } from '../src/lib/prisma.js';

describe('Database Connection & Multi-Tenant Invariants', () => {
  const testOrgAId = 'a0000000-0000-4000-a000-000000000001';
  const testOrgBId = 'b0000000-0000-4000-b000-000000000002';

  async function cleanupTestData() {
    try {
      // Clean up in reverse dependency order
      await prisma.auditLog.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      });
      await prisma.asset.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      });
      await prisma.invoice.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      });
      await prisma.task.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      });
      await prisma.project.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      });
      await prisma.client.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      });
      await prisma.user.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [testOrgAId, testOrgBId] } },
      });
    } catch {
      // Ignore errors during initial cleanup
    }
  }

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  it('verifies that all production domain models are generated on PrismaClient', () => {
    expect(prisma.organization).toBeDefined();
    expect(typeof prisma.organization.findMany).toBe('function');

    expect(prisma.user).toBeDefined();
    expect(typeof prisma.user.findMany).toBe('function');

    expect(prisma.client).toBeDefined();
    expect(typeof prisma.client.findMany).toBe('function');

    expect(prisma.project).toBeDefined();
    expect(typeof prisma.project.findMany).toBe('function');

    expect(prisma.task).toBeDefined();
    expect(typeof prisma.task.findMany).toBe('function');

    expect(prisma.invoice).toBeDefined();
    expect(typeof prisma.invoice.findMany).toBe('function');

    expect(prisma.asset).toBeDefined();
    expect(typeof prisma.asset.findMany).toBe('function');

    expect(prisma.auditLog).toBeDefined();
    expect(typeof prisma.auditLog.findMany).toBe('function');
  });

  it('verifies all Prisma enums match the shared domain contracts', async () => {
    const {
      UserRole,
      ClientStatus,
      ProjectStage,
      TaskStatus,
      TaskPriority,
      InvoiceStatus,
      AssetStatus,
    } = await import('@prisma/client');

    expect(UserRole.super_admin).toBe('super_admin');
    expect(UserRole.admin).toBe('admin');
    expect(UserRole.pm).toBe('pm');
    expect(UserRole.creative).toBe('creative');
    expect(UserRole.finance).toBe('finance');
    expect(UserRole.viewer).toBe('viewer');

    expect(ClientStatus.lead).toBe('lead');
    expect(ClientStatus.active).toBe('active');
    expect(ClientStatus.churned).toBe('churned');

    expect(ProjectStage.brief).toBe('brief');
    expect(ProjectStage.quotation).toBe('quotation');
    expect(ProjectStage.completed).toBe('completed');
    expect(ProjectStage.cancelled).toBe('cancelled');

    expect(TaskStatus.todo).toBe('todo');
    expect(TaskStatus.done).toBe('done');

    expect(TaskPriority.low).toBe('low');
    expect(TaskPriority.urgent).toBe('urgent');

    expect(InvoiceStatus.draft).toBe('draft');
    expect(InvoiceStatus.paid).toBe('paid');

    expect(AssetStatus.pending).toBe('pending');
    expect(AssetStatus.approved).toBe('approved');
    expect(AssetStatus.rejected).toBe('rejected');

    // Monetary Decimal representation
    expect(Prisma.Decimal).toBeDefined();
    const moneyVal = new Prisma.Decimal('1499.99');
    expect(moneyVal.toFixed(2)).toBe('1499.99');
  });

  it('executes a live database ping against PostgreSQL without credential leakage', async () => {
    await prisma.$connect();
    const result = await prisma.$queryRaw<Array<{ connected: number }>>`SELECT 1 as connected`;
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.connected).toBe(1);
  });

  it('enforces multi-tenant isolation by rejecting cross-tenant foreign key relationships at DB constraint level', async () => {
    // 1. Setup Tenant Org A and Tenant Org B
    const orgA = await prisma.organization.create({
      data: {
        id: testOrgAId,
        name: 'Tenant Alpha Corp',
        slug: 'tenant-alpha-corp',
      },
    });

    const orgB = await prisma.organization.create({
      data: {
        id: testOrgBId,
        name: 'Tenant Beta Corp',
        slug: 'tenant-beta-corp',
      },
    });

    // 2. Create User and Client in Org A
    const userA = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        email: 'pm-alpha@example.com',
        fullName: 'Alpha PM',
        passwordHash: '$2b$12$e8x/kZgZEXAMPLEHASHFORTESTINGONLY',
        role: 'pm',
      },
    });

    const clientA = await prisma.client.create({
      data: {
        organizationId: orgA.id,
        name: 'Client Alpha One',
        createdBy: userA.id,
      },
    });

    // 3. Create Project in Org A
    const projectA = await prisma.project.create({
      data: {
        organizationId: orgA.id,
        clientId: clientA.id,
        name: 'Alpha Project 1',
        createdBy: userA.id,
      },
    });

    // 4. Attempt to create a Task in Org B referencing Project in Org A
    // Composite foreign key [organizationId, projectId] references [organizationId, id]
    // PostgreSQL constraint tasks_organization_id_project_id_fkey must fail!
    await expect(
      prisma.task.create({
        data: {
          organizationId: orgB.id,
          projectId: projectA.id,
          title: 'Illegitimate Cross-Tenant Task',
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    try {
      await prisma.task.create({
        data: {
          organizationId: orgB.id,
          projectId: projectA.id,
          title: 'Illegitimate Cross-Tenant Task',
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      const prismaErr = err as Prisma.PrismaClientKnownRequestError;
      expect(prismaErr.code).toBe('P2003');
    }
  });

  it('enforces per-tenant user email uniqueness while allowing duplicate emails across different tenants', async () => {
    // User in Org A with email 'shared-user@example.com'
    const userA = await prisma.user.create({
      data: {
        organizationId: testOrgAId,
        email: 'shared-user@example.com',
        fullName: 'User in Org A',
        passwordHash: 'dummy_hash_1',
      },
    });
    expect(userA.id).toBeDefined();

    // Duplicate email in Org A must be rejected by @@unique([organizationId, email])
    await expect(
      prisma.user.create({
        data: {
          organizationId: testOrgAId,
          email: 'shared-user@example.com',
          fullName: 'Duplicate User in Org A',
          passwordHash: 'dummy_hash_2',
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    try {
      await prisma.user.create({
        data: {
          organizationId: testOrgAId,
          email: 'shared-user@example.com',
          fullName: 'Duplicate User in Org A',
          passwordHash: 'dummy_hash_2',
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      const prismaErr = err as Prisma.PrismaClientKnownRequestError;
      expect(prismaErr.code).toBe('P2002');
    }

    // Same email in Org B must succeed
    const userB = await prisma.user.create({
      data: {
        organizationId: testOrgBId,
        email: 'shared-user@example.com',
        fullName: 'User in Org B',
        passwordHash: 'dummy_hash_3',
      },
    });
    expect(userB.id).toBeDefined();
    expect(userB.organizationId).toBe(testOrgBId);
  });

  it('enforces per-tenant invoice number uniqueness while allowing identical numbers in different tenants', async () => {
    const clientA = await prisma.client.findFirstOrThrow({
      where: { organizationId: testOrgAId },
    });

    const clientB = await prisma.client.create({
      data: {
        organizationId: testOrgBId,
        name: 'Client Beta One',
      },
    });

    // Invoice 1 in Org A
    const invA = await prisma.invoice.create({
      data: {
        organizationId: testOrgAId,
        clientId: clientA.id,
        invoiceNumber: 'INV-2026-0001',
        subtotal: new Prisma.Decimal('1000.00'),
        taxPercent: new Prisma.Decimal('18.00'),
        total: new Prisma.Decimal('1180.00'),
      },
    });
    expect(invA.id).toBeDefined();

    // Duplicate invoiceNumber in Org A must be rejected
    await expect(
      prisma.invoice.create({
        data: {
          organizationId: testOrgAId,
          clientId: clientA.id,
          invoiceNumber: 'INV-2026-0001',
          subtotal: new Prisma.Decimal('500.00'),
          taxPercent: new Prisma.Decimal('18.00'),
          total: new Prisma.Decimal('590.00'),
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    try {
      await prisma.invoice.create({
        data: {
          organizationId: testOrgAId,
          clientId: clientA.id,
          invoiceNumber: 'INV-2026-0001',
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect((err as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
    }

    // Same invoiceNumber in Org B must succeed
    const invB = await prisma.invoice.create({
      data: {
        organizationId: testOrgBId,
        clientId: clientB.id,
        invoiceNumber: 'INV-2026-0001',
        subtotal: new Prisma.Decimal('2000.00'),
        taxPercent: new Prisma.Decimal('18.00'),
        total: new Prisma.Decimal('2360.00'),
      },
    });
    expect(invB.id).toBeDefined();
    expect(invB.organizationId).toBe(testOrgBId);
  });

  it('verifies SetNull referential action: parent task deletion clears child parentTaskId', async () => {
    const project = await prisma.project.findFirstOrThrow({
      where: { organizationId: testOrgAId },
    });

    // Create parent task
    const parentTask = await prisma.task.create({
      data: {
        organizationId: testOrgAId,
        projectId: project.id,
        title: 'Master Parent Task',
      },
    });

    // Create child task referencing parentTask
    const childTask = await prisma.task.create({
      data: {
        organizationId: testOrgAId,
        projectId: project.id,
        parentTaskId: parentTask.id,
        title: 'Sub Task',
      },
    });

    expect(childTask.parentTaskId).toBe(parentTask.id);

    // Delete parent task
    await prisma.task.delete({
      where: { id: parentTask.id },
    });

    // Fetch child task to verify parentTaskId is set to null
    const refreshedChild = await prisma.task.findUniqueOrThrow({
      where: { id: childTask.id },
    });

    expect(refreshedChild.parentTaskId).toBeNull();
  });

  it('verifies SetNull referential action: project deletion clears invoice projectId', async () => {
    const client = await prisma.client.findFirstOrThrow({
      where: { organizationId: testOrgAId },
    });

    // Create temporary project
    const tempProject = await prisma.project.create({
      data: {
        organizationId: testOrgAId,
        clientId: client.id,
        name: 'Project to be deleted',
      },
    });

    // Create invoice linked to tempProject
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: testOrgAId,
        clientId: client.id,
        projectId: tempProject.id,
        invoiceNumber: 'INV-TEMP-SETNULL',
      },
    });

    expect(invoice.projectId).toBe(tempProject.id);

    // Delete tempProject
    await prisma.project.delete({
      where: { id: tempProject.id },
    });

    // Verify invoice projectId became null
    const refreshedInvoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });

    expect(refreshedInvoice.projectId).toBeNull();
  });

  it('verifies SetNull referential action: task deletion clears asset taskId', async () => {
    const project = await prisma.project.findFirstOrThrow({
      where: { organizationId: testOrgAId },
    });
    const user = await prisma.user.findFirstOrThrow({
      where: { organizationId: testOrgAId },
    });

    // Create task
    const task = await prisma.task.create({
      data: {
        organizationId: testOrgAId,
        projectId: project.id,
        title: 'Task for Asset Association',
      },
    });

    // Create asset linked to task
    const asset = await prisma.asset.create({
      data: {
        organizationId: testOrgAId,
        projectId: project.id,
        taskId: task.id,
        fileName: 'brand_guide.pdf',
        storageKey: 'assets/alpha/brand_guide_v1.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        uploadedBy: user.id,
      },
    });

    expect(asset.taskId).toBe(task.id);

    // Delete task
    await prisma.task.delete({
      where: { id: task.id },
    });

    // Verify asset taskId became null
    const refreshedAsset = await prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
    });

    expect(refreshedAsset.taskId).toBeNull();
  });

  it('verifies JSON/JSONB audit log persistence and Decimal financial accuracy', async () => {
    const user = await prisma.user.findFirstOrThrow({
      where: { organizationId: testOrgAId },
    });

    const auditPayload = {
      ip: '192.168.1.10',
      userAgent: 'Draftone-Agent/1.0',
      changes: {
        stage: { from: 'brief', to: 'quotation' },
        updatedFields: ['budget', 'stage'],
      },
    };

    const auditLog = await prisma.auditLog.create({
      data: {
        organizationId: testOrgAId,
        userId: user.id,
        action: 'PROJECT_STAGE_UPDATED',
        entityType: 'project',
        oldValues: { stage: 'brief' },
        newValues: auditPayload,
        ipAddress: '192.168.1.10',
      },
    });

    expect(auditLog.id).toBeDefined();
    expect(auditLog.newValues).toEqual(auditPayload);

    // Verify Decimal precision
    const invoice = await prisma.invoice.findFirstOrThrow({
      where: { organizationId: testOrgAId, invoiceNumber: 'INV-2026-0001' },
    });

    expect(invoice.subtotal).toBeInstanceOf(Prisma.Decimal);
    expect(invoice.subtotal.toString()).toBe('1000');
    expect(invoice.total.toString()).toBe('1180');
    expect(invoice.taxPercent.toString()).toBe('18');
  });
});
