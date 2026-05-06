/**
 * follows.ts — Follow/unfollow users and listings
 *
 * Routes:
 *   POST   /follows/user/:userId        — follow a user
 *   DELETE /follows/user/:userId        — unfollow a user
 *   POST   /follows/listing/:listingId  — follow a listing
 *   DELETE /follows/listing/:listingId  — unfollow a listing
 *   GET    /follows/my                  — my follows (users + listings with details)
 *   GET    /follows/check               — ?userId= or ?listingId= — are we following?
 *   GET    /follows/listing/:listingId/count — follower count for a listing
 */
import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Follow a user ─────────────────────────────────────────────────────────────
router.post('/user/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  const followerId = req.user!.id;
  const followingUserId = req.params['userId'] as string;
  if (followerId === followingUserId) return res.status(400).json({ error: 'Cannot follow yourself' });
  try {
    const follow = await prisma.follow.upsert({
      where: { followerId_followingUserId: { followerId, followingUserId } },
      update: {},
      create: { followerId, followingUserId },
    });
    res.status(201).json(follow);
  } catch { res.status(409).json({ error: 'Already following' }); }
});

// ── Unfollow a user ───────────────────────────────────────────────────────────
router.delete('/user/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  const followerId = req.user!.id;
  const followingUserId = req.params['userId'] as string;
  await prisma.follow.deleteMany({ where: { followerId, followingUserId } });
  res.json({ ok: true });
});

// ── Follow a listing ──────────────────────────────────────────────────────────
router.post('/listing/:listingId', requireAuth, async (req: AuthRequest, res: Response) => {
  const followerId = req.user!.id;
  const followingListingId = req.params['listingId'] as string;
  try {
    const follow = await prisma.follow.upsert({
      where: { followerId_followingListingId: { followerId, followingListingId } },
      update: {},
      create: { followerId, followingListingId },
    });
    res.status(201).json(follow);
  } catch { res.status(409).json({ error: 'Already following' }); }
});

// ── Unfollow a listing ────────────────────────────────────────────────────────
router.delete('/listing/:listingId', requireAuth, async (req: AuthRequest, res: Response) => {
  const followerId = req.user!.id;
  const followingListingId = req.params['listingId'] as string;
  await prisma.follow.deleteMany({ where: { followerId, followingListingId } });
  res.json({ ok: true });
});

// ── My follows ────────────────────────────────────────────────────────────────
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const followerId = req.user!.id;
  const follows = await prisma.follow.findMany({
    where: { followerId },
    include: {
      followingUser:    { select: { id: true, name: true, role: true, avatarUrl: true } },
      followingListing: { select: { id: true, name: true, city: true, country: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(follows);
});

// ── Check if following ────────────────────────────────────────────────────────
router.get('/check', requireAuth, async (req: AuthRequest, res: Response) => {
  const followerId = req.user!.id;
  const { userId, listingId } = req.query as Record<string, string>;
  if (!userId && !listingId) return res.status(400).json({ error: 'userId or listingId required' });
  const follow = await prisma.follow.findFirst({
    where: userId
      ? { followerId, followingUserId: userId }
      : { followerId, followingListingId: listingId },
  });
  res.json({ following: Boolean(follow) });
});

// ── Follower count for a listing ──────────────────────────────────────────────
router.get('/listing/:listingId/count', async (req, res: Response) => {
  const count = await prisma.follow.count({ where: { followingListingId: req.params['listingId'] as string } });
  res.json({ count });
});

export default router;
