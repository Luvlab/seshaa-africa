import prisma from '../db';
import { Router, Response } from 'express';

import { z } from 'zod';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();


const ListingSchema = z.object({
  type: z.enum(['PERSONAL', 'BUSINESS', 'GOVERNMENT', 'NGO']),
  name: z.string().min(2).max(200),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().min(1),
  country: z.string().min(2),
  region: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  description: z.string().max(1000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  language: z.string().default('en'),
  tags: z.array(z.string()).optional(),
});

// GET /listings - search & browse
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { q, city, country, category, type, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = { active: true };
  if (country) where.country = country;
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (category) where.category = category;
  if (type) where.type = type;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { address: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ verified: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
      include: { ads: { where: { active: true }, take: 1, select: { tier: true } } },
    }),
    prisma.listing.count({ where }),
  ]);

  res.json({ listings, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// GET /listings/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { tags: true, ads: { where: { active: true } } },
  });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  await prisma.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  res.json(listing);
});

// POST /listings
router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const parsed = ListingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { tags, ...data } = parsed.data;
  const listing = await prisma.listing.create({
    data: {
      ...data,
      email: data.email || null,
      website: data.website || null,
      submittedById: req.user?.id,
      tags: tags?.length ? { create: tags.map(name => ({ name })) } : undefined,
    },
    include: { tags: true },
  });

  res.status(201).json(listing);
});

// PUT /listings/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return res.status(404).json({ error: 'Not found' });
  if (listing.submittedById !== req.user?.id && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const parsed = ListingSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { tags, ...data } = parsed.data;
  const updated = await prisma.listing.update({
    where: { id },
    data: {
      ...data,
      tags: tags ? { deleteMany: {}, create: tags.map(name => ({ name })) } : undefined,
    },
    include: { tags: true },
  });

  res.json(updated);
});

// DELETE /listings/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return res.status(404).json({ error: 'Not found' });
  if (listing.submittedById !== req.user?.id && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.listing.update({ where: { id }, data: { active: false } });
  res.json({ success: true });
});

// GET /listings/countries/list
router.get('/meta/countries', async (_req, res) => {
  const countries = await prisma.listing.findMany({
    where: { active: true },
    select: { country: true },
    distinct: ['country'],
    orderBy: { country: 'asc' },
  });
  res.json(countries.map(c => c.country));
});

// GET /listings/meta/categories
router.get('/meta/categories', async (_req, res) => {
  const categories = await prisma.listing.findMany({
    where: { active: true, category: { not: null } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  res.json(categories.map(c => c.category).filter(Boolean));
});

export default router;
