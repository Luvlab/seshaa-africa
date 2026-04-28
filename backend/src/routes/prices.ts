import prisma from '../db';
import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const PriceEntrySchema = z.object({
  listingId: z.string().uuid(),
  item: z.string().min(2).max(100),
  price: z.number().min(0),
  unit: z.string().optional(),
  currency: z.string().default('USD'),
  category: z.string(),
});

// GET /prices — compare prices across businesses
// Query: item (required), category, city, country
router.get('/', async (req, res) => {
  const { item, category, city, country, limit = '20' } = req.query as Record<string, string>;

  if (!item && !category) return res.status(400).json({ error: 'item or category required' });

  const listingWhere: Record<string, unknown> = { active: true };
  if (city) listingWhere.city = { contains: city, mode: 'insensitive' };
  if (country) listingWhere.country = country;

  const where: Record<string, unknown> = {};
  if (item) where.item = { contains: item, mode: 'insensitive' };
  if (category) where.category = category;
  where.listing = { is: listingWhere };

  const entries = await prisma.priceEntry.findMany({
    where,
    include: {
      listing: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          phone: true,
          logoUrl: true,
          avgRating: true,
          reviewCount: true,
          verified: true,
        },
      },
    },
    orderBy: { price: 'asc' },
    take: parseInt(limit),
  });

  // Group by item name for easier comparison
  type PriceRow = (typeof entries)[number];
  const grouped: Record<string, PriceRow[]> = {};
  entries.forEach((e: PriceRow) => {
    const key = e.item.toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  res.json({ entries, grouped, total: entries.length });
});

// GET /prices/listing/:listingId — get all prices for a business
router.get('/listing/:listingId', async (req, res) => {
  const entries = await prisma.priceEntry.findMany({
    where: { listingId: req.params.listingId },
    orderBy: [{ category: 'asc' }, { item: 'asc' }],
  });
  res.json(entries);
});

// GET /prices/trending — most compared items in a location
router.get('/trending', async (req, res) => {
  const { country, city } = req.query as Record<string, string>;

  const listingWhere: Record<string, unknown> = { active: true };
  if (country) listingWhere.country = country;
  if (city) listingWhere.city = { contains: city, mode: 'insensitive' };

  // Get most common items
  const items = await prisma.priceEntry.groupBy({
    by: ['item', 'category'],
    where: { listing: { is: listingWhere } },
    _count: { item: true },
    orderBy: { _count: { item: 'desc' } },
    take: 10,
  });

  res.json(items);
});

// POST /prices — business adds price entry
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = PriceEntrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // Verify ownership
  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.submittedById !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Upsert by listingId + item (one price per item per business)
  const entry = await prisma.priceEntry.upsert({
    where: { listingId_item: { listingId: parsed.data.listingId, item: parsed.data.item } },
    create: parsed.data,
    update: { price: parsed.data.price, unit: parsed.data.unit, currency: parsed.data.currency },
  });

  res.status(201).json(entry);
});

// POST /prices/bulk — add multiple prices at once
router.post('/bulk', requireAuth, async (req: AuthRequest, res: Response) => {
  const { listingId, entries } = req.body;

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.submittedById !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries array required' });
  }

  type EntryInput = { item: string; price: number; unit?: string; currency?: string; category: string };
  // Upsert each entry
  const results = await Promise.all(
    (entries as EntryInput[]).map((e) =>
      prisma.priceEntry.upsert({
        where: { listingId_item: { listingId, item: e.item } },
        create: { listingId, item: e.item, price: e.price, unit: e.unit, currency: e.currency || 'USD', category: e.category },
        update: { price: e.price, unit: e.unit, currency: e.currency || 'USD' },
      })
    )
  );

  res.json({ updated: results.length, entries: results });
});

// DELETE /prices/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const entry = await prisma.priceEntry.findUnique({
    where: { id: req.params.id },
    include: { listing: { select: { submittedById: true } } },
  });
  if (!entry) return res.status(404).json({ error: 'Not found' });
  if (entry.listing.submittedById !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.priceEntry.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
