import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken } from '../middleware/auth';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    orgId: user.org_id,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, orgName } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Create or find org. For Phase 0, new registrations create their own org.
  const org = await prisma.organization.create({
    data: { name: orgName || `${email.split('@')[0]}'s Organization` },
  });

  const user = await prisma.user.create({
    data: {
      email,
      password_hash: passwordHash,
      role: 'ADMIN',
      org_id: org.id,
    },
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    orgId: user.org_id,
  });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

export default router;
