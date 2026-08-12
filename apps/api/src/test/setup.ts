import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '../generated/prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

beforeAll(async () => {
  // Ensure database is reachable
  await prisma.$connect();
});

beforeEach(async () => {
  // Clean all tables before each test
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
});

afterAll(async () => {
  // Clean up and disconnect
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.$disconnect();
});
