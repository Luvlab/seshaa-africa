import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function adminOnly(req: AuthRequest, res: Response, next: () => void) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  next();
}

// GET /admin/stats
router.get('/stats', requireAuth, adminOnly, async (_req, res) => {
  const [listings, users, ads, salesReps, pendingListings] = await Promise.all([
    prisma.listing.count({ where: { active: true } }),
    prisma.user.count(),
    prisma.ad.count({ where: { active: true } }),
    prisma.salesRep.count({ where: { active: true } }),
    prisma.listing.count({ where: { verified: false, active: true } }),
  ]);

  const countryCounts = await prisma.listing.groupBy({
    by: ['country'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const categoryCounts = await prisma.listing.groupBy({
    by: ['category'],
    _count: { id: true },
    where: { category: { not: null } },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  res.json({
    stats: { listings, users, ads, salesReps, pendingListings },
    topCountries: countryCounts.map(c => ({ country: c.country, count: c._count.id })),
    topCategories: categoryCounts.map(c => ({ category: c.category, count: c._count.id })),
  });
});

// GET /admin/listings?status=pending
router.get('/listings', requireAuth, adminOnly, async (req, res) => {
  const { status = 'pending', page = '1' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * 30;

  const where = status === 'pending'
    ? { verified: false, active: true }
    : status === 'all'
    ? {}
    : { active: true };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({ where, skip, take: 30, orderBy: { createdAt: 'desc' }, include: { tags: true } }),
    prisma.listing.count({ where }),
  ]);

  res.json({ listings, total, pages: Math.ceil(total / 30) });
});

// POST /admin/listings/:id/verify
router.post('/listings/:id/verify', requireAuth, adminOnly, async (req, res) => {
  const listing = await prisma.listing.update({
    where: { id: req.params.id },
    data: { verified: true },
  });
  res.json(listing);
});

// POST /admin/listings/:id/reject
router.post('/listings/:id/reject', requireAuth, adminOnly, async (req, res) => {
  await prisma.listing.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ success: true });
});

// GET /admin/users
router.get('/users', requireAuth, adminOnly, async (req, res) => {
  const { page = '1', q } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * 50;
  const where = q ? { OR: [
    { name: { contains: q, mode: 'insensitive' as const } },
    { email: { contains: q, mode: 'insensitive' as const } },
  ]} : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: 50, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  res.json({ users: users.map(u => ({ ...u })), total });
});

// POST /admin/commissions/pay — mark commissions paid
router.post('/commissions/pay', requireAuth, adminOnly, async (req, res) => {
  const { salesRepId } = req.body;
  const result = await prisma.commission.updateMany({
    where: { salesRepId, paid: false },
    data: { paid: true, paidAt: new Date() },
  });

  // Update totalEarned on salesRep
  const sum = await prisma.commission.aggregate({
    where: { salesRepId },
    _sum: { amount: true },
  });

  await prisma.salesRep.update({
    where: { id: salesRepId },
    data: { totalEarned: sum._sum.amount || 0 },
  });

  res.json({ updated: result.count });
});

// GET /admin/scraper/status — last scrape stats
router.get('/scraper/status', requireAuth, adminOnly, async (_req, res) => {
  const total = await prisma.listing.count({ where: { osmId: { not: null } } });
  const byCountry = await prisma.listing.groupBy({
    by: ['country'],
    where: { osmId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  res.json({
    scrapedTotal: total,
    byCountry: byCountry.map(r => ({ country: r.country, count: r._count.id })),
  });
});

export default router;
