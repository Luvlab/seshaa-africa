import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  next();
}

const router = Router();

// POST /contact — public submission
router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body as {
    name?: string; email?: string; phone?: string; subject?: string; message?: string;
  };
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }

  await prisma.listing.create({
    data: {
      name: `Contact: ${name.trim()}`,
      description: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone || '', subject: subject || '', message: message.trim() }),
      osmId: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'CONTACT' as never,
      city: 'Seshaa',
      country: 'UG',
      active: false,
      verified: false,
      category: 'contact',
    },
  });

  res.json({ ok: true });
});

// GET /contact/admin — admin list of all contacts
router.get('/admin', requireAuth, adminOnly, async (_req, res) => {
  const rows = await prisma.listing.findMany({
    where: { category: 'contact' },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const contacts = rows.map(r => {
    let data: Record<string, string> = {};
    try { data = JSON.parse(r.description || '{}'); } catch { /* ok */ }
    return { id: r.id, createdAt: r.createdAt, ...data };
  });

  res.json(contacts);
});

export default router;
