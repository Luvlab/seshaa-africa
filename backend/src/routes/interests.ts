import prisma from '../db';
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /interests/track — record a search term or category browse (anonymous via sessionId)
router.post('/track', async (req, res) => {
  const { sessionId, keyword, category, country, city } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const existing = await prisma.userInterest.findUnique({ where: { sessionId } });

  if (existing) {
    const keywords = existing.keywords || [];
    const categories = existing.categories || [];
    const updatedKeywords = keyword
      ? [...new Set([keyword, ...keywords])].slice(0, 20)
      : keywords;
    const updatedCats = category
      ? [...new Set([category, ...categories])].slice(0, 10)
      : categories;

    await prisma.userInterest.update({
      where: { sessionId },
      data: {
        keywords: updatedKeywords,
        categories: updatedCats,
        ...(country ? { country } : {}),
        ...(city ? { city } : {}),
      },
    });
  } else {
    await prisma.userInterest.create({
      data: {
        sessionId,
        keywords: keyword ? [keyword] : [],
        categories: category ? [category] : [],
        country: country || null,
        city: city || null,
      },
    });
  }

  res.json({ ok: true });
});

// POST /interests/survey — submit first-visit interest survey
router.post('/survey', async (req, res) => {
  const { sessionId, categories, useType, country, city } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const record = await prisma.userInterest.upsert({
    where: { sessionId },
    create: {
      sessionId,
      categories: categories || [],
      useType: useType || null,
      country: country || null,
      city: city || null,
      surveyDone: true,
      keywords: [],
    },
    update: {
      categories: categories || [],
      useType: useType || null,
      ...(country ? { country } : {}),
      ...(city ? { city } : {}),
      surveyDone: true,
    },
  });

  res.json(record);
});

// GET /interests/my — get current user/session interest profile
router.get('/my', async (req, res) => {
  const { sessionId } = req.query as { sessionId: string };
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const profile = await prisma.userInterest.findUnique({ where: { sessionId } });
  res.json(profile || { sessionId, categories: [], keywords: [], surveyDone: false });
});

// PATCH /interests/link — link a sessionId to a userId after login
router.patch('/link', requireAuth, async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  await prisma.userInterest.updateMany({
    where: { sessionId },
    data: { userId: req.user!.id },
  });

  res.json({ ok: true });
});

export default router;
