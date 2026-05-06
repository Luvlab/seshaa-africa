/**
 * analytics.ts — User behaviour event tracking + admin dashboard stats
 *
 * Events tracked:
 *   pageview         — path visited
 *   search           — search query
 *   listing_view     — listing detail opened
 *   click            — notable UI click (CTAs, booking, etc.)
 *   scroll           — scroll depth milestone (25 / 50 / 75 / 100%)
 *   session_start    — new session
 *   session_end      — session duration + pages
 *   keystroke_wpm    — admin portal usage (WPM sampled, no actual content)
 *   admin_action     — admin pressed a button / took an action
 */
import { Router, Response } from 'express';
import prisma from '../db';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ── POST /analytics/event — log a single event (fire-and-forget) ─────────────
router.post('/event', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { eventType, path, target, value, metadata, sessionId, device, country: bodyCountry } = req.body as {
    eventType: string; path?: string; target?: string; value?: string;
    metadata?: unknown; sessionId?: string; device?: string; country?: string;
  };
  if (!eventType) return res.status(400).json({ error: 'eventType required' });

  const userId  = req.user?.id ?? null;
  const country = bodyCountry ?? null;

  // Non-blocking insert
  prisma.$executeRawUnsafe(
    `INSERT INTO "UserEvent" ("userId","sessionId","eventType","path","target","value","metadata","country","device")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    userId, sessionId ?? null, eventType, path ?? null, target ?? null,
    value ?? null, metadata ? JSON.stringify(metadata) : null, country, device ?? null
  ).catch(() => {});

  res.json({ ok: true });
});

// ── POST /analytics/batch — log multiple events at once ──────────────────────
router.post('/batch', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { events } = req.body as {
    events: { eventType: string; path?: string; target?: string; value?: string; metadata?: unknown; sessionId?: string; device?: string; country?: string }[];
  };
  if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'events[] required' });

  const userId = req.user?.id ?? null;

  const values = events.map((_, i) => {
    const base = i * 9;
    return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9})`;
  }).join(',');

  const params = events.flatMap(e => [
    userId, e.sessionId ?? null, e.eventType, e.path ?? null, e.target ?? null,
    e.value ?? null, e.metadata ? JSON.stringify(e.metadata) : null, e.country ?? null, e.device ?? null,
  ]);

  prisma.$executeRawUnsafe(
    `INSERT INTO "UserEvent" ("userId","sessionId","eventType","path","target","value","metadata","country","device") VALUES ${values}`,
    ...params
  ).catch(() => {});

  res.json({ ok: true });
});

// ── GET /analytics/admin — admin dashboard stats ──────────────────────────────
router.get('/admin', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

  const [
    totalEvents, pageviews7d, searches7d, topPages, topSearches,
    deviceBreakdown, countryBreakdown, eventsPerDay, activeHours,
    adminActions, adminTabVisits,
  ] = await Promise.all([
    // Total events
    prisma.$queryRawUnsafe<{ count: string }[]>(`SELECT COUNT(*) as count FROM "UserEvent"`),
    // Pageviews last 7 days
    prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*) as count FROM "UserEvent" WHERE "eventType"='pageview' AND "createdAt" > NOW() - INTERVAL '7 days'`
    ),
    // Searches last 7 days
    prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*) as count FROM "UserEvent" WHERE "eventType"='search' AND "createdAt" > NOW() - INTERVAL '7 days'`
    ),
    // Top pages
    prisma.$queryRawUnsafe<{ path: string; count: string }[]>(
      `SELECT path, COUNT(*) as count FROM "UserEvent" WHERE "eventType"='pageview' AND path IS NOT NULL AND "createdAt" > NOW() - INTERVAL '30 days'
       GROUP BY path ORDER BY count DESC LIMIT 10`
    ),
    // Top searches
    prisma.$queryRawUnsafe<{ value: string; count: string }[]>(
      `SELECT value, COUNT(*) as count FROM "UserEvent" WHERE "eventType"='search' AND value IS NOT NULL AND "createdAt" > NOW() - INTERVAL '30 days'
       GROUP BY value ORDER BY count DESC LIMIT 10`
    ),
    // Device breakdown
    prisma.$queryRawUnsafe<{ device: string; count: string }[]>(
      `SELECT device, COUNT(*) as count FROM "UserEvent" WHERE "createdAt" > NOW() - INTERVAL '30 days'
       GROUP BY device ORDER BY count DESC`
    ),
    // Country breakdown
    prisma.$queryRawUnsafe<{ country: string; count: string }[]>(
      `SELECT country, COUNT(*) as count FROM "UserEvent" WHERE country IS NOT NULL AND "createdAt" > NOW() - INTERVAL '30 days'
       GROUP BY country ORDER BY count DESC LIMIT 15`
    ),
    // Daily event counts (last 30 days)
    prisma.$queryRawUnsafe<{ day: string; count: string }[]>(
      `SELECT DATE("createdAt") as day, COUNT(*) as count FROM "UserEvent"
       WHERE "createdAt" > NOW() - INTERVAL '30 days'
       GROUP BY day ORDER BY day ASC`
    ),
    // Active hours of day (UTC)
    prisma.$queryRawUnsafe<{ hour: number; count: string }[]>(
      `SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*) as count FROM "UserEvent"
       WHERE "createdAt" > NOW() - INTERVAL '7 days'
       GROUP BY hour ORDER BY hour ASC`
    ),
    // Admin actions (last 30d)
    prisma.$queryRawUnsafe<{ target: string; count: string }[]>(
      `SELECT target, COUNT(*) as count FROM "UserEvent"
       WHERE "eventType"='admin_action' AND target IS NOT NULL AND "createdAt" > NOW() - INTERVAL '30 days'
       GROUP BY target ORDER BY count DESC LIMIT 20`
    ),
    // Admin tab visits (last 30d) — tab:xxx targets
    prisma.$queryRawUnsafe<{ target: string; count: string }[]>(
      `SELECT target, COUNT(*) as count FROM "UserEvent"
       WHERE "eventType"='admin_action' AND target LIKE 'tab:%' AND "createdAt" > NOW() - INTERVAL '30 days'
       GROUP BY target ORDER BY count DESC`
    ),
  ]);

  res.json({
    totals: {
      allTime: parseInt((totalEvents[0]?.count) ?? '0'),
      pageviews7d: parseInt((pageviews7d[0]?.count) ?? '0'),
      searches7d: parseInt((searches7d[0]?.count) ?? '0'),
    },
    topPages,
    topSearches,
    deviceBreakdown,
    countryBreakdown,
    eventsPerDay,
    activeHours,
    adminActions,
    adminTabVisits,
  });
});

// ── GET /analytics/admin/sessions — session duration + WPM data ───────────────
router.get('/admin/sessions', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

  const sessions = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT e."userId", u.name, e."sessionId",
            MIN(e."createdAt") as "startedAt",
            MAX(e."createdAt") as "endedAt",
            COUNT(*) as "eventCount",
            EXTRACT(EPOCH FROM (MAX(e."createdAt") - MIN(e."createdAt"))) as "durationSeconds"
     FROM "UserEvent" e
     LEFT JOIN "User" u ON u.id = e."userId"
     WHERE e."sessionId" IS NOT NULL AND e."createdAt" > NOW() - INTERVAL '7 days'
     GROUP BY e."userId", u.name, e."sessionId"
     ORDER BY MAX(e."createdAt") DESC
     LIMIT 100`
  );

  const keystrokeSessions = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT e."userId", u.name, e.value as "wpm", e."createdAt"
     FROM "UserEvent" e LEFT JOIN "User" u ON u.id = e."userId"
     WHERE e."eventType" = 'keystroke_wpm' AND e."createdAt" > NOW() - INTERVAL '7 days'
     ORDER BY e."createdAt" DESC LIMIT 100`
  );

  res.json({ sessions, keystrokeSessions });
});

// ── GET /analytics/admin/prognosis — simple linear trend forecasting ──────────
router.get('/admin/prognosis', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

  // Get last 30 days of daily event counts
  const daily = await prisma.$queryRawUnsafe<{ day: string; count: string }[]>(
    `SELECT DATE("createdAt") as day, COUNT(*) as count FROM "UserEvent"
     WHERE "createdAt" > NOW() - INTERVAL '30 days'
     GROUP BY day ORDER BY day ASC`
  );

  const counts = daily.map(d => parseInt(d.count));
  const n = counts.length;

  // Simple linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  counts.forEach((y, i) => {
    sumX += i; sumY += y; sumXY += i * y; sumX2 += i * i;
  });
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
  const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;

  // Forecast next 14 days
  const forecast = Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    predicted: Math.max(0, Math.round(intercept + slope * (n + i))),
  }));

  const trend = slope > 0.5 ? 'growing' : slope < -0.5 ? 'declining' : 'stable';

  res.json({ daily, forecast, trend, slope: Math.round(slope * 100) / 100 });
});

export default router;
