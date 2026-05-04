/**
 * messages.ts — Persistent multi-channel chat
 *
 * Channels:
 *   dm:{userA}:{userB}   — direct message between two users (IDs sorted)
 *   listing:{listingId}  — buyer/seller chat about a listing
 *   admin                — admin internal channel
 *   salesreps            — admin ↔ sales-reps channel
 *   ambassadors          — admin ↔ ambassadors channel
 *   ai:{userId}          — per-user AI conversation history (stored for context)
 *
 * All messages are polled (GET /messages/:channelId?after=ISO).
 * Supabase Realtime is the recommended upgrade path for true push.
 */
import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────
function dmChannelId(a: string, b: string) {
  return `dm:${[a, b].sort().join(':')}`;
}

function canAccessChannel(channelId: string, channelType: string, userId: string, role: string) {
  if (channelType === 'admin' && role !== 'ADMIN') return false;
  if (channelType === 'salesreps' && !['ADMIN', 'SALES_REP'].includes(role)) return false;
  if (channelType === 'ambassadors' && !['ADMIN', 'AMBASSADOR'].includes(role)) return false;
  if (channelId.startsWith('dm:') && !channelId.includes(userId)) return false;
  return true;
}

// ── GET /messages/:channelId — fetch messages (poll) ─────────────────────────
router.get('/:channelId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params as { channelId: string };
  const { after, limit = '50' } = req.query as Record<string, string>;
  const userId = req.user!.id;
  const role   = req.user!.role;

  // Infer channelType from channelId prefix
  let channelType = 'dm';
  if (channelId === 'admin')       channelType = 'admin';
  else if (channelId === 'salesreps')   channelType = 'salesreps';
  else if (channelId === 'ambassadors') channelType = 'ambassadors';
  else if (channelId.startsWith('listing:')) channelType = 'listing';
  else if (channelId.startsWith('ai:'))      channelType = 'ai';

  if (!canAccessChannel(channelId, channelType, userId, role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const where: Record<string, unknown> = { channelId };
  if (after) where.createdAt = { gt: new Date(after) };

  const messages = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT * FROM "DirectMessage" WHERE "channelId" = $1 ${after ? `AND "createdAt" > $2` : ''} ORDER BY "createdAt" ASC LIMIT $${after ? 3 : 2}`,
    ...(after ? [channelId, new Date(after), parseInt(limit)] : [channelId, parseInt(limit)])
  );

  res.json(messages);
});

// ── POST /messages/:channelId — send a message ────────────────────────────────
router.post('/:channelId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params as { channelId: string };
  const { content, messageType = 'text', metadata } = req.body as { content: string; messageType?: string; metadata?: unknown };
  const userId = req.user!.id;
  const role   = req.user!.role;

  let channelType = 'dm';
  if (channelId === 'admin')       channelType = 'admin';
  else if (channelId === 'salesreps')   channelType = 'salesreps';
  else if (channelId === 'ambassadors') channelType = 'ambassadors';
  else if (channelId.startsWith('listing:')) channelType = 'listing';
  else if (channelId.startsWith('ai:'))      channelType = 'ai';

  if (!canAccessChannel(channelId, channelType, userId, role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } });

  const msg = await prisma.$queryRawUnsafe<unknown[]>(
    `INSERT INTO "DirectMessage" ("channelId","channelType","senderId","senderName","senderRole","content","messageType","metadata","readBy")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,ARRAY[$3])
     RETURNING *`,
    channelId, channelType, userId, user?.name ?? 'User', role,
    content.trim(), messageType,
    metadata ? JSON.stringify(metadata) : null
  );

  res.status(201).json(msg[0]);
});

// ── POST /messages/dm/start — open or get a DM channel between two users ─────
router.post('/dm/start', requireAuth, async (req: AuthRequest, res: Response) => {
  const { recipientId } = req.body as { recipientId: string };
  const userId = req.user!.id;
  if (!recipientId) return res.status(400).json({ error: 'recipientId required' });
  const channelId = dmChannelId(userId, recipientId);
  res.json({ channelId });
});

// ── POST /messages/:channelId/read — mark messages as read ───────────────────
router.post('/:channelId/read', requireAuth, async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params as { channelId: string };
  const userId = req.user!.id;
  await prisma.$executeRawUnsafe(
    `UPDATE "DirectMessage" SET "readBy" = array_append("readBy", $1) WHERE "channelId" = $2 AND NOT ($1 = ANY("readBy"))`,
    userId, channelId
  );
  res.json({ ok: true });
});

// ── GET /messages/channels/list — list channels the user participates in ──────
router.get('/channels/list', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const role   = req.user!.role;

  // Always include role-based channels
  const channels: { channelId: string; channelType: string; label: string }[] = [];
  if (['ADMIN'].includes(role))                       channels.push({ channelId: 'admin',       channelType: 'admin',       label: '🔐 Admin' });
  if (['ADMIN', 'SALES_REP'].includes(role))         channels.push({ channelId: 'salesreps',   channelType: 'salesreps',   label: '💼 Sales Reps' });
  if (['ADMIN', 'AMBASSADOR'].includes(role))        channels.push({ channelId: 'ambassadors', channelType: 'ambassadors', label: '🌍 Ambassadors' });

  // DM channels
  const dms = await prisma.$queryRawUnsafe<{ channelId: string; lastMsg: string; lastAt: string; unread: number }[]>(
    `SELECT "channelId",
            MAX("content") as "lastMsg",
            MAX("createdAt") as "lastAt",
            COUNT(*) FILTER (WHERE NOT ($1 = ANY("readBy"))) as "unread"
     FROM "DirectMessage"
     WHERE "channelType" = 'dm' AND "channelId" LIKE $2
     GROUP BY "channelId"
     ORDER BY MAX("createdAt") DESC
     LIMIT 30`,
    userId, `%${userId}%`
  );

  res.json({ fixed: channels, dms });
});

export default router;
