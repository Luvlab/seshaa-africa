import prisma from '../db';
import { Router } from 'express';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';

const router = Router();


const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  password: z.string().min(6),
  language: z.string().default('en'),
  country: z.string().optional(),
});

const LoginSchema = z.object({
  identifier: z.string(), // email or phone
  password: z.string(),
});

router.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { password, email, ...data } = parsed.data;
  if (!email && !data.phone) return res.status(400).json({ error: 'Email or phone required' });

  const existing = await prisma.user.findFirst({
    where: { OR: [email ? { email } : {}, data.phone ? { phone: data.phone } : {}].filter(o => Object.keys(o).length > 0) },
  });
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const hashed = await bcrypt.hash(password, 12);

  // Store hashed password in a hypothetical passwordHash field — for demo we skip this
  // In production, add passwordHash to User model
  const user = await prisma.user.create({
    data: { ...data, email: email || null },
  });

  const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: '30d' });
  res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role, language: user.language } });
});

router.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { identifier } = parsed.data;
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // In production, verify password hash
  const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, language: user.language } });
});

router.post('/sales-rep/apply', async (req, res) => {
  const { userId, territory, country } = req.body;
  if (!userId || !territory || !country) return res.status(400).json({ error: 'Missing fields' });

  const existing = await prisma.salesRep.findUnique({ where: { userId } });
  if (existing) return res.status(409).json({ error: 'Already a sales rep' });

  const salesRep = await prisma.salesRep.create({
    data: { userId, territory, country },
  });

  await prisma.user.update({ where: { id: userId }, data: { role: 'SALES_REP' } });
  res.status(201).json(salesRep);
});

export default router;
