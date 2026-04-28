/**
 * Seshaa Bank — 0%-interest micro-loans for women entrepreneurs.
 * Funded by 5% of Pro subscription revenue.
 * Disbursed via M-Pesa, MTN MoMo, Orange Money, or Celo wallet.
 */
import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const MIN_LOAN = 20;
const MAX_LOAN = 500;

// GET /bank/stats — public fund stats
router.get('/stats', async (_req, res) => {
  const [total, disbursed, repaid] = await Promise.all([
    prisma.microLoan.aggregate({ _sum: { approvedAmount: true }, where: { status: { in: ['APPROVED', 'DISBURSED', 'REPAID'] } } }),
    prisma.microLoan.aggregate({ _sum: { approvedAmount: true }, where: { status: 'DISBURSED' } }),
    prisma.microLoan.aggregate({ _sum: { approvedAmount: true }, where: { status: 'REPAID' } }),
    ]);
  const count = await prisma.microLoan.count({ where: { status: { in: ['DISBURSED', 'REPAID'] } } });
  res.json({
    totalAllocated: total._sum.approvedAmount || 0,
    totalDisbursed: disbursed._sum.approvedAmount || 0,
    totalRepaid: repaid._sum.approvedAmount || 0,
    womenHelped: count,
    interestRate: '0%',
    message: 'Funded by 5% of all Seshaa Pro subscription revenue',
  });
});

// GET /bank/my — current user's loan history
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const loans = await prisma.microLoan.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(loans);
});

// POST /bank/apply — apply for a micro-loan
router.post('/apply', requireAuth, async (req: AuthRequest, res: Response) => {
  const { amount, purpose, listingId, repaymentMethod } = req.body;
  if (!amount || !purpose) return res.status(400).json({ error: 'amount and purpose required' });
  if (amount < MIN_LOAN || amount > MAX_LOAN) {
    return res.status(400).json({ error: `Loan amount must be between $${MIN_LOAN} and $${MAX_LOAN}` });
  }

  // Check for existing active loan
  const active = await prisma.microLoan.findFirst({
    where: { userId: req.user!.id, status: { in: ['PENDING', 'APPROVED', 'DISBURSED'] } },
  });
  if (active) return res.status(409).json({ error: 'You already have an active loan application' });

  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + 6); // 6-month repayment window

  const loan = await prisma.microLoan.create({
    data: {
      userId: req.user!.id,
      listingId: listingId || null,
      amount,
      purpose,
      repaymentMethod: repaymentMethod || 'mobile_money',
      dueDate,
    },
  });

  res.status(201).json({
    loan,
    message: 'Application received. Our team will review and respond within 3 business days.',
    criteria: [
      'Must be a woman entrepreneur',
      'Must have a verified business or be starting one',
      'Loan is interest-free',
      'Repayment via mobile money or Celo wallet',
    ],
  });
});

// PATCH /bank/:id — admin: approve / disburse / reject
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { status, approvedAmount, notes } = req.body;

  const update: Record<string, unknown> = { status };
  if (approvedAmount) update.approvedAmount = approvedAmount;
  if (notes) update.notes = notes;
  if (status === 'DISBURSED') update.disbursedAt = new Date();
  if (status === 'REPAID') update.repaidAt = new Date();

  const loan = await prisma.microLoan.update({ where: { id: req.params.id }, data: update });
  res.json(loan);
});

// GET /bank/applications — admin: all applications
router.get('/applications', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { status } = req.query;
  const loans = await prisma.microLoan.findMany({
    where: status ? { status: status as import('@prisma/client').LoanStatus } : {},
    include: { user: { select: { id: true, name: true, phone: true, country: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(loans);
});

export default router;
