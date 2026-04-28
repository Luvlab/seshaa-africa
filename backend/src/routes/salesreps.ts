import prisma from '../db';
import { Router, Response } from 'express';

import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();


// GET /salesreps/dashboard - rep's commission summary
router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  const salesRep = await prisma.salesRep.findUnique({
    where: { userId: req.user!.id },
    include: {
      commissions: {
        include: { ad: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!salesRep) return res.status(404).json({ error: 'Not a sales rep' });

  const unpaid = salesRep.commissions.filter(c => !c.paid).reduce((sum, c) => sum + c.amount, 0);
  const paid = salesRep.commissions.filter(c => c.paid).reduce((sum, c) => sum + c.amount, 0);

  const adCount = await prisma.ad.count({ where: { salesRepId: salesRep.id } });

  res.json({
    salesRep,
    stats: {
      totalEarned: salesRep.totalEarned,
      unpaid,
      paid,
      adCount,
      commissionRate: `${(salesRep.commissionRate * 100).toFixed(0)}%`,
    },
    recentCommissions: salesRep.commissions.slice(0, 10),
  });
});

// GET /salesreps/leaderboard
router.get('/leaderboard', async (_req, res) => {
  const reps = await prisma.salesRep.findMany({
    where: { active: true },
    include: { user: { select: { name: true, country: true } } },
    orderBy: { totalEarned: 'desc' },
    take: 20,
  });

  res.json(reps.map(r => ({
    name: r.user.name,
    country: r.user.country,
    territory: r.territory,
    totalEarned: r.totalEarned,
  })));
});

export default router;
