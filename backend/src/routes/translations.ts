/**
 * Community Translation API
 * Ambassadors and users can suggest & vote on UI string translations.
 * Best-voted suggestion per (lang, key) is used as the live translation.
 */
import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /translations/:lang — get all approved/best suggestions for a language
router.get('/:lang', async (req, res) => {
  const { lang } = req.params as { lang: string };

  // Get the top-voted suggestion per key for this language
  const suggestions = await prisma.translationSuggestion.findMany({
    where: { lang },
    orderBy: { votes: 'desc' },
  });

  // Deduplicate: keep only the best-voted per key
  const best: Record<string, string> = {};
  for (const s of suggestions) {
    if (!(s.key in best)) best[s.key] = s.value;
  }

  res.json({ lang, translations: best });
});

// GET /translations/:lang/full — full list with all suggestions + votes (for the translate page)
router.get('/:lang/full', async (req, res) => {
  const { lang } = req.params as { lang: string };

  const suggestions = await prisma.translationSuggestion.findMany({
    where: { lang },
    include: {
      user: { select: { name: true } },
      _count: { select: { upvotes: true } },
    },
    orderBy: [{ key: 'asc' }, { votes: 'desc' }],
  });

  // Group by key
  const byKey: Record<string, typeof suggestions> = {};
  for (const s of suggestions) {
    if (!byKey[s.key]) byKey[s.key] = [];
    byKey[s.key].push(s);
  }

  res.json({ lang, byKey });
});

// GET /translations/stats/all — completion stats for every language
router.get('/stats/all', async (_req, res) => {
  const stats = await prisma.translationSuggestion.groupBy({
    by: ['lang'],
    _count: { key: true },
    _sum: { votes: true },
  });

  // Approximate total keys from English (hardcoded count for now)
  const TOTAL_KEYS = 65;

  res.json(stats.map(s => ({
    lang: s.lang,
    uniqueKeys: s._count.key,
    totalVotes: s._sum.votes || 0,
    completionPct: Math.min(100, Math.round((s._count.key / TOTAL_KEYS) * 100)),
  })));
});

// POST /translations/suggest — submit a new translation suggestion
router.post('/suggest', async (req: AuthRequest, res: Response) => {
  const { lang, key, value } = req.body as { lang: string; key: string; value: string };

  if (!lang || !key || !value?.trim()) {
    return res.status(400).json({ error: 'lang, key, and value are required' });
  }

  // Check for duplicate from same user
  const userId = req.user?.id;
  if (userId) {
    const dupe = await prisma.translationSuggestion.findFirst({
      where: { lang, key, userId, value: value.trim() },
    });
    if (dupe) return res.status(409).json({ error: 'You already suggested this translation' });
  }

  const suggestion = await prisma.translationSuggestion.create({
    data: { lang, key, value: value.trim(), userId: userId || null, votes: userId ? 1 : 0 },
  });

  // Auto-vote if authenticated
  if (userId) {
    await prisma.translationVote.create({ data: { suggestionId: suggestion.id, userId } });
  }

  res.json({ ok: true, suggestion });
});

// POST /translations/:id/vote — upvote a suggestion (auth required)
router.post('/:id/vote', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  const userId = req.user!.id;

  // Prevent double-vote
  const existing = await prisma.translationVote.findUnique({
    where: { suggestionId_userId: { suggestionId: id, userId } },
  });
  if (existing) return res.status(409).json({ error: 'Already voted' });

  await prisma.$transaction([
    prisma.translationVote.create({ data: { suggestionId: id, userId } }),
    prisma.translationSuggestion.update({ where: { id }, data: { votes: { increment: 1 } } }),
  ]);

  res.json({ ok: true });
});

// DELETE /translations/:id/vote — remove vote (auth required)
router.delete('/:id/vote', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  const userId = req.user!.id;

  try {
    await prisma.$transaction([
      prisma.translationVote.delete({ where: { suggestionId_userId: { suggestionId: id, userId } } }),
      prisma.translationSuggestion.update({ where: { id }, data: { votes: { decrement: 1 } } }),
    ]);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Vote not found' });
  }
});

export default router;
