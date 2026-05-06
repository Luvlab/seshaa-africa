/**
 * market.ts — seshaa.market business product listings
 *
 * GOLD and DIAMOND tier listings can add products to the marketplace.
 * Consumers browse products from African businesses.
 *
 * Routes:
 *   GET  /market/products            — all active products (public, paginated)
 *   GET  /market/products/:listingId — products from one business (public)
 *   POST /market/products            — create product (auth + GOLD+ listing owner)
 *   PATCH /market/products/:id       — update product (auth + owner)
 *   DELETE /market/products/:id      — delete product (auth + owner)
 *   GET  /market/my-products         — products I've listed (auth)
 */
import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET /market/products — all active products (public) ───────────────────────
router.get('/products', async (req, res: Response) => {
  const { country, category, limit = '40', offset = '0' } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { active: true, inStock: true };

  const products = await prisma.marketProduct.findMany({
    where,
    include: {
      listing: {
        select: { id: true, name: true, city: true, country: true, category: true, tier: true },
      },
    },
    orderBy: [
      { listing: { tier: 'desc' } }, // DIAMOND first, then GOLD
      { createdAt: 'desc' },
    ],
    take: Math.min(100, parseInt(limit)),
    skip: parseInt(offset),
  });

  // Filter by country/category via listing if provided
  const filtered = products.filter(p => {
    if (country && p.listing.country !== country) return false;
    if (category && p.listing.category !== category) return false;
    return true;
  });

  res.json(filtered);
});

// ── GET /market/products/:listingId — products from a specific business ────────
router.get('/products/:listingId', async (req, res: Response) => {
  const products = await prisma.marketProduct.findMany({
    where: { listingId: req.params['listingId'] as string, active: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(products);
});

// ── POST /market/products — create a product ──────────────────────────────────
router.post('/products', requireAuth, async (req: AuthRequest, res: Response) => {
  const { listingId, name, description, imageUrl, price, currency = 'USD', inStock = true, contactUrl } = req.body;
  const userId = req.user!.id;

  if (!listingId || !name?.trim()) return res.status(400).json({ error: 'listingId and name required' });

  // Verify ownership and tier
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, submittedById: true, tier: true },
  });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.submittedById !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not your listing' });
  }
  if (!['GOLD', 'DIAMOND'].includes(listing.tier) && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Upgrade to GOLD or DIAMOND to list products on the market' });
  }

  const product = await prisma.marketProduct.create({
    data: { listingId, name: name.trim(), description, imageUrl, price, currency, inStock, contactUrl },
    include: { listing: { select: { id: true, name: true } } },
  });

  res.status(201).json(product);
});

// ── PATCH /market/products/:id — update a product ─────────────────────────────
router.patch('/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const userId = req.user!.id;

  const product = await prisma.marketProduct.findUnique({
    where: { id },
    include: { listing: { select: { submittedById: true } } },
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.listing.submittedById !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { name, description, imageUrl, price, currency, inStock, contactUrl, active } = req.body;
  const updated = await prisma.marketProduct.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(price !== undefined && { price }),
      ...(currency !== undefined && { currency }),
      ...(inStock !== undefined && { inStock }),
      ...(contactUrl !== undefined && { contactUrl }),
      ...(active !== undefined && { active }),
    },
  });
  res.json(updated);
});

// ── DELETE /market/products/:id ────────────────────────────────────────────────
router.delete('/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const userId = req.user!.id;

  const product = await prisma.marketProduct.findUnique({
    where: { id },
    include: { listing: { select: { submittedById: true } } },
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.listing.submittedById !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  await prisma.marketProduct.delete({ where: { id } });
  res.json({ ok: true });
});

// ── GET /market/my-products — products I've listed ────────────────────────────
router.get('/my-products', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  // Get all listings owned by this user
  const listings = await prisma.listing.findMany({
    where: { submittedById: userId },
    select: { id: true, name: true },
  });
  const listingIds = listings.map(l => l.id);

  const products = await prisma.marketProduct.findMany({
    where: { listingId: { in: listingIds } },
    include: { listing: { select: { id: true, name: true, tier: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json(products);
});

export default router;
