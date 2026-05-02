import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../db';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; role: string };
    req.user = decoded;
    // Fire-and-forget: update lastSeen (max once per minute to avoid write spam)
    prisma.user.updateMany({
      where: {
        id: decoded.id,
        OR: [
          { lastSeen: null },
          { lastSeen: { lt: new Date(Date.now() - 60_000) } },
        ],
      },
      data: { lastSeen: new Date() },
    }).catch(() => {});
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret) as { id: string; role: string };
    } catch {}
  }
  next();
}
