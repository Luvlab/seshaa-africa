import prisma from '../db';
import { Router, Response } from 'express';

import { z } from 'zod';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { expandQuery } from '../utils/searchExpand';

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
  openingHours: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  language: z.string().default('en'),
  tags: z.array(z.string()).optional(),
  tier: z.enum(['SILVER', 'GOLD', 'DIAMOND']).default('SILVER'),
  bookable: z.boolean().default(false),
  isPro: z.boolean().default(false),
});

// GET /listings - search & browse
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { q, city, country, category, type, submittedById, tier, tag, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = { active: true };
  if (country) where.country = { equals: country, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (category) where.category = { equals: category, mode: 'insensitive' };
  if (type) where.type = type;
  if (tier) where.tier = tier;
  if (submittedById) where.submittedById = submittedById;
  // Tag filter — show listings that have a tag matching the given name
  if (tag) where.tags = { some: { name: { contains: tag, mode: 'insensitive' } } };
  if (q) {
    const { terms, categoryHint } = expandQuery(q);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textClauses: any[] = terms.flatMap(term => [
      { name:        { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { address:     { contains: term, mode: 'insensitive' } },
      { subcategory: { contains: term, mode: 'insensitive' } },
      { tags: { some: { name: { contains: term, mode: 'insensitive' } } } },
    ]);
    textClauses.push({ phone: { contains: q } });
    if (categoryHint && !category) {
      // categoryHint matches actual DB category values (e.g. 'auto', 'retail', 'beauty')
      textClauses.push({ category: { equals: categoryHint, mode: 'insensitive' } });
    }
    where.OR = textClauses;
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
    include: {
      tags: true,
      ads: { where: { active: true }, take: 3 },
      certification: true,
      awards: { orderBy: { year: 'desc' }, take: 5 },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  // increment view count in background (non-blocking)
  prisma.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => null);
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

// GET /listings/osm-search?q=...&countryCode=...
router.get('/osm-search', async (req, res) => {
  const { q, countryCode } = req.query as Record<string, string>;
  if (!q) return res.status(400).json({ error: 'q is required' });

  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: '7',
    addressdetails: '1',
  });
  if (countryCode) params.set('countrycodes', countryCode);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { 'User-Agent': 'Seshaa/1.0 (info@seshaa.africa)' } }
    );
    if (!response.ok) {
      return res.status(502).json({ error: 'Upstream error from Nominatim' });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
