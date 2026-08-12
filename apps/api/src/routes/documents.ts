import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All document routes require authentication
router.use(authMiddleware);

// POST /api/v1/documents — create a document record
router.post('/', async (req: Request, res: Response) => {
  const { title, visibility } = req.body;
  const user = req.user!;

  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  const validVisibility = ['PRIVATE', 'ORG_WIDE'];
  const docVisibility = validVisibility.includes(visibility) ? visibility : 'PRIVATE';

  const document = await prisma.document.create({
    data: {
      title,
      visibility: docVisibility,
      owner_id: user.userId,
      org_id: user.orgId,
      status: 'PENDING',
      s3_key: '', // No S3 in Phase 0
    },
  });

  res.status(201).json({
    doc_id: document.id,
    status: document.status,
  });
});

// GET /api/v1/documents — list documents the user can access
// Access rule: own documents OR org-wide documents in same org
router.get('/', async (req: Request, res: Response) => {
  const user = req.user!;

  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { owner_id: user.userId },
        { org_id: user.orgId, visibility: 'ORG_WIDE' },
      ],
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      owner_id: true,
      org_id: true,
      visibility: true,
      status: true,
      created_at: true,
    },
  });

  res.json(documents);
});

export default router;
