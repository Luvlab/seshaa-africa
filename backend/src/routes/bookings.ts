/**
 * Bookings — Pro-only feature.
 * Businesses with an active Pro subscription + bookable=true can receive bookings.
 * Categories: chauffeur/transport, catering, beauty/salon, garage/auto, hotel, events
 */
import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const BOOKABLE_CATEGORIES = ['transport', 'chauffeur', 'catering', 'beauty', 'salon', 'garage', 'auto', 'hotel', 'events', 'spa', 'cleaning', 'photography'];

// GET /bookings/my — current user's bookings
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: {
      listing: { select: { id: true, name: true, address: true, city: true, country: true, phone: true, logoUrl: true } },
    },
    orderBy: { date: 'asc' },
    take: 50,
  });
  res.json(bookings);
});

// GET /bookings/listing/:listingId — listing owner sees their incoming bookings
router.get('/listing/:listingId', requireAuth, async (req: AuthRequest, res: Response) => {
  const listingId = req.params.listingId as string;
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.submittedById !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const bookings = await prisma.booking.findMany({
    where: { listingId },
    include: { user: { select: { id: true, name: true, phone: true } } },
    orderBy: { date: 'asc' },
  });
  res.json(bookings);
});

// POST /bookings — create a booking
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { listingId, service, date, duration, notes, guestCount, contactName, contactPhone } = req.body;
  if (!listingId || !service || !date) {
    return res.status(400).json({ error: 'listingId, service, and date required' });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { proSubscription: true },
  });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (!listing.bookable || !listing.proSubscription?.active) {
    return res.status(403).json({ error: 'This business does not accept online bookings (Pro feature)' });
  }

  const booking = await prisma.booking.create({
    data: {
      listingId,
      userId: req.user!.id,
      service,
      date: new Date(date),
      duration: duration || null,
      notes: notes || null,
      guestCount: guestCount || 1,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
    },
    include: {
      listing: { select: { id: true, name: true, address: true, city: true, phone: true } },
    },
  });

  res.status(201).json(booking);
});

// PATCH /bookings/:id — update booking status (owner or admin)
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { listing: { select: { name: true, phone: true, address: true, submittedById: true } } },
  }) as (Awaited<ReturnType<typeof prisma.booking.findUnique>> & { listing: { name: string; phone: string | null; address: string | null; submittedById: string } }) | null;
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const isOwner = booking.listing.submittedById === req.user!.id;
  const isGuest = booking.userId === req.user!.id;
  const isAdmin = req.user!.role === 'ADMIN';

  if (!isOwner && !isGuest && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
  if (isGuest && status !== 'CANCELLED') return res.status(403).json({ error: 'Guests can only cancel' });

  const updated = await prisma.booking.update({ where: { id }, data: { status } });
  res.json(updated);
});

// GET /bookings/categories — bookable service categories
router.get('/categories', (_req, res) => {
  res.json(BOOKABLE_CATEGORIES);
});

export default router;
