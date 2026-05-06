/**
 * groups.ts — Group chat management
 *
 * Routes:
 *   GET    /groups            — list groups I belong to (creator or member)
 *   POST   /groups            — create a group  { name, memberIds[] }
 *   GET    /groups/:id        — group details
 *   POST   /groups/:id/members — add a member  { userId }
 *   DELETE /groups/:id/members/:userId — remove a member (creator or self)
 *   DELETE /groups/:id        — delete group (creator only)
 */
import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ── List groups I'm in ────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const groups = await prisma.chatGroup.findMany({
    where: { OR: [{ creatorId: userId }, { memberIds: { has: userId } }] },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  // Enrich with creator name
  const creatorIds = [...new Set(groups.map(g => g.creatorId))];
  const creators = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, name: true },
  });
  const creatorMap = Object.fromEntries(creators.map(c => [c.id, c.name]));
  const result = groups.map(g => ({ ...g, creatorName: creatorMap[g.creatorId] ?? 'Unknown' }));
  res.json(result);
});

// ── Create group ──────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, memberIds = [] } = req.body as { name: string; memberIds?: string[] };
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  const id = uuid();
  const channelId = `group:${id}`;
  // Always include creator in members
  const members = [...new Set([userId, ...memberIds])];
  const group = await prisma.chatGroup.create({
    data: { id, name: name.trim(), creatorId: userId, memberIds: members, channelId },
  });
  res.status(201).json(group);
});

// ── Get group ─────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const group = await prisma.chatGroup.findFirst({
    where: {
      id: req.params['id'] as string,
      OR: [{ creatorId: userId }, { memberIds: { has: userId } }],
    },
  });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group);
});

// ── Add member ────────────────────────────────────────────────────────────────
router.post('/:id/members', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { userId: newMemberId } = req.body as { userId: string };
  if (!newMemberId) return res.status(400).json({ error: 'userId required' });
  const group = await prisma.chatGroup.findFirst({
    where: { id: req.params['id'] as string, OR: [{ creatorId: userId }, { memberIds: { has: userId } }] },
  });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.memberIds.includes(newMemberId)) return res.json(group);
  const updated = await prisma.chatGroup.update({
    where: { id: group.id },
    data: { memberIds: [...group.memberIds, newMemberId], updatedAt: new Date() },
  });
  res.json(updated);
});

// ── Remove member ─────────────────────────────────────────────────────────────
router.delete('/:id/members/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  const requesterId = req.user!.id;
  const { id: groupId, userId: targetId } = req.params as { id: string; userId: string };
  const group = await prisma.chatGroup.findUnique({ where: { id: groupId } });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  // Only creator can remove others; anyone can remove themselves
  if (requesterId !== group.creatorId && requesterId !== targetId) return res.status(403).json({ error: 'Forbidden' });
  const updated = await prisma.chatGroup.update({
    where: { id: groupId },
    data: { memberIds: group.memberIds.filter(m => m !== targetId), updatedAt: new Date() },
  });
  res.json(updated);
});

// ── Delete group (creator only) ───────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const group = await prisma.chatGroup.findUnique({ where: { id: req.params['id'] as string } });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.creatorId !== userId) return res.status(403).json({ error: 'Only the creator can delete this group' });
  await prisma.chatGroup.delete({ where: { id: group.id } });
  res.json({ ok: true });
});

export default router;
