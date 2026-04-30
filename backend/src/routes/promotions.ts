import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const PromotionSchema = z.object({
  listingId: z.string(),
  type: z.enum(['OFFER', 'ANNOUNCEMENT', 'HIRING', 'NEW_PRODUCT']),
  title: z.string().min(3),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  discount: z.number().optional(),
  couponCode: z.string().optional(),
  endDate: z.string().optional(),
});

async function assertOwnership(
  listingId: string,
  userId: string,
  role: string
): Promise<boolean> {
  if (role === 'ADMIN') return true;
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, submittedById: userId },
  });
  return listing !== null;
}

// GET /promotions
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const querySchema = z.object({
    listingId: z.string().optional(),
    type: z.enum(['OFFER', 'ANNOUNCEMENT', 'HIRING', 'NEW_PRODUCT']).optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { listingId, type, city, country, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const listingWhere: Record<string, unknown> = {};
  if (city) listingWhere.city = { contains: city, mode: 'insensitive' };
  if (country) listingWhere.country = country;
  const hasListingFilter = Object.keys(listingWhere).length > 0;

  const where: Record<string, unknown> = { active: true };
  if (listingId) where.listingId = listingId;
  if (type) where.type = type;
  if (hasListingFilter) {
    where.listing = listingWhere;
  }

  try {
    const [promotions, total] = await Promise.all([
      prisma.businessPromotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { listing: { select: { id: true, name: true, city: true, country: true } } },
      }),
      prisma.businessPromotion.count({ where }),
    ]);
    res.json({ promotions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /promotions/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const promotion = await prisma.businessPromotion.findUnique({
      where: { id },
      include: { listing: { select: { id: true, name: true, city: true, country: true } } },
    });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

    await prisma.businessPromotion.update({ where: { id }, data: { views: { increment: 1 } } });
    res.json(promotion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /promotions
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = PromotionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const allowed = await assertOwnership(parsed.data.listingId, req.user!.id, req.user!.role);
    if (!allowed) return res.status(403).json({ error: 'Forbidden: you do not own this listing' });

    const promotion = await prisma.businessPromotion.create({
      data: {
        ...parsed.data,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        active: true,
      },
      include: { listing: { select: { id: true, name: true, city: true, country: true } } },
    });
    res.status(201).json(promotion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /promotions/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const promotion = await prisma.businessPromotion.findUnique({ where: { id } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

    const allowed = await assertOwnership(promotion.listingId, req.user!.id, req.user!.role);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const parsed = PromotionSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { endDate, listingId, ...rest } = parsed.data;
    const updated = await prisma.businessPromotion.update({
      where: { id },
      data: {
        ...rest,
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
      include: { listing: { select: { id: true, name: true, city: true, country: true } } },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /promotions/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const promotion = await prisma.businessPromotion.findUnique({ where: { id } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

    const allowed = await assertOwnership(promotion.listingId, req.user!.id, req.user!.role);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    await prisma.businessPromotion.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
