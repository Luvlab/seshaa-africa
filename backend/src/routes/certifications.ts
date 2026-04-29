/**
 * Seshaa Certification & Awards
 * Certification: earned when business has Pro + 4.5+ stars + 10+ reviews
 * Awards: annual "Seshaa Awards" — Best Business per category per city/country
 * Sticker verification: public /verify/:listingId endpoint
 */
import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /certifications/verify/:code — verify a Pro sticker code (public, used by QR scan)
router.get('/verify/:code', async (req, res) => {
  const sub = await prisma.proSubscription.findUnique({
    where: { stickerCode: req.params.code },
    include: {
      listing: {
        select: {
          id: true, name: true, address: true, city: true, country: true,
          category: true, verified: true, avgRating: true, reviewCount: true,
          logoUrl: true, certification: true, awards: { orderBy: { year: 'desc' }, take: 5 },
        },
      },
    },
  });

  if (!sub || !sub.active) {
    return res.status(404).json({ error: 'Invalid or expired sticker code' });
  }

  res.json({
    valid: true,
    stickerCode: sub.stickerCode,
    listing: sub.listing,
    plan: sub.plan,
    memberSince: sub.startDate,
    expiresAt: sub.endDate,
    badge: 'Seshaa Pro Verified',
    message: `${sub.listing.name} is an officially verified Pro business on Seshaa.`,
  });
});

// GET /certifications/listing/:listingId — get certification + awards for a listing (public)
router.get('/listing/:listingId', async (req, res) => {
  const listingId = req.params.listingId as string;
  const cert = await prisma.seshaaCertification.findUnique({ where: { listingId } });
  const awards = await prisma.seshaaAward.findMany({
    where: { listingId },
    orderBy: [{ year: 'desc' }, { rank: 'asc' }],
  });
  res.json({ certification: cert, awards });
});

// POST /certifications/check-eligibility/:listingId — auto-check if listing qualifies for certification
router.post('/check-eligibility/:listingId', requireAuth, async (req: AuthRequest, res: Response) => {
  const listingId = req.params.listingId as string;
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { proSubscription: true },
  }) as (Awaited<ReturnType<typeof prisma.listing.findUnique>> & { proSubscription: { active: boolean } | null }) | null;
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const eligible =
    listing.isPro &&
    listing.proSubscription?.active &&
    listing.avgRating >= 4.5 &&
    listing.reviewCount >= 10 &&
    listing.verified;

  const level = listing.avgRating >= 4.8 && listing.reviewCount >= 50 ? 'PLATINUM'
    : listing.avgRating >= 4.6 && listing.reviewCount >= 25 ? 'GOLD'
    : 'STANDARD';

  if (eligible) {
    const cert = await prisma.seshaaCertification.upsert({
      where: { listingId },
      create: {
        listingId,
        level: level as 'STANDARD' | 'GOLD' | 'PLATINUM',
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      update: { level: level as 'STANDARD' | 'GOLD' | 'PLATINUM', awardedAt: new Date() },
    });
    return res.json({ eligible: true, level, certification: cert });
  }

  const missing = [];
  if (!listing.isPro) missing.push('Active Pro subscription required');
  if (listing.avgRating < 4.5) missing.push(`Rating must be 4.5+ (current: ${listing.avgRating})`);
  if (listing.reviewCount < 10) missing.push(`Minimum 10 reviews required (current: ${listing.reviewCount})`);
  if (!listing.verified) missing.push('Listing must be verified');

  res.json({ eligible: false, missing });
});

// POST /certifications/award — admin: grant award to a business
router.post('/award', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { listingId, category, city, country, year, rank } = req.body;
  if (!listingId || !category || !country || !year) {
    return res.status(400).json({ error: 'listingId, category, country, year required' });
  }
  const award = await prisma.seshaaAward.upsert({
    where: { category_city_country_year_rank: { category, city: city || null, country, year, rank: rank || 1 } },
    create: { listingId, category, city: city || null, country, year, rank: rank || 1 },
    update: { listingId },
  });
  res.json(award);
});

// GET /certifications/awards — public awards listing
router.get('/awards', async (req, res) => {
  const { country, year, category } = req.query;
  const awards = await prisma.seshaaAward.findMany({
    where: {
      ...(country ? { country: country as string } : {}),
      ...(year ? { year: Number(year) } : {}),
      ...(category ? { category: category as string } : {}),
    },
    include: {
      listing: { select: { id: true, name: true, city: true, logoUrl: true, avgRating: true } },
    },
    orderBy: [{ year: 'desc' }, { rank: 'asc' }],
    take: 100,
  });
  res.json(awards);
});

export default router;
