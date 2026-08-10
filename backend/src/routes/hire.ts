import { Router } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

export const HIRE_PROFESSIONS = [
  'DJ', 'Musician', 'Artist', 'Photographer', 'Videographer', 'Actor', 'Dancer', 'MC / Emcee',
  'Electrician', 'Carpenter', 'Plumber', 'Painter', 'Mechanic', 'Welder', 'Mason',
  'Cleaner', 'Nanny', 'Chef', 'Hairdresser', 'Barber', 'Makeup Artist', 'Tailor',
  'Personal Trainer', 'Security Guard', 'Driver', 'Gardener',
  'Lawyer', 'Accountant', 'Doctor', 'Nurse', 'Tutor', 'IT Technician',
  'Graphic Designer', 'Event Planner', 'Wedding Coordinator', 'Social Media Manager',
];

function qs(val: unknown): string | undefined {
  return typeof val === 'string' ? val : undefined;
}

// GET /api/hire/professions
router.get('/professions', (_req, res) => {
  res.json(HIRE_PROFESSIONS);
});

// GET /api/hire/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const profile = await prisma.hireProfile.findUnique({
    where: { userId: req.user!.id },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  res.json(profile ?? null);
});

// GET /api/hire/bookings/sent
router.get('/bookings/sent', requireAuth, async (req: AuthRequest, res) => {
  const bookings = await prisma.hireBooking.findMany({
    where: { clientId: req.user!.id },
    include: {
      profile: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(bookings);
});

// GET /api/hire/bookings/received
router.get('/bookings/received', requireAuth, async (req: AuthRequest, res) => {
  const myProfile = await prisma.hireProfile.findUnique({ where: { userId: req.user!.id } });
  if (!myProfile) return res.json([]);

  const bookings = await prisma.hireBooking.findMany({
    where: { profileId: myProfile.id },
    include: {
      client: { select: { id: true, name: true, avatarUrl: true, phone: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(bookings);
});

// PATCH /api/hire/bookings/:id
router.patch('/bookings/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const booking = await prisma.hireBooking.findUnique({ where: { id } });
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });

  const prof = await prisma.hireProfile.findUnique({ where: { id: booking.profileId } });
  if (prof?.userId !== req.user!.id) return res.status(403).json({ error: 'Forbidden.' });

  const { status } = req.body as { status: string };
  const updated = await prisma.hireBooking.update({
    where: { id },
    data: { status: status as never },
  });
  res.json(updated);
});

// GET /api/hire?profession=DJ&country=Uganda&city=Kampala
router.get('/', async (req, res) => {
  const profession = qs(req.query.profession);
  const country    = qs(req.query.country);
  const city       = qs(req.query.city);
  const available  = qs(req.query.available);
  const search     = qs(req.query.search);

  const profiles = await prisma.hireProfile.findMany({
    where: {
      ...(available !== 'false' && { available: true }),
      ...(profession && { profession }),
      ...(country && { country }),
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { profession: { contains: search, mode: 'insensitive' } },
          { bio: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, country: true } },
    },
    orderBy: [{ avgRating: 'desc' }, { createdAt: 'desc' }],
    take: 80,
  });

  res.json(profiles);
});

// POST /api/hire/profile
router.post('/profile', requireAuth, async (req: AuthRequest, res) => {
  const { profession, bio, hourlyRate, dayRate, currency, available, country, city, skills, photos } = req.body as {
    profession?: string;
    bio?: string;
    hourlyRate?: number;
    dayRate?: number;
    currency?: string;
    available?: boolean;
    country?: string;
    city?: string;
    skills?: string[];
    photos?: string[];
  };

  if (!profession) return res.status(400).json({ error: 'Profession is required.' });

  const profile = await prisma.hireProfile.upsert({
    where: { userId: req.user!.id },
    update: {
      profession, bio, available,
      hourlyRate: hourlyRate ?? null,
      dayRate: dayRate ?? null,
      currency: currency || 'UGX',
      country: country || 'Uganda',
      city: city || null,
      skills: skills || [],
      photos: photos || [],
      updatedAt: new Date(),
    },
    create: {
      userId: req.user!.id,
      profession, bio,
      hourlyRate: hourlyRate ?? null,
      dayRate: dayRate ?? null,
      currency: currency || 'UGX',
      available: available ?? true,
      country: country || 'Uganda',
      city: city || null,
      skills: skills || [],
      photos: photos || [],
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  res.json(profile);
});

// GET /api/hire/:id — MUST be last to avoid matching /professions, /me, /bookings/*
router.get('/:id', async (req, res) => {
  const profile = await prisma.hireProfile.findUnique({
    where: { id: String(req.params.id) },
    include: { user: { select: { id: true, name: true, avatarUrl: true, country: true, instagram: true, tiktok: true } } },
  });
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  res.json(profile);
});

// POST /api/hire/:id/book — MUST be after /profile
router.post('/:id/book', requireAuth, async (req: AuthRequest, res) => {
  const profileId = String(req.params.id);
  const profile = await prisma.hireProfile.findUnique({ where: { id: profileId } });
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  if (profile.userId === req.user!.id) return res.status(400).json({ error: 'You cannot book yourself.' });

  const { date, duration, message, totalPrice } = req.body as {
    date?: string;
    duration?: number;
    message?: string;
    totalPrice?: number;
  };

  if (!message?.trim()) return res.status(400).json({ error: 'Message is required.' });

  const booking = await prisma.hireBooking.create({
    data: {
      profileId,
      clientId: req.user!.id,
      date: date ? new Date(date) : null,
      duration: duration ?? null,
      message: message.trim(),
      totalPrice: totalPrice ?? null,
    },
  });

  res.status(201).json(booking);
});

export default router;
