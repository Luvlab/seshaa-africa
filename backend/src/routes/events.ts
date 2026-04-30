import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const EventSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  venue: z.string().optional(),
  city: z.string(),
  country: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  ticketUrl: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().default('USD'),
  isFree: z.boolean().default(true),
  listingId: z.string().optional(),
});

// GET /events
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const querySchema = z.object({
    city: z.string().optional(),
    country: z.string().optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { city, country, category, status, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const isAdminOrAmbassador =
    req.user?.role === 'ADMIN' || req.user?.role === 'AMBASSADOR';

  const statusFilter = status
    ? (status.split(',') as ('PENDING' | 'APPROVED' | 'FEATURED' | 'CANCELLED')[])
    : isAdminOrAmbassador
    ? undefined
    : (['APPROVED', 'FEATURED'] as const);

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = { in: statusFilter };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (country) where.country = country;
  if (category) where.category = category;

  try {
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
        include: { _count: { select: { attendees: true } } },
      }),
      prisma.event.count({ where }),
    ]);

    res.json({ events, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /events/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { _count: { select: { attendees: true } } },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    await prisma.event.update({ where: { id }, data: { views: { increment: 1 } } });
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /events
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = EventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const event = await prisma.event.create({
      data: {
        ...parsed.data,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        status: 'PENDING',
        submittedById: req.user!.id,
      },
      include: { _count: { select: { attendees: true } } },
    });
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /events/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.submittedById !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parsed = EventSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { startDate, endDate, ...rest } = parsed.data;
    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
      include: { _count: { select: { attendees: true } } },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /events/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.submittedById !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.event.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /events/:id/attend — toggle RSVP
router.post('/:id/attend', requireAuth, async (req: AuthRequest, res: Response) => {
  const eventId = req.params.id as string;
  const userId = req.user!.id;

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const existing = await prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing) {
      await prisma.eventAttendee.delete({
        where: { eventId_userId: { eventId, userId } },
      });
      res.json({ attending: false });
    } else {
      await prisma.eventAttendee.create({ data: { eventId, userId } });
      res.json({ attending: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /events/:id/attendees
router.get('/:id/attendees', optionalAuth, async (req: AuthRequest, res: Response) => {
  const eventId = req.params.id as string;
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(attendees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /events/:id/feature — ambassador/admin only
router.post('/:id/feature', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const role = req.user!.role;

  if (role !== 'ADMIN' && role !== 'AMBASSADOR') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const updated = await prisma.event.update({
      where: { id },
      data: { status: 'FEATURED', featuredById: req.user!.id },
      include: { _count: { select: { attendees: true } } },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
