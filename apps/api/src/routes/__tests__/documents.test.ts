import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { PrismaClient } from '../../generated/prisma/client';
import { signToken } from '../../middleware/auth';

const prisma = new PrismaClient();

describe('Documents API', () => {
  let tokenA: string;
  let tokenB: string;
  let orgId: string;
  let userAId: string;
  let userBId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({
      data: { name: 'Test Org' },
    });
    orgId = org.id;

    const hash = await bcrypt.hash('pass', 10);

    const userA = await prisma.user.create({
      data: {
        email: 'alice@test.com',
        password_hash: hash,
        role: 'ADMIN',
        org_id: org.id,
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        email: 'bob@test.com',
        password_hash: hash,
        role: 'USER',
        org_id: org.id,
      },
    });
    userBId = userB.id;

    tokenA = signToken({
      userId: userA.id,
      email: userA.email,
      role: userA.role,
      orgId: userA.org_id,
    });

    tokenB = signToken({
      userId: userB.id,
      email: userB.email,
      role: userB.role,
      orgId: userB.org_id,
    });
  });

  describe('POST /api/v1/documents', () => {
    it('should create a document', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Test Doc', visibility: 'PRIVATE' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('doc_id');
      expect(res.body.status).toBe('PENDING');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .send({ title: 'Test Doc' });

      expect(res.status).toBe(401);
    });

    it('should return 400 without title', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ visibility: 'PRIVATE' });

      expect(res.status).toBe(400);
    });

    it('should default visibility to PRIVATE', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Test Doc' });

      expect(res.status).toBe(201);

      // Verify in DB
      const doc = await prisma.document.findUnique({
        where: { id: res.body.doc_id },
      });
      expect(doc?.visibility).toBe('PRIVATE');
    });
  });

  describe('GET /api/v1/documents', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/documents');
      expect(res.status).toBe(401);
    });

    it('should return user\'s own documents', async () => {
      // Alice creates a private doc
      await prisma.document.create({
        data: {
          title: 'Alice Private',
          owner_id: userAId,
          org_id: orgId,
          visibility: 'PRIVATE',
          status: 'PROCESSED',
        },
      });

      const res = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Alice Private');
    });

    it('should NOT show another user\'s PRIVATE documents', async () => {
      // Alice creates a private doc
      await prisma.document.create({
        data: {
          title: 'Alice Secret',
          owner_id: userAId,
          org_id: orgId,
          visibility: 'PRIVATE',
          status: 'PROCESSED',
        },
      });

      // Bob should NOT see it
      const res = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('should show ORG_WIDE documents to all org members', async () => {
      // Alice creates an org-wide doc
      await prisma.document.create({
        data: {
          title: 'Shared Handbook',
          owner_id: userAId,
          org_id: orgId,
          visibility: 'ORG_WIDE',
          status: 'PROCESSED',
        },
      });

      // Bob should see it
      const res = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Shared Handbook');
    });
  });
});
