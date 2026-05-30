/**
 * Sales Feedback & Wishlist
 * Sales reps submit bugs and feature requests; teammates can upvote.
 * Admins can update status and reply.
 *
 * GET    /api/feedback              — list all items (sorted by upvotes)
 * POST   /api/feedback              — create new item (auth required)
 * POST   /api/feedback/:id/upvote   — toggle upvote (auth required)
 * PATCH  /api/feedback/:id          — update status / reply (admin only)
 * DELETE /api/feedback/:id          — delete (admin or own item)
 */
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../db';

const router = Router();

// ── Admin guard (inline — mirrors admin.ts) ───────────────────────────────────
function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if ((req.user as { role?: string })?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  next();
}

type FeedbackRow = {
  id: string; userId: string; userName?: string; userAvatar?: string;
  type: string; title: string; description: string | null;
  status: string; priority: string;
  upvotes: number; upvoterIds: string[];
  adminReply: string | null;
  createdAt: Date; updatedAt: Date;
};

// ── List ──────────────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const { type, status } = req.query as Record<string, string>;
  const conditions: string[] = [];
  const vals: unknown[] = [];
  let p = 1;
  if (type)   { conditions.push(`f."type" = $${p++}`);   vals.push(type); }
  if (status) { conditions.push(`f."status" = $${p++}`); vals.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows: FeedbackRow[] = await (prisma as any).$queryRawUnsafe(
    `SELECT f.*, u.name as "userName", u."avatarUrl" as "userAvatar"
     FROM "SalesFeedback" f
     LEFT JOIN "User" u ON u.id = f."userId"
     ${where}
     ORDER BY f.upvotes DESC, f."createdAt" DESC
     LIMIT 200`,
    ...vals
  );
  res.json(rows);
});

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { type = 'feature', title, description, priority = 'normal' } = req.body as Record<string, string>;
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });

  const safeType     = ['bug','feature','other'].includes(type)           ? type     : 'feature';
  const safePriority = ['low','normal','high'].includes(priority)         ? priority : 'normal';

  const rows: FeedbackRow[] = await (prisma as any).$queryRawUnsafe(
    `INSERT INTO "SalesFeedback" ("userId","type","title","description","priority")
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    req.user!.id, safeType, title.trim().slice(0, 200),
    description?.trim().slice(0, 2000) || null, safePriority
  );
  res.status(201).json(rows[0]);
});

// ── Upvote (toggle) ───────────────────────────────────────────────────────────
router.post('/:id/upvote', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const uid = req.user!.id;

  const existing: FeedbackRow[] = await (prisma as any).$queryRawUnsafe(
    `SELECT * FROM "SalesFeedback" WHERE id = $1`, id
  );
  if (!existing.length) return res.status(404).json({ error: 'not found' });

  const row = existing[0];
  const already    = row.upvoterIds.includes(uid);
  const newVoters  = already ? row.upvoterIds.filter((v: string) => v !== uid) : [...row.upvoterIds, uid];
  const newCount   = newVoters.length;

  const updated: FeedbackRow[] = await (prisma as any).$queryRawUnsafe(
    `UPDATE "SalesFeedback" SET "upvotes" = $1, "upvoterIds" = $2::text[], "updatedAt" = now()
     WHERE id = $3 RETURNING *`,
    newCount, newVoters, id
  );
  res.json({ upvotes: updated[0].upvotes, upvoterIds: updated[0].upvoterIds, voted: !already });
});

// ── Admin: update status / reply / priority ───────────────────────────────────
router.patch('/:id', requireAuth, adminOnly, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminReply, priority } = req.body as Record<string, string>;

  const sets: string[]  = ['"updatedAt" = now()'];
  const vals: unknown[] = [];
  let p = 1;
  if (status   !== undefined) { sets.push(`"status" = $${p++}`);     vals.push(status); }
  if (adminReply !== undefined) { sets.push(`"adminReply" = $${p++}`); vals.push(adminReply); }
  if (priority !== undefined) { sets.push(`"priority" = $${p++}`);   vals.push(priority); }

  if (sets.length === 1) return res.status(400).json({ error: 'nothing to update' });

  vals.push(id);
  const updated: FeedbackRow[] = await (prisma as any).$queryRawUnsafe(
    `UPDATE "SalesFeedback" SET ${sets.join(', ')} WHERE id = $${p} RETURNING *`,
    ...vals
  );
  if (!updated.length) return res.status(404).json({ error: 'not found' });
  res.json(updated[0]);
});

// ── Delete (own or admin) ─────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const uid  = req.user!.id;
  const role = (req.user as { role?: string })?.role;

  const existing: FeedbackRow[] = await (prisma as any).$queryRawUnsafe(
    `SELECT * FROM "SalesFeedback" WHERE id = $1`, id
  );
  if (!existing.length) return res.status(404).json({ error: 'not found' });
  if (existing[0].userId !== uid && role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });

  await (prisma as any).$queryRawUnsafe(`DELETE FROM "SalesFeedback" WHERE id = $1`, id);
  res.json({ ok: true });
});

export default router;
