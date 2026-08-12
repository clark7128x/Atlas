import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { PrismaClient } from '../../generated/prisma/client';

const prisma = new PrismaClient();

describe('Auth API', () => {
  let orgId: string;

  beforeEach(async () => {
    // Create a test org and user for login tests
    const org = await prisma.organization.create({
      data: { name: 'Test Org' },
    });
    orgId = org.id;

    const hash = await bcrypt.hash('testpass123', 10);
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        password_hash: hash,
        role: 'USER',
        org_id: org.id,
      },
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return token and user on valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'testpass123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.role).toBe('USER');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'testpass123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 on wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'testpass123' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should create user and return token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'newuser@example.com', password: 'newpass123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('newuser@example.com');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ password: 'newpass123' });

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'newpass123' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already registered');
    });
  });
});
