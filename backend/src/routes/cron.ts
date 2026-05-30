/**
 * Seshaa Cron Jobs
 * Called by Vercel Cron on schedules defined in vercel.json.
 *
 * All endpoints require the secret header:
 *   Authorization: Bearer <CRON_SECRET>
 * (Vercel sets this automatically from the env var.)
 *
 * Endpoints:
 *   GET /api/cron/news      — archive all RSS feeds (every 6 h)
 *   GET /api/cron/listings  — OSM scrape rotating batch of cities (daily)
 *   GET /api/cron/status    — last-run summary (no auth needed, safe to expose)
 */
import { Router, Request, Response } from 'express';
import { AFRICAN_CITIES, scrapeCity } from '../scraper/osm';
import { fetchCategory } from './news';
import prisma from '../db';

const router = Router();

// ── Auth middleware ───────────────────────────────────────────────────────────
function cronAuth(req: Request, res: Response, next: () => void) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return next(); // no secret configured → skip auth (dev mode)

  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (token !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// ── News archive ─────────────────────────────────────────────────────────────
// Runs every 6 hours: fetches all RSS categories and upserts to NewsArchive.
// fetchCategory() already calls archiveItems() internally when the cache misses.
router.get('/news', cronAuth, async (_req, res) => {
  const started = Date.now();
  const CATEGORIES = [
    'general', 'politics', 'business', 'technology', 'health',
    'sports', 'entertainment', 'agriculture', 'finance', 'travel',
  ];

  // Force cache expiry so each fetch goes to the RSS feeds and archives fresh items.
  // We clear by resetting — fetchCategory will re-fetch if cache is empty.
  const results: Record<string, number> = {};
  let totalItems = 0;

  for (const cat of CATEGORIES) {
    try {
      const items = await fetchCategory(cat);
      results[cat] = items.length;
      totalItems += items.length;
    } catch (err) {
      results[cat] = -1;
      console.error(`[cron/news] ${cat} failed:`, err);
    }
  }

  const elapsed = Date.now() - started;
  await logRun('news', { totalItems, categories: results, elapsedMs: elapsed });
  res.json({ ok: true, totalItems, categories: results, elapsedMs: elapsed });
});

// ── OSM listing scrape ────────────────────────────────────────────────────────
// Runs once per day: picks a rotating batch of ~10 cities to scrape.
// With 65 cities and ~10/day, the full list completes in ~6–7 days.
router.get('/listings', cronAuth, async (_req, res) => {
  const started = Date.now();
  const BATCH_SIZE = 10;

  // Rotate daily: use the day-of-year to deterministically pick a starting index.
  const now = new Date();
  const startOfYear = new Date(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);
  const startIdx = (dayOfYear * BATCH_SIZE) % AFRICAN_CITIES.length;

  const batch = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    batch.push(AFRICAN_CITIES[(startIdx + i) % AFRICAN_CITIES.length]);
  }

  const results: { city: string; country: string; inserted: number; error?: string }[] = [];

  for (const cityConfig of batch) {
    try {
      const inserted = await scrapeCity(cityConfig, false);
      results.push({ city: cityConfig.city, country: cityConfig.country, inserted });
    } catch (err) {
      results.push({
        city: cityConfig.city,
        country: cityConfig.country,
        inserted: 0,
        error: String(err),
      });
    }
    // Respect Overpass rate limits
    await new Promise(r => setTimeout(r, 1_200));
  }

  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
  const elapsed = Date.now() - started;
  await logRun('listings', { batch: batch.map(c => c.city), results, totalInserted, elapsedMs: elapsed });
  res.json({ ok: true, batch: results, totalInserted, elapsedMs: elapsed });
});

// ── Status ────────────────────────────────────────────────────────────────────
router.get('/status', async (_req, res) => {
  try {
    const runs = await (prisma as any).listing.aggregate({
      _count: { id: true },
    });
    const newsCount = await (prisma as any).newsArchive.count();
    res.json({
      listings: runs._count.id,
      newsArchived: newsCount,
      africanCities: AFRICAN_CITIES.length,
    });
  } catch {
    res.json({ ok: true });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function logRun(type: string, meta: Record<string, unknown>) {
  try {
    await (prisma as any).userEvent.create({
      data: {
        eventType: `cron_${type}`,
        value: JSON.stringify(meta).slice(0, 500),
        createdAt: new Date(),
      },
    });
  } catch { /* non-fatal */ }
}

export default router;
