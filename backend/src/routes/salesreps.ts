import prisma from '../db';
import { Router, Response } from 'express';

import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /salesreps/apply — public application (no auth required)
router.post('/apply', async (req, res) => {
  const { name, phone, country, city, why } = req.body as {
    name: string; phone: string; country: string; city?: string; why?: string;
  };

  if (!name?.trim() || !phone?.trim() || !country?.trim()) {
    return res.status(400).json({ error: 'Name, phone, and country are required' });
  }

  // Find or create user by phone
  let user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: name.trim(), phone: phone.trim(), country: country.trim(), role: 'USER' },
    });
  }

  // Check if already a sales rep
  const existing = await prisma.salesRep.findUnique({ where: { userId: user.id } });
  if (existing) {
    if (existing.active) return res.status(400).json({ error: 'Already an active sales rep' });
    return res.json({ ok: true, pending: true, message: 'Your application is already under review.' });
  }

  const territory = city ? `${city.trim()}, ${country.trim()}` : country.trim();
  await prisma.salesRep.create({
    data: { userId: user.id, territory, country: country.trim(), active: false },
  });

  // Optionally store the "why" in a note — append to territory field
  if (why?.trim()) {
    await prisma.salesRep.update({
      where: { userId: user.id },
      data: { territory: `${territory} — ${why.trim().slice(0, 200)}` },
    });
  }

  res.json({ ok: true, message: 'Application submitted! We\'ll review it within 24 hours.' });
});


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

  const unpaid = salesRep.commissions.filter(c => !c.paid).reduce((sum: number, c: { amount: number }) => sum + c.amount, 0);
  const paid = salesRep.commissions.filter(c => c.paid).reduce((sum: number, c: { amount: number }) => sum + c.amount, 0);

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
