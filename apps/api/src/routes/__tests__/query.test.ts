import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { PrismaClient } from '../../generated/prisma/client';
import { signToken } from '../../middleware/auth';

const prisma = new PrismaClient();

describe('Query API', () => {
  let token: string;
  let orgId: string;
  let userId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({
      data: { name: 'Test Org' },
    });
    orgId = org.id;

    const hash = await bcrypt.hash('pass', 10);
    const user = await prisma.user.create({
      data: {
        email: 'querier@test.com',
        password_hash: hash,
        role: 'USER',
        org_id: org.id,
      },
    });
    userId = user.id;

    token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.org_id,
    });

    // Create some processed documents
    await prisma.document.create({
      data: {
        title: 'Handbook.pdf',
        owner_id: user.id,
        org_id: org.id,
        visibility: 'ORG_WIDE',
        status: 'PROCESSED',
      },
    });
  });

  describe('POST /api/v1/query', () => {
    it('should return a placeholder answer with real document sources', async () => {
      const res = await request(app)
        .post('/api/v1/query')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'What is the remote work policy?' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('answer');
      expect(res.body).toHaveProperty('sources');
      expect(res.body.sources).toBeInstanceOf(Array);
      expect(res.body.sources.length).toBeGreaterThan(0);
      expect(res.body.sources[0]).toHaveProperty('doc_id');
      expect(res.body.sources[0]).toHaveProperty('chunk_text');
      expect(res.body.meta.documents_searched).toBe(1);
    });

    it('should return 400 if text is missing', async () => {
      const res = await request(app)
        .post('/api/v1/query')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/query')
        .send({ text: 'test query' });

      expect(res.status).toBe(401);
    });

    it('should only return PROCESSED documents in sources', async () => {
      // Create a PENDING document
      await prisma.document.create({
        data: {
          title: 'Pending Doc.pdf',
          owner_id: userId,
          org_id: orgId,
          visibility: 'PRIVATE',
          status: 'PENDING',
        },
      });

      const res = await request(app)
        .post('/api/v1/query')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'test query' });

      expect(res.status).toBe(200);
      // Should still only show the 1 PROCESSED document, not the PENDING one
      expect(res.body.meta.documents_searched).toBe(1);
    });
  });
});
