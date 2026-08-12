import { PrismaClient } from '../src/generated/prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corp',
    },
  });
  console.log(`Created org: ${org.name} (${org.id})`);

  // Create users
  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: {
      email: 'alice@acme.com',
      password_hash: passwordHash,
      role: 'ADMIN',
      org_id: org.id,
    },
  });
  console.log(`Created user: ${alice.email} (${alice.id})`);

  const bob = await prisma.user.create({
    data: {
      email: 'bob@acme.com',
      password_hash: passwordHash,
      role: 'USER',
      org_id: org.id,
    },
  });
  console.log(`Created user: ${bob.email} (${bob.id})`);

  // Create documents
  const doc1 = await prisma.document.create({
    data: {
      title: 'Q3_Financial_Report.pdf',
      owner_id: alice.id,
      org_id: org.id,
      visibility: 'PRIVATE',
      status: 'PROCESSED',
      s3_key: 'documents/q3-financial-report.pdf',
    },
  });
  console.log(`Created document: ${doc1.title} (PRIVATE, owned by alice)`);

  const doc2 = await prisma.document.create({
    data: {
      title: 'Employee_Handbook.pdf',
      owner_id: alice.id,
      org_id: org.id,
      visibility: 'ORG_WIDE',
      status: 'PROCESSED',
      s3_key: 'documents/employee-handbook.pdf',
    },
  });
  console.log(`Created document: ${doc2.title} (ORG_WIDE, owned by alice)`);

  const doc3 = await prisma.document.create({
    data: {
      title: 'Engineering_Onboarding.pdf',
      owner_id: bob.id,
      org_id: org.id,
      visibility: 'PRIVATE',
      status: 'PROCESSED',
      s3_key: 'documents/engineering-onboarding.pdf',
    },
  });
  console.log(`Created document: ${doc3.title} (PRIVATE, owned by bob)`);

  console.log('\nSeed complete. Login credentials:');
  console.log('  alice@acme.com / password123 (ADMIN)');
  console.log('  bob@acme.com   / password123 (USER)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
