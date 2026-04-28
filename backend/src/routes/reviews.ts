import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /reviews/:listingId — get all reviews for a listing
router.get('/:listingId', async (req, res) => {
  const { listingId } = req.params;
  const reviews = await prisma.review.findMany({
    where: { listingId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(reviews);
});

// POST /reviews — create or update review (one per user per listing)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { listingId, rating, comment } = req.body;
  if (!listingId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'listingId and rating (1–5) required' });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const review = await prisma.review.upsert({
    where: { listingId_userId: { listingId, userId: req.user!.id } },
    create: { listingId, userId: req.user!.id, rating, comment: comment || null },
    update: { rating, comment: comment || null },
  });

  // Recalculate avg rating
  const agg = await prisma.review.aggregate({
    where: { listingId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      avgRating: Math.round((agg._avg.rating || 0) * 10) / 10,
      reviewCount: agg._count,
    },
  });

  res.json(review);
});

// POST /reviews/:id/helpful — increment helpful count
router.post('/:id/helpful', requireAuth, async (req, res) => {
  const review = await prisma.review.update({
    where: { id: req.params.id },
    data: { helpfulCount: { increment: 1 } },
  });
  res.json(review);
});

// POST /reviews/:id/reply — owner replies to review
router.post('/:id/reply', requireAuth, async (req: AuthRequest, res: Response) => {
  const { reply } = req.body;
  const review = await prisma.review.findUnique({ where: { id: req.params.id }, include: { listing: true } });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.listing.submittedById !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not the listing owner' });
  }
  const updated = await prisma.review.update({ where: { id: req.params.id }, data: { ownerReply: reply } });
  res.json(updated);
});

export default router;
