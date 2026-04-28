import prisma from '../db';
import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const ClassifiedSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  price: z.number().min(0),
  currency: z.string().default('USD'),
  category: z.string(),
  condition: z.enum(['NEW', 'USED', 'REFURBISHED']).default('USED'),
  images: z.array(z.string().url()).max(6).optional(),
  city: z.string(),
  country: z.string(),
});

// GET /classifieds — search/list with filters
router.get('/', async (req, res) => {
  const { q, category, city, country, minPrice, maxPrice, condition, page = '1' } = req.query as Record<string, string>;
  const PAGE_SIZE = 20;
  const skip = (parseInt(page) - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = { status: 'ACTIVE' };
  if (category) where.category = category;
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (country) where.country = country;
  if (condition) where.condition = condition;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) (where.price as Record<string, number>).gte = parseFloat(minPrice);
    if (maxPrice) (where.price as Record<string, number>).lte = parseFloat(maxPrice);
  }

  const [items, total] = await Promise.all([
    prisma.classified.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.classified.count({ where }),
  ]);

  res.json({ items, total, page: parseInt(page), pages: Math.ceil(total / PAGE_SIZE) });
});

// GET /classifieds/categories — list available categories
router.get('/categories', (_req, res) => {
  res.json([
    'Electronics', 'Phones & Tablets', 'Computers',
    'Clothing & Fashion', 'Shoes', 'Bags & Accessories',
    'Furniture', 'Home & Garden', 'Appliances',
    'Vehicles', 'Motorcycles', 'Auto Parts',
    'Books & Education', 'Sports & Fitness', 'Kids & Toys',
    'Jobs & Services', 'Real Estate', 'Food & Agriculture', 'Other',
  ]);
});

// GET /classifieds/my — current user's listings
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const items = await prisma.classified.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});

// GET /classifieds/:id — single item
router.get('/:id', async (req, res) => {
  const item = await prisma.classified.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// POST /classifieds — create listing
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = ClassifiedSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const item = await prisma.classified.create({
    data: {
      ...parsed.data,
      images: parsed.data.images || [],
      userId: req.user!.id,
    },
  });

  res.status(201).json(item);
});

// PATCH /classifieds/:id — update or mark as sold
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const item = await prisma.classified.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (item.userId !== req.user!.id && req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  const { title, description, price, status, images } = req.body;
  const updated = await prisma.classified.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(images !== undefined ? { images } : {}),
    },
  });
  res.json(updated);
});

// DELETE /classifieds/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const item = await prisma.classified.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (item.userId !== req.user!.id && req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  await prisma.classified.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
