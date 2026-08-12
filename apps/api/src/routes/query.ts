import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// POST /api/v1/query — ask a question against accessible documents
router.post('/', async (req: Request, res: Response) => {
  const { text } = req.body;
  const user = req.user!;

  if (!text) {
    res.status(400).json({ error: 'Query text is required' });
    return;
  }

  // Fetch documents this user can access (same scoping as GET /documents)
  const accessibleDocs = await prisma.document.findMany({
    where: {
      OR: [
        { owner_id: user.userId },
        { org_id: user.orgId, visibility: 'ORG_WIDE' },
      ],
      status: 'PROCESSED',
    },
    select: {
      id: true,
      title: true,
      visibility: true,
    },
  });

  // Phase 0: Return a placeholder answer with real document metadata.
  // Real RAG (embedding search, LLM synthesis) is Phase 1.
  const sources = accessibleDocs.slice(0, 3).map((doc: { id: string; title: string; visibility: string }) => ({
    doc_id: doc.id,
    chunk_text: `[Phase 0 placeholder] Content from "${doc.title}" would appear here once RAG is implemented in Phase 1.`,
    page_num: 1,
    bbox: { x1: 50, y1: 100, x2: 500, y2: 120 },
  }));

  res.json({
    answer: `Phase 0 placeholder — real answer synthesis arrives in Phase 1. Your query "${text}" was searched across ${accessibleDocs.length} document(s) you have access to.`,
    sources,
    meta: {
      documents_searched: accessibleDocs.length,
    },
  });
});

export default router;
