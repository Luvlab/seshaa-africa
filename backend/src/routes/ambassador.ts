import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const PRO_PRICES = {
  MONTHLY: 9.99,
  ANNUAL: 89.99,
};

// POST /ambassador/apply
router.post('/apply', requireAuth, async (req: AuthRequest, res: Response) => {
  const { country, city } = req.body;
  if (!country) return res.status(400).json({ error: 'country required' });

  const existing = await prisma.ambassador.findUnique({ where: { userId: req.user!.id } });
  if (existing) return res.status(409).json({ error: 'Already an ambassador' });

  const ambassador = await prisma.ambassador.create({
    data: { userId: req.user!.id, country, city: city || null },
  });

  await prisma.user.update({ where: { id: req.user!.id }, data: { role: 'AMBASSADOR' } });
  res.status(201).json(ambassador);
});

// GET /ambassador/dashboard
router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  const amb = await prisma.ambassador.findUnique({
    where: { userId: req.user!.id },
    include: {
      proSales: { include: { listing: { select: { name: true, city: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
      payouts: { orderBy: { createdAt: 'desc' }, take: 5 },
      _count: { select: { listingsEntered: true, proSales: true } },
    },
  });

  if (!amb) return res.status(404).json({ error: 'Not an ambassador' });

  // Recent listings I entered
  const recentListings = await prisma.listing.findMany({
    where: { enteredById: amb.id, verified: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, name: true, city: true, country: true, createdAt: true },
  });

  res.json({
    ambassador: amb,
    stats: {
      totalEarned: amb.totalEarned,
      pendingPayout: amb.pendingPayout,
      listingsEntered: amb._count.listingsEntered,
      proSalesSold: amb._count.proSales,
      listingKickbackRate: `$${amb.listingKickback} per verified listing`,
      proKickbackRate: `${(amb.proKickbackRate * 100).toFixed(0)}% of Pro subscription`,
    },
    recentProSales: amb.proSales,
    recentListings,
    recentPayouts: amb.payouts,
  });
});

// POST /ambassador/listings — submit a new listing as an ambassador (earns kickback when verified)
router.post('/listings', requireAuth, async (req: AuthRequest, res: Response) => {
  const amb = await prisma.ambassador.findUnique({ where: { userId: req.user!.id } });
  if (!amb) return res.status(403).json({ error: 'Not an ambassador' });

  const { name, phone, address, city, country, category, description, website, whatsapp } = req.body;
  if (!name || !city || !country) return res.status(400).json({ error: 'name, city, country required' });

  const listing = await prisma.listing.create({
    data: {
      type: 'BUSINESS',
      name,
      phone: phone || null,
      address: address || null,
      city,
      country,
      category: category || 'other',
      description: description || null,
      website: website || null,
      whatsapp: whatsapp || null,
      submittedById: req.user!.id,
      enteredById: amb.id,
      verified: false,
      active: true,
      language: 'en',
    },
  });

  res.status(201).json({ listing, message: 'Listing submitted. You earn $' + amb.listingKickback + ' once it is verified by our team.' });
});

// POST /ambassador/pro-sale — sell a Pro subscription to a business
router.post('/pro-sale', requireAuth, async (req: AuthRequest, res: Response) => {
  const amb = await prisma.ambassador.findUnique({ where: { userId: req.user!.id } });
  if (!amb) return res.status(403).json({ error: 'Not an ambassador' });

  const { listingId, plan = 'MONTHLY' } = req.body;
  if (!listingId) return res.status(400).json({ error: 'listingId required' });

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const existing = await prisma.proSubscription.findUnique({ where: { listingId } });
  if (existing?.active) return res.status(409).json({ error: 'Already a Pro subscriber' });

  const price = PRO_PRICES[plan as keyof typeof PRO_PRICES] || PRO_PRICES.MONTHLY;
  const kickback = price * amb.proKickbackRate;

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + (plan === 'ANNUAL' ? 12 : 1));

  const [sub] = await prisma.$transaction([
    prisma.proSubscription.create({
      data: { listingId, plan: plan as 'MONTHLY' | 'ANNUAL', price, ambassadorId: amb.id, kickback, endDate },
    }),
    prisma.listing.update({ where: { id: listingId }, data: { isPro: true } }),
    prisma.ambassador.update({
      where: { id: amb.id },
      data: {
        totalEarned: { increment: kickback },
        pendingPayout: { increment: kickback },
      },
    }),
  ]);

  res.status(201).json({
    subscription: sub,
    kickbackEarned: kickback,
    message: `You earned $${kickback.toFixed(2)} for this Pro sale!`,
  });
});

// GET /ambassador/leaderboard
router.get('/leaderboard', async (_req, res) => {
  const ambassadors = await prisma.ambassador.findMany({
    where: { active: true },
    include: {
      user: { select: { name: true } },
      _count: { select: { listingsEntered: true, proSales: true } },
    },
    orderBy: { totalEarned: 'desc' },
    take: 20,
  });

  res.json(ambassadors.map(a => ({
    name: a.user.name,
    country: a.country,
    city: a.city,
    totalEarned: a.totalEarned,
    listingsEntered: a._count.listingsEntered,
    proSales: a._count.proSales,
  })));
});

// GET /ambassador/pro-plans — show available Pro plans (public)
router.get('/pro-plans', (_req, res) => {
  res.json([
    {
      plan: 'MONTHLY', price: PRO_PRICES.MONTHLY, label: 'Pro Monthly',
      features: ['Featured placement', 'Photo gallery (20 photos)', 'Opening hours', 'Analytics dashboard', 'Verified badge', 'Priority support'],
      ambassadorKickback: `$${(PRO_PRICES.MONTHLY * 0.15).toFixed(2)}`,
    },
    {
      plan: 'ANNUAL', price: PRO_PRICES.ANNUAL, label: 'Pro Annual', badge: 'Best Value',
      features: ['All Monthly features', 'Multiple locations', 'Top of category results', 'Custom domain profile', 'WhatsApp integration', 'AI-generated description'],
      ambassadorKickback: `$${(PRO_PRICES.ANNUAL * 0.15).toFixed(2)}`,
    },
  ]);
});

// POST /ambassador/payout-request
router.post('/payout-request', requireAuth, async (req: AuthRequest, res: Response) => {
  const amb = await prisma.ambassador.findUnique({ where: { userId: req.user!.id } });
  if (!amb) return res.status(403).json({ error: 'Not an ambassador' });
  if (amb.pendingPayout < 10) return res.status(400).json({ error: 'Minimum payout is $10' });

  const { method = 'mobile_money' } = req.body;
  const payout = await prisma.ambassadorPayout.create({
    data: { ambassadorId: amb.id, amount: amb.pendingPayout, method },
  });

  await prisma.ambassador.update({ where: { id: amb.id }, data: { pendingPayout: 0 } });
  res.status(201).json({ payout, message: 'Payout request submitted. Processing within 3 business days.' });
});

export default router;
