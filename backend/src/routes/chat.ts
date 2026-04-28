import prisma from '../db';
import { Router, Response } from 'express';

import { requireAuth, AuthRequest } from '../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();


// In-memory chat store (replace with Redis/DB in production)
const rooms = new Map<string, {
  id: string; type: string; name?: string; participants: string[];
  messages: {
    id: string; senderId: string; senderName: string; content: string;
    type: string; metadata?: unknown; timestamp: string; readBy: string[];
  }[];
  createdAt: string;
}>();

// GET /chat/rooms — list user's rooms
router.get('/rooms', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const userRooms = Array.from(rooms.values())
    .filter(r => r.participants.includes(userId))
    .map(r => ({
      ...r,
      lastMessage: r.messages[r.messages.length - 1] || null,
      unreadCount: r.messages.filter(m => !m.readBy.includes(userId)).length,
      messages: undefined,
    }));
  res.json(userRooms);
});

// POST /chat/rooms — create or get DM room
router.post('/rooms', requireAuth, async (req: AuthRequest, res: Response) => {
  const { recipientId, type = 'direct', name, participants } = req.body;
  const userId = req.user!.id;

  if (type === 'direct' && recipientId) {
    const existing = Array.from(rooms.values()).find(
      r => r.type === 'direct' && r.participants.includes(userId) && r.participants.includes(recipientId)
    );
    if (existing) return res.json(existing);

    const room = {
      id: uuid(), type: 'direct',
      participants: [userId, recipientId],
      messages: [],
      createdAt: new Date().toISOString(),
    };
    rooms.set(room.id, room);
    return res.status(201).json(room);
  }

  // Group room
  const allParticipants = [userId, ...(participants || [])];
  const room = {
    id: uuid(), type: 'group', name: name || 'Group',
    participants: allParticipants,
    messages: [],
    createdAt: new Date().toISOString(),
  };
  rooms.set(room.id, room);
  res.status(201).json(room);
});

// GET /chat/rooms/:id/messages
router.get('/rooms/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  const room = rooms.get(req.params['id'] as string);
  if (!room || !room.participants.includes(req.user!.id)) return res.status(404).json({ error: 'Room not found' });

  // Mark all as read
  room.messages.forEach(m => {
    if (!m.readBy.includes(req.user!.id)) m.readBy.push(req.user!.id);
  });

  res.json(room.messages);
});

// POST /chat/rooms/:id/messages
router.post('/rooms/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  const room = rooms.get(req.params['id'] as string);
  if (!room || !room.participants.includes(req.user!.id)) return res.status(404).json({ error: 'Room not found' });

  const { content, type = 'text', metadata } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });

  // Get sender name
  const sender = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });

  const message = {
    id: uuid(),
    senderId: req.user!.id,
    senderName: sender?.name || 'Unknown',
    content,
    type,
    metadata,
    timestamp: new Date().toISOString(),
    readBy: [req.user!.id],
  };

  room.messages.push(message);
  res.status(201).json(message);
});

// POST /chat/rooms/:id/share — share a listing or address
router.post('/rooms/:id/share', requireAuth, async (req: AuthRequest, res: Response) => {
  const room = rooms.get(req.params['id'] as string);
  if (!room || !room.participants.includes(req.user!.id)) return res.status(404).json({ error: 'Room not found' });

  const { shareType, payload } = req.body; // shareType: 'listing' | 'address' | 'event'
  const sender = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });

  let content = '';
  if (shareType === 'listing') {
    const listing = await prisma.listing.findUnique({ where: { id: payload.listingId } });
    content = `📍 ${listing?.name} — ${listing?.city}, ${listing?.country}`;
    if (listing?.phone) content += ` | 📞 ${listing?.phone}`;
  } else if (shareType === 'address') {
    content = `📍 ${payload.name}: ${payload.address}, ${payload.city}`;
  } else if (shareType === 'event') {
    content = `🗓️ ${payload.title} — ${payload.date} at ${payload.location}`;
  }

  const message = {
    id: uuid(),
    senderId: req.user!.id,
    senderName: sender?.name || 'Unknown',
    content,
    type: shareType,
    metadata: payload,
    timestamp: new Date().toISOString(),
    readBy: [req.user!.id],
  };

  room.messages.push(message);
  res.status(201).json(message);
});

export default router;
