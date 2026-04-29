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
    where: { id: req.params.id as string },
    data: { verified: true },
  });
  res.json(listing);
});

// POST /admin/listings/:id/reject
router.post('/listings/:id/reject', requireAuth, adminOnly, async (req, res) => {
  await prisma.listing.update({ where: { id: req.params.id as string }, data: { active: false } });
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

// GET /admin/financials — full financial dashboard (revenue, costs, loan fund)
router.get('/financials', requireAuth, adminOnly, async (_req, res) => {
  const [
    totalRevenue,
    activeProSubs,
    monthlyRevenue,
    annualRevenue,
    commissionsPaid,
    commissionsPending,
    ambassadorPayouts,
    loanStats,
    adRevenue,
  ] = await Promise.all([
    prisma.proSubscription.aggregate({ _sum: { price: true }, where: { active: true } }),
    prisma.proSubscription.count({ where: { active: true } }),
    prisma.proSubscription.aggregate({ _sum: { price: true }, where: { active: true, plan: 'MONTHLY' } }),
    prisma.proSubscription.aggregate({ _sum: { price: true }, where: { active: true, plan: 'ANNUAL' } }),
    prisma.commission.aggregate({ _sum: { amount: true }, where: { paid: true } }),
    prisma.commission.aggregate({ _sum: { amount: true }, where: { paid: false } }),
    prisma.ambassadorPayout.aggregate({ _sum: { amount: true }, where: { paid: true } }),
    prisma.microLoan.aggregate({ _sum: { approvedAmount: true, amount: true }, _count: true }),
    prisma.ad.aggregate({ _sum: { spent: true }, where: { active: true } }),
  ]);

  const totalProRevenue = totalRevenue._sum.price || 0;
  const loanFund = totalProRevenue * 0.05; // 5% of Pro revenue → loan fund
  const disbursedLoans = await prisma.microLoan.aggregate({
    _sum: { approvedAmount: true },
    where: { status: { in: ['DISBURSED', 'REPAID'] } },
  });
  const repaidLoans = await prisma.microLoan.aggregate({
    _sum: { approvedAmount: true },
    where: { status: 'REPAID' },
  });

  const mrr = (monthlyRevenue._sum.price || 0) + ((annualRevenue._sum.price || 0) / 12);

  res.json({
    revenue: {
      totalProSubscriptions: totalProRevenue,
      activeSubscriptions: activeProSubs,
      monthlyRecurringRevenue: Math.round(mrr * 100) / 100,
      adRevenue: adRevenue._sum.spent || 0,
    },
    costs: {
      salesCommissionsPaid: commissionsPaid._sum.amount || 0,
      salesCommissionsPending: commissionsPending._sum.amount || 0,
      ambassadorPayoutsPaid: ambassadorPayouts._sum.amount || 0,
      estimatedInfraNote: 'Neon DB + Vercel hosting + Claude API — check provider dashboards for live costs',
    },
    loanFund: {
      totalAllocated: Math.round(loanFund * 100) / 100,
      totalDisbursed: disbursedLoans._sum.approvedAmount || 0,
      totalRepaid: repaidLoans._sum.approvedAmount || 0,
      available: Math.round((loanFund - (disbursedLoans._sum.approvedAmount || 0) + (repaidLoans._sum.approvedAmount || 0)) * 100) / 100,
      totalApplications: loanStats._count,
    },
    net: {
      estimated: Math.round((totalProRevenue - (commissionsPaid._sum.amount || 0) - (ambassadorPayouts._sum.amount || 0) - loanFund) * 100) / 100,
    },
  });
});

// POST /admin/ambassador-payouts/approve/:id
router.post('/ambassador-payouts/approve/:id', requireAuth, adminOnly, async (req, res) => {
  const payout = await prisma.ambassadorPayout.update({
    where: { id: req.params.id as string },
    data: { paid: true, paidAt: new Date() },
  });
  res.json(payout);
});

// GET /admin/ambassador-payouts — pending payouts
router.get('/ambassador-payouts', requireAuth, adminOnly, async (_req, res) => {
  const payouts = await prisma.ambassadorPayout.findMany({
    where: { paid: false },
    include: { ambassador: { include: { user: { select: { name: true, phone: true, country: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(payouts);
});

export default router;
