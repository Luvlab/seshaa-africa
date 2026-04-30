import prisma from '../db';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeToken(user: { id: string; role: string }) {
  return jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: '30d' });
}

function safeUser(u: { id: string; name: string; role: string; language: string; email?: string | null; avatarUrl?: string | null }) {
  return { id: u.id, name: u.name, role: u.role, language: u.language, email: u.email, avatarUrl: u.avatarUrl };
}

// ── Schemas ──────────────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email().optional().or(z.literal('')),
  phone:    z.string().optional(),
  password: z.string().min(6),
  language: z.string().default('en'),
  country:  z.string().optional(),
});

const LoginSchema = z.object({
  identifier: z.string(),  // email or phone
  password:   z.string(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword:     z.string().min(6),
});

// ── Register ─────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { password, email, ...data } = parsed.data;
  if (!email && !data.phone) return res.status(400).json({ error: 'Email or phone required' });

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        data.phone ? { phone: data.phone } : undefined,
      ].filter(Boolean) as object[],
    },
  });
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { ...data, email: email || null, passwordHash },
  });

  const token = makeToken(user);
  res.status(201).json({ token, user: safeUser(user) });
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { identifier, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Verify password if hash exists; allow no-password legacy rows
  if (user.passwordHash) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = makeToken(user);
  res.json({ token, user: safeUser(user) });
});

// ── Change password (authenticated) ──────────────────────────────────────────
router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.passwordHash) {
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password incorrect' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ success: true });
});

// ── Admin: set any user's password ───────────────────────────────────────────
router.post('/admin/set-password', requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  const { userId, newPassword } = req.body as { userId: string; newPassword: string };
  if (!userId || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'userId and newPassword (min 6 chars) required' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  res.json({ success: true });
});

// ── Google OAuth ──────────────────────────────────────────────────────────────
// Flow: frontend hits Google → gets idToken → POST /auth/google { idToken }
// Backend verifies with Google, upserts user, returns JWT.
// Requires GOOGLE_CLIENT_ID in env; install: npm i google-auth-library
router.post('/google', async (req, res) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(501).json({ error: 'Google OAuth not configured (GOOGLE_CLIENT_ID missing)' });

  try {
    // Dynamic import so server starts even without the package installed
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub) return res.status(401).json({ error: 'Invalid Google token' });

    const { sub: googleId, email, name, picture } = payload;

    const user = await prisma.user.upsert({
      where: { googleId },
      update: { email: email ?? undefined, avatarUrl: picture ?? undefined, updatedAt: new Date() },
      create: {
        googleId,
        email:     email   ?? null,
        name:      name    ?? email?.split('@')[0] ?? 'Google User',
        avatarUrl: picture ?? null,
      },
    });

    const token = makeToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Google OAuth error', err);
    res.status(401).json({ error: 'Google token verification failed' });
  }
});

// ── Sales-rep apply ───────────────────────────────────────────────────────────
router.post('/sales-rep/apply', async (req, res) => {
  const { userId, territory, country } = req.body as { userId: string; territory: string; country: string };
  if (!userId || !territory || !country) return res.status(400).json({ error: 'Missing fields' });

  const existing = await prisma.salesRep.findUnique({ where: { userId } });
  if (existing) return res.status(409).json({ error: 'Already a sales rep' });

  const salesRep = await prisma.salesRep.create({ data: { userId, territory, country } });
  await prisma.user.update({ where: { id: userId }, data: { role: 'SALES_REP' } });
  res.status(201).json(salesRep);
});

export default router;
