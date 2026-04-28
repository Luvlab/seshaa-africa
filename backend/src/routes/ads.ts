import prisma from '../db';
import { Router, Response } from 'express';

import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();


const AdSchema = z.object({
  title: z.string().min(2).max(100),
  imageUrl: z.string().url().optional().or(z.literal('')),
  targetUrl: z.string().url(),
  advertiser: z.string().min(2),
  contactPhone: z.string().optional(),
  listingId: z.string().uuid().optional(),
  salesRepId: z.string().uuid().optional(),
  tier: z.enum(['BANNER', 'FEATURED', 'SPONSORED', 'PREMIUM']).default('BANNER'),
  country: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  budget: z.number().positive(),
});

// GET /ads - get active ads for display (contextual)
router.get('/', async (req, res) => {
  const { country, city, category, tier } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {
    active: true,
    startDate: { lte: new Date() },
    endDate: { gte: new Date() },
  };
  if (tier) where.tier = tier;

  // Contextual matching: prefer local ads, fall back to country, then global
  const contextFilter = [];
  if (city) contextFilter.push({ city: { equals: city, mode: 'insensitive' } });
  if (country) contextFilter.push({ country: { equals: country, mode: 'insensitive' } });
  if (category) contextFilter.push({ category: { equals: category, mode: 'insensitive' } });
  if (contextFilter.length) where.OR = [...contextFilter, { country: null }];

  const ads = await prisma.ad.findMany({
    where,
    take: 5,
    orderBy: { tier: 'desc' },
  });

  // Track impressions
  if (ads.length) {
    await prisma.ad.updateMany({
      where: { id: { in: ads.map(a => a.id) } },
      data: { impressions: { increment: 1 } },
    });
  }

  res.json(ads);
});

// POST /ads/:id/click
router.post('/:id/click', async (req, res) => {
  await prisma.ad.update({ where: { id: req.params.id }, data: { clicks: { increment: 1 } } });
  res.json({ success: true });
});

// POST /ads - create new ad (requires auth)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = AdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { salesRepId, ...data } = parsed.data;

  const ad = await prisma.ad.create({
    data: {
      ...data,
      imageUrl: data.imageUrl || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      salesRepId: salesRepId || null,
    },
  });

  // Create commission if sales rep is attached
  if (salesRepId) {
    const salesRep = await prisma.salesRep.findUnique({ where: { id: salesRepId } });
    if (salesRep) {
      const commission = data.budget * salesRep.commissionRate;
      await prisma.commission.create({
        data: { salesRepId, adId: ad.id, amount: commission, rate: salesRep.commissionRate },
      });
    }
  }

  res.status(201).json(ad);
});

// GET /ads/my - sales rep's ads
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const salesRep = await prisma.salesRep.findUnique({ where: { userId: req.user!.id } });
  if (!salesRep) return res.status(404).json({ error: 'Sales rep not found' });

  const ads = await prisma.ad.findMany({
    where: { salesRepId: salesRep.id },
    include: { commissions: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(ads);
});

export default router;
