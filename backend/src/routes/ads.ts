import prisma from '../db';
import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Ad preset packages
export const AD_PACKAGES = {
  starter:    { tier: 'BANNER',    days: 7,  price: 9.99,  label: 'Starter',    reach: '5k–20k',    desc: 'Get found in your city' },
  boost:      { tier: 'SPONSORED', days: 30, price: 29.99, label: 'Boost',      reach: '50k–200k',  desc: 'Country-wide visibility' },
  pro:        { tier: 'FEATURED',  days: 30, price: 79.99, label: 'Pro',        reach: '100k–500k', desc: 'Top of category results' },
  growth:     { tier: 'FEATURED',  days: 30, price: 199,   label: 'Growth',     reach: '300k–1M',   desc: 'Multi-country Featured' },
  continental:{ tier: 'SPONSORED', days: 30, price: 499,   label: 'Continental',reach: '1M–5M',     desc: 'All of Africa, Sponsored' },
  premium:    { tier: 'PREMIUM',   days: 30, price: 999,   label: 'Premium',    reach: '5M+',       desc: 'Homepage + all categories' },
} as const;

// ——— Scoring algorithm ———
interface AdContext {
  country?: string;
  city?: string;
  category?: string;
  interests?: string[];
  keywords?: string[];
  sessionId?: string;
  localHour?: number;    // viewer's local hour 0-23 for daypart matching
  lifestyle?: string[];  // inferred lifestyle tags for the viewer
}

interface ScoredAd {
  id: string;
  score: number;
  [key: string]: unknown;
}

async function scoreAndRank(ads: ScoredAd[], context: AdContext, limit = 3): Promise<ScoredAd[]> {
  const TIER_WEIGHT: Record<string, number> = { PREMIUM: 100, FEATURED: 70, SPONSORED: 40, BANNER: 10 };

  // Get frequency for this session to cap repetition
  const seenCounts: Record<string, number> = {};
  if (context.sessionId) {
    const seen = await prisma.adImpression.groupBy({
      by: ['adId'],
      where: { sessionId: context.sessionId, shownAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      _count: true,
    });
    seen.forEach(s => { seenCounts[s.adId] = s._count; });
  }

  const scored = ads.map(ad => {
    let score = TIER_WEIGHT[(ad.tier as string) || 'BANNER'] || 10;

    // Geo match
    const adCity = (ad.city as string | undefined)?.toLowerCase();
    const adCountry = (ad.country as string | undefined)?.toLowerCase();
    if (context.city && adCity === context.city.toLowerCase()) score += 45;
    else if (context.country && adCountry === context.country.toLowerCase()) score += 25;
    else if (!adCity && !adCountry) score += 3; // Africa-wide

    // Countries array match
    const adCountries = (ad.countries as string[]) || [];
    if (context.country && adCountries.map(c => c.toLowerCase()).includes(context.country.toLowerCase())) score += 20;

    // Category match
    const adCat = (ad.category as string | undefined)?.toLowerCase();
    if (context.category && adCat === context.category.toLowerCase()) score += 35;

    // Interest match
    const adInterests = (ad.targetInterests as string[]) || [];
    const adKeywords = (ad.targetKeywords as string[]) || [];
    if (context.interests?.length) {
      const interestHits = context.interests.filter(i =>
        adCat?.includes(i.toLowerCase()) || adInterests.includes(i.toLowerCase())
      ).length;
      score += interestHits * 20;
    }

    // Keyword match
    if (context.keywords?.length && adKeywords.length) {
      const kHits = context.keywords.filter(k =>
        adKeywords.some(ak => ak.toLowerCase().includes(k.toLowerCase())) ||
        (ad.title as string)?.toLowerCase().includes(k.toLowerCase())
      ).length;
      score += kHits * 12;
    }

    // Budget signal (max +25)
    score += Math.min(((ad.budget as number) || 0) / 40, 25);

    // Recency boost — new campaigns (<3 days) get a bump
    const ageMs = Date.now() - new Date(ad.startDate as string).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < 3) score += 12;

    // Frequency capping — penalize ads seen 3+ times today
    const seen = seenCounts[ad.id] || 0;
    if (seen >= 5) score -= 999; // effectively removes
    else if (seen >= 3) score -= 30;
    else if (seen >= 1) score -= 8;

    // Daypart scheduling — hard filter: if ad has dayparts set and current hour doesn't match, exclude
    const adDayparts = (ad.dayparts as string[]) || [];
    if (adDayparts.length > 0) {
      const localHour = (context as AdContext & { localHour?: number }).localHour ?? -1;
      if (localHour >= 0) {
        const slot = localHour >= 5 && localHour < 10 ? 'morning'
          : localHour >= 10 && localHour < 14 ? 'lunch'
          : localHour >= 14 && localHour < 17 ? 'afternoon'
          : localHour >= 17 && localHour < 22 ? 'evening'
          : 'night';
        if (!adDayparts.includes(slot)) score -= 999;
      }
    }

    // Lifestyle audience match
    const adLifestyle = (ad.lifestyleTargets as string[]) || [];
    const ctxLifestyle = (context as AdContext & { lifestyle?: string[] }).lifestyle || [];
    if (adLifestyle.length > 0 && ctxLifestyle.length > 0) {
      const lHits = adLifestyle.filter(l => ctxLifestyle.includes(l)).length;
      score += lHits * 25;
    }

    // Small randomization to prevent always-same order
    score += Math.random() * 8;

    return { ...ad, score };
  });

  return scored
    .filter(a => a.score > -100)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const AdSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(200).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  targetUrl: z.string().url(),
  advertiser: z.string().min(2),
  contactPhone: z.string().optional(),
  listingId: z.string().uuid().optional(),
  salesRepId: z.string().uuid().optional(),
  tier: z.enum(['BANNER', 'FEATURED', 'SPONSORED', 'PREMIUM']).default('BANNER'),
  country: z.string().optional(),
  city: z.string().optional(),
  countries: z.array(z.string()).optional(),
  category: z.string().optional(),
  targetKeywords: z.array(z.string()).optional(),
  targetInterests: z.array(z.string()).optional(),
  dayparts:         z.array(z.string()).optional(),
  lifestyleTargets: z.array(z.string()).optional(),
  packageId: z.string().optional(),
  dailyBudget: z.number().optional(),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().positive(),
});

// GET /ads — smart contextual ad serving
router.get('/', async (req, res) => {
  const { country, city, category, tier, sessionId, interests, keywords, localHour, lifestyle } = req.query as Record<string, string>;

  const now = new Date();
  const where: Record<string, unknown> = {
    active: true,
    approved: true,
    startDate: { lte: now },
    endDate: { gte: now },
  };
  if (tier) where.tier = tier;

  // Broad fetch then score
  const ads = await prisma.ad.findMany({
    where,
    take: 50,
    orderBy: { tier: 'desc' },
  });

  const context: AdContext = {
    country,
    city,
    category,
    sessionId,
    interests: interests ? interests.split(',').filter(Boolean) : [],
    keywords: keywords ? keywords.split(',').filter(Boolean) : [],
    localHour: localHour !== undefined ? parseInt(localHour, 10) : undefined,
    lifestyle: lifestyle ? lifestyle.split(',').filter(Boolean) : [],
  };

  const ranked = await scoreAndRank(ads as unknown as ScoredAd[], context, 5);

  // Track impressions asynchronously
  if (ranked.length && sessionId) {
    prisma.adImpression.createMany({
      data: ranked.map(a => ({ adId: a.id, sessionId, page: category || null })),
    }).catch(() => {});
    prisma.ad.updateMany({
      where: { id: { in: ranked.map(a => a.id) } },
      data: { impressions: { increment: 1 } },
    }).catch(() => {});
  }

  res.json(ranked);
});

// GET /ads/packages — return all packages
router.get('/packages', (_req, res) => {
  res.json(AD_PACKAGES);
});

// POST /ads/:id/click — track click
router.post('/:id/click', async (req, res) => {
  const ad = await prisma.ad.update({
    where: { id: req.params.id },
    data: { clicks: { increment: 1 }, spent: { increment: 0.05 } },
  });
  const ctr = ad.impressions > 0 ? ad.clicks / ad.impressions : 0;
  await prisma.ad.update({ where: { id: req.params.id }, data: { ctr } }).catch(() => {});
  res.json({ success: true });
});

// POST /ads — create ad (self-serve or API)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = AdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { salesRepId, ...data } = parsed.data;

  // Apply package defaults
  let startDate = data.startDate ? new Date(data.startDate) : new Date();
  let endDate = data.endDate ? new Date(data.endDate) : new Date();
  if (data.packageId && AD_PACKAGES[data.packageId as keyof typeof AD_PACKAGES]) {
    const pkg = AD_PACKAGES[data.packageId as keyof typeof AD_PACKAGES];
    if (!data.startDate) startDate = new Date();
    if (!data.endDate) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + pkg.days);
    }
  }

  const ad = await prisma.ad.create({
    data: {
      title: data.title,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      targetUrl: data.targetUrl,
      advertiser: data.advertiser,
      contactPhone: data.contactPhone || null,
      listingId: data.listingId || null,
      salesRepId: salesRepId || null,
      tier: data.tier,
      country: data.country || null,
      city: data.city || null,
      countries: data.countries || [],
      category: data.category || null,
      targetKeywords: data.targetKeywords || [],
      targetInterests: data.targetInterests || [],
      dayparts:         data.dayparts || [],
      lifestyleTargets: data.lifestyleTargets || [],
      packageId: data.packageId || null,
      dailyBudget: data.dailyBudget || null,
      startDate,
      endDate,
      budget: data.budget,
      userId: req.user!.id,
    },
  });

  // Commission for sales rep
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

// GET /ads/my — advertiser's own campaigns
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const ads = await prisma.ad.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(ads);
});

// GET /ads/my/stats — aggregate campaign stats
router.get('/my/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  const ads = await prisma.ad.findMany({ where: { userId: req.user!.id } });
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);
  const totalSpent = ads.reduce((s, a) => s + a.spent, 0);
  const totalBudget = ads.reduce((s, a) => s + a.budget, 0);
  res.json({
    campaigns: ads.length,
    active: ads.filter(a => a.active && new Date(a.endDate) >= new Date()).length,
    totalImpressions,
    totalClicks,
    avgCtr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '0%',
    totalSpent,
    remainingBudget: totalBudget - totalSpent,
  });
});

// PATCH /ads/:id — pause/resume/edit campaign
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const ad = await prisma.ad.findUnique({ where: { id } });
  if (!ad) return res.status(404).json({ error: 'Ad not found' });
  if (ad.userId !== req.user!.id && req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  const { active, title, description, imageUrl } = req.body;
  const updated = await prisma.ad.update({
    where: { id },
    data: {
      ...(active !== undefined ? { active } : {}),
      ...(title ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    },
  });
  res.json(updated);
});

// GET /ads/rep — sales rep's ad assignments
router.get('/rep', requireAuth, async (req: AuthRequest, res: Response) => {
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
