import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { scrapeCity, AFRICAN_CITIES } from '../scraper/osm';
import { scrapeBlackOwned, DIASPORA_CITIES } from '../scraper/blackowned';

const router = Router();

function adminOnly(req: AuthRequest, res: Response, next: () => void) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  next();
}

// GET /admin/stats
router.get('/stats', requireAuth, adminOnly, async (_req, res) => {
  const [listings, users, ads, salesReps, pendingListings] = await Promise.all([
    prisma.listing.count({ where: { active: true } }),
    prisma.user.count(),
    prisma.ad.count({ where: { active: true } }),
    prisma.salesRep.count({ where: { active: true } }),
    prisma.listing.count({ where: { verified: false, active: true } }),
  ]);

  const countryCounts = await prisma.listing.groupBy({
    by: ['country'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const categoryCounts = await prisma.listing.groupBy({
    by: ['category'],
    _count: { id: true },
    where: { category: { not: null } },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  res.json({
    stats: { listings, users, ads, salesReps, pendingListings },
    topCountries: countryCounts.map(c => ({ country: c.country, count: c._count.id })),
    topCategories: categoryCounts.map(c => ({ category: c.category, count: c._count.id })),
  });
});

// GET /admin/user-analytics — growth and demographics
router.get('/user-analytics', requireAuth, adminOnly, async (_req, res) => {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const ninetyDays = new Date(now.getTime() - 90 * 24 * 60 * 60_000);

  const [totalUsers, newLast30, newLast90, byRole, byCountry, recentSignups] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDays } } }),
    prisma.user.count({ where: { createdAt: { gte: ninetyDays } } }),
    prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    prisma.user.groupBy({
      by: ['country'],
      _count: { id: true },
      where: { country: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 30,
    }),
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
      FROM "User"
      WHERE "createdAt" >= ${thirtyDays}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `,
  ]);

  res.json({
    live: { onlineNow: 0, activeHour: 0, activeDay: 0 }, // re-enable after lastSeen column is added
    totals: { totalUsers, newLast30, newLast90 },
    byRole: byRole.map(r => ({ role: r.role, count: Number(r._count.id) })),
    byCountry: byCountry.map(c => ({ country: c.country, count: Number(c._count.id) })),
    dailySignups: recentSignups.map(r => ({
      day: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    })),
    peakHours: [],
  });
});

// GET /admin/listings?status=pending
router.get('/listings', requireAuth, adminOnly, async (req, res) => {
  const { status = 'pending', page = '1' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * 30;

  const where = status === 'pending'
    ? { verified: false, active: true }
    : status === 'all'
    ? {}
    : { active: true };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({ where, skip, take: 30, orderBy: { createdAt: 'desc' }, include: { tags: true } }),
    prisma.listing.count({ where }),
  ]);

  res.json({ listings, total, pages: Math.ceil(total / 30) });
});

// POST /admin/listings/:id/verify
router.post('/listings/:id/verify', requireAuth, adminOnly, async (req, res) => {
  const listing = await prisma.listing.update({
    where: { id: req.params.id as string },
    data: { verified: true },
  });
  res.json(listing);
});

// POST /admin/listings/:id/reject
router.post('/listings/:id/reject', requireAuth, adminOnly, async (req, res) => {
  await prisma.listing.update({ where: { id: req.params.id as string }, data: { active: false } });
  res.json({ success: true });
});

// PATCH /admin/listings/:id — edit listing fields before or after verification
router.patch('/listings/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, phone, phone2, email, address, city, country, region,
      category, subcategory, description, website, whatsapp,
      logoUrl, openingHours, verified, active,
    } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined)         data.name = name;
    if (phone !== undefined)        data.phone = phone;
    if (phone2 !== undefined)       data.phone2 = phone2;
    if (email !== undefined)        data.email = email;
    if (address !== undefined)      data.address = address;
    if (city !== undefined)         data.city = city;
    if (country !== undefined)      data.country = country;
    if (region !== undefined)       data.region = region;
    if (category !== undefined)     data.category = category;
    if (subcategory !== undefined)  data.subcategory = subcategory;
    if (description !== undefined)  data.description = description;
    if (website !== undefined)      data.website = website;
    if (whatsapp !== undefined)     data.whatsapp = whatsapp;
    if (logoUrl !== undefined)      data.logoUrl = logoUrl;
    if (openingHours !== undefined) data.openingHours = openingHours;
    if (verified !== undefined)     data.verified = verified;
    if (active !== undefined)       data.active = active;

    const listing = await prisma.listing.update({ where: { id }, data });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: 'Update failed', detail: String(err) });
  }
});

// GET /admin/users
router.get('/users', requireAuth, adminOnly, async (req, res) => {
  const { page = '1', q } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * 50;
  const where = q ? { OR: [
    { name: { contains: q, mode: 'insensitive' as const } },
    { email: { contains: q, mode: 'insensitive' as const } },
  ]} : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: 50, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  res.json({ users: users.map(u => ({ ...u })), total });
});

// POST /admin/commissions/pay — mark commissions paid
router.post('/commissions/pay', requireAuth, adminOnly, async (req, res) => {
  const { salesRepId } = req.body;
  const result = await prisma.commission.updateMany({
    where: { salesRepId, paid: false },
    data: { paid: true, paidAt: new Date() },
  });

  // Update totalEarned on salesRep
  const sum = await prisma.commission.aggregate({
    where: { salesRepId },
    _sum: { amount: true },
  });

  await prisma.salesRep.update({
    where: { id: salesRepId },
    data: { totalEarned: sum._sum.amount || 0 },
  });

  res.json({ updated: result.count });
});

// GET /admin/scraper/status — last scrape stats
router.get('/scraper/status', requireAuth, adminOnly, async (_req, res) => {
  const total = await prisma.listing.count({ where: { osmId: { not: null } } });
  const byCountry = await prisma.listing.groupBy({
    by: ['country'],
    where: { osmId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  res.json({
    scrapedTotal: total,
    byCountry: byCountry.map(r => ({ country: r.country, count: r._count.id })),
  });
});

// GET /admin/financials — full financial dashboard (revenue, costs, loan fund)
router.get('/financials', requireAuth, adminOnly, async (_req, res) => {
  const [
    totalRevenue,
    activeProSubs,
    monthlyRevenue,
    annualRevenue,
    commissionsPaid,
    commissionsPending,
    ambassadorPayouts,
    loanStats,
    adRevenue,
  ] = await Promise.all([
    prisma.proSubscription.aggregate({ _sum: { price: true }, where: { active: true } }),
    prisma.proSubscription.count({ where: { active: true } }),
    prisma.proSubscription.aggregate({ _sum: { price: true }, where: { active: true, plan: 'MONTHLY' } }),
    prisma.proSubscription.aggregate({ _sum: { price: true }, where: { active: true, plan: 'ANNUAL' } }),
    prisma.commission.aggregate({ _sum: { amount: true }, where: { paid: true } }),
    prisma.commission.aggregate({ _sum: { amount: true }, where: { paid: false } }),
    prisma.ambassadorPayout.aggregate({ _sum: { amount: true }, where: { paid: true } }),
    prisma.microLoan.aggregate({ _sum: { approvedAmount: true, amount: true }, _count: true }),
    prisma.ad.aggregate({ _sum: { spent: true }, where: { active: true } }),
  ]);

  const totalProRevenue = totalRevenue._sum.price || 0;
  const loanFund = totalProRevenue * 0.05; // 5% of Pro revenue → loan fund
  const disbursedLoans = await prisma.microLoan.aggregate({
    _sum: { approvedAmount: true },
    where: { status: { in: ['DISBURSED', 'REPAID'] } },
  });
  const repaidLoans = await prisma.microLoan.aggregate({
    _sum: { approvedAmount: true },
    where: { status: 'REPAID' },
  });

  const mrr = (monthlyRevenue._sum.price || 0) + ((annualRevenue._sum.price || 0) / 12);

  res.json({
    revenue: {
      totalProSubscriptions: totalProRevenue,
      activeSubscriptions: activeProSubs,
      monthlyRecurringRevenue: Math.round(mrr * 100) / 100,
      adRevenue: adRevenue._sum.spent || 0,
    },
    costs: {
      salesCommissionsPaid: commissionsPaid._sum.amount || 0,
      salesCommissionsPending: commissionsPending._sum.amount || 0,
      ambassadorPayoutsPaid: ambassadorPayouts._sum.amount || 0,
      estimatedInfraNote: 'Neon DB + Vercel hosting + Claude API — check provider dashboards for live costs',
    },
    loanFund: {
      totalAllocated: Math.round(loanFund * 100) / 100,
      totalDisbursed: disbursedLoans._sum.approvedAmount || 0,
      totalRepaid: repaidLoans._sum.approvedAmount || 0,
      available: Math.round((loanFund - (disbursedLoans._sum.approvedAmount || 0) + (repaidLoans._sum.approvedAmount || 0)) * 100) / 100,
      totalApplications: loanStats._count,
    },
    net: {
      estimated: Math.round((totalProRevenue - (commissionsPaid._sum.amount || 0) - (ambassadorPayouts._sum.amount || 0) - loanFund) * 100) / 100,
    },
  });
});

// POST /admin/ambassador-payouts/approve/:id
router.post('/ambassador-payouts/approve/:id', requireAuth, adminOnly, async (req, res) => {
  const payout = await prisma.ambassadorPayout.update({
    where: { id: req.params.id as string },
    data: { paid: true, paidAt: new Date() },
  });
  res.json(payout);
});

// GET /admin/ambassador-payouts — pending payouts
router.get('/ambassador-payouts', requireAuth, adminOnly, async (_req, res) => {
  const payouts = await prisma.ambassadorPayout.findMany({
    where: { paid: false },
    include: { ambassador: { include: { user: { select: { name: true, phone: true, country: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(payouts);
});

// GET /admin/scrape/counts — how many OSM listings exist per city
router.get('/scrape/counts', requireAuth, adminOnly, async (_req, res) => {
  const rows = await prisma.listing.groupBy({
    by: ['city', 'country'],
    where: { osmId: { not: null }, active: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 100,
  });
  const total = await prisma.listing.count({ where: { osmId: { not: null } } });
  res.json({ counts: rows.map(r => ({ city: r.city, country: r.country, count: r._count.id })), total });
});

// POST /admin/scrape — trigger one-city OSM scrape (runs within 55-second timeout)
router.post('/scrape', requireAuth, adminOnly, async (req: AuthRequest, res) => {
  const { city, country } = req.body as { city: string; country: string };
  const cityConfig = AFRICAN_CITIES.find(c => c.city === city && c.country === country);
  if (!cityConfig) return res.status(404).json({ error: 'City not in cities list' });

  try {
    const inserted = await scrapeCity(cityConfig);
    res.json({ ok: true, city, country, inserted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// POST /admin/scrape/all — kick off background scrape of ALL African cities.
// Returns immediately; progress tracked in DB (osmId count).
// Skips cities that already have ≥ 200 OSM listings (recently scraped).
router.post('/scrape/all', requireAuth, adminOnly, async (_req: AuthRequest, res) => {
  // Respond immediately — scraping runs in the background
  res.json({ ok: true, message: 'Full Africa scrape started in background', cities: AFRICAN_CITIES.length });

  void (async () => {
    try {
      // Find which cities are already well-covered to skip them
      const covered = await prisma.listing.groupBy({
        by: ['city', 'country'],
        where: { osmId: { not: null } },
        _count: { id: true },
        having: { id: { _count: { gte: 200 } } },
      });
      const coveredSet = new Set(covered.map(r => `${r.city}|${r.country}`));

      let total = 0;
      for (const cityConfig of AFRICAN_CITIES) {
        const key = `${cityConfig.city}|${cityConfig.country}`;
        if (coveredSet.has(key)) {
          console.log(`⏭  Skip ${cityConfig.city} (already has ≥200 OSM listings)`);
          continue;
        }
        try {
          const n = await scrapeCity(cityConfig);
          total += n;
        } catch (e) {
          console.error(`  ✗ ${cityConfig.city}: ${e}`);
        }
        // Rate-limit: 2 s between cities to respect Overpass fair-use
        await new Promise(r => setTimeout(r, 2000));
      }
      console.log(`\n✅ Full Africa scrape done. Total inserted: ${total}`);
    } catch (e) {
      console.error('Background scrape error:', e);
    }
  })();
});

// POST /admin/scrape/enrich — for listings with a website but no description,
// try to extract a short description + price hints from their website.
// Background job — returns immediately.
router.post('/scrape/enrich', requireAuth, adminOnly, async (_req: AuthRequest, res) => {
  res.json({ ok: true, message: 'Enrichment job started in background' });

  void (async () => {
    try {
      // Find up to 200 listings that have a website but missing description
      const targets = await prisma.listing.findMany({
        where: {
          website: { not: null },
          description: null,
          active: true,
        },
        select: { id: true, website: true, name: true, category: true },
        take: 200,
      });

      console.log(`\n🔍 Enriching ${targets.length} listings...`);
      let enriched = 0;

      for (const listing of targets) {
        try {
          const url = listing.website!;
          const html = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: { 'User-Agent': 'Seshaa-Directory-Bot/1.0 (https://seshaa.africa; info@luvlab.io)' },
          }).then(r => r.ok ? r.text() : null).catch(() => null);

          if (!html) continue;

          // Strip tags, get first meaningful 500 chars of text
          const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .slice(0, 1000);

          // Find price patterns like $5, KES 500, NGN 2000, etc.
          const priceMatches = text.match(/(?:USD|KES|NGN|GHS|ZAR|UGX|ETB|TZS|XOF|XAF|\$|£|€|₦|₵)\s*[\d,]+(?:\.\d{1,2})?/gi) || [];

          const description = text.slice(0, 400).replace(/\s+/g, ' ').trim() || null;

          if (description) {
            await prisma.listing.update({
              where: { id: listing.id },
              data: { description },
            });
            enriched++;
          }

          // Store found prices in PriceEntry
          for (const priceStr of priceMatches.slice(0, 5)) {
            const numMatch = priceStr.match(/[\d,]+(?:\.\d{1,2})?/);
            if (!numMatch) continue;
            const price = parseFloat(numMatch[0].replace(',', ''));
            if (!price || price > 1_000_000) continue;

            const currMatch = priceStr.match(/USD|KES|NGN|GHS|ZAR|UGX|ETB|TZS|XOF|XAF/i);
            const currency = currMatch ? currMatch[0].toUpperCase() : 'USD';

            await prisma.priceEntry.upsert({
              where: {
                listingId_item: {
                  listingId: listing.id,
                  item: 'Website price',
                },
              },
              update: { price, currency },
              create: {
                listingId: listing.id,
                item: 'Website price',
                price,
                currency,
                category: listing.category || 'other',
              },
            }).catch(() => {});
          }
        } catch { /* skip this listing */ }

        // Small delay to be polite
        await new Promise(r => setTimeout(r, 500));
      }

      console.log(`✅ Enriched ${enriched}/${targets.length} listings`);
    } catch (e) {
      console.error('Enrichment error:', e);
    }
  })();
});

// ─── Black-Owned Business Scraper ────────────────────────────────────────────

// GET /admin/scrape/blackowned/cities — list of diaspora cities we can scrape
router.get('/scrape/blackowned/cities', requireAuth, adminOnly, (_req, res) => {
  const summary = DIASPORA_CITIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.region] = (acc[c.region] || 0) + 1;
    return acc;
  }, {});
  res.json({ cities: DIASPORA_CITIES.length, byRegion: summary, yelpKeyConfigured: !!process.env.YELP_API_KEY });
});

// POST /admin/scrape/blackowned — background scrape, returns immediately
// Body: { source?: 'yelp'|'html'|'all', region?: 'us'|'uk'|'ca'|'au'|'eu'|'caribbean'|'brazil'|'asia'|'all', dryRun?: boolean }
router.post('/scrape/blackowned', requireAuth, adminOnly, async (req, res) => {
  const { source = 'all', region = 'all', dryRun = false } = req.body as {
    source?: string; region?: string; dryRun?: boolean;
  };

  res.json({ ok: true, message: `Black-owned scraper started (source=${source} region=${region} dryRun=${dryRun})` });

  void (async () => {
    try {
      await scrapeBlackOwned({
        source: source as Parameters<typeof scrapeBlackOwned>[0]['source'],
        region:  region  as Parameters<typeof scrapeBlackOwned>[0]['region'],
        dryRun,
        onProgress: (msg) => console.log(msg),
      });
    } catch (e) {
      console.error('Black-owned scraper error:', e);
    }
  })();
});

// ─── Sales Rep Management ─────────────────────────────────────────────────────

// GET /admin/salesreps — list all reps (pending + active)
router.get('/salesreps', requireAuth, adminOnly, async (_req, res) => {
  const reps = await prisma.salesRep.findMany({
    include: {
      user: { select: { id: true, name: true, phone: true, country: true, email: true } },
      commissions: { select: { amount: true, paid: true } },
      _count: { select: { ads: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(reps.map(r => ({
    id: r.id,
    name: r.user.name,
    phone: r.user.phone,
    email: r.user.email,
    country: r.user.country || r.country,
    territory: r.territory,
    active: r.active,
    totalEarned: r.totalEarned,
    commissionRate: r.commissionRate,
    adsCount: r._count.ads,
    createdAt: r.createdAt,
    unpaidCommissions: r.commissions.filter((c: { paid: boolean }) => !c.paid).reduce((s: number, c: { amount: number }) => s + c.amount, 0),
  })));
});

// POST /admin/salesreps/:id/approve — approve application
router.post('/salesreps/:id/approve', requireAuth, adminOnly, async (req, res) => {
  const id = req.params.id as string;
  const rep = await prisma.salesRep.update({
    where: { id },
    data: { active: true },
  });
  await prisma.user.update({ where: { id: rep.userId }, data: { role: 'SALES_REP' } });
  res.json({ ok: true });
});

// DELETE /admin/salesreps/:id — reject/remove
router.delete('/salesreps/:id', requireAuth, adminOnly, async (req, res) => {
  const id = req.params.id as string;
  const rep = await prisma.salesRep.findUnique({ where: { id } });
  if (rep && !rep.active) {
    // Only reset role if they were pending (never activated)
    await prisma.user.update({ where: { id: rep.userId }, data: { role: 'USER' } });
  }
  await prisma.salesRep.delete({ where: { id } });
  res.json({ ok: true });
});

// ─── Hero CMS (legacy single-slot) ───────────────────────────────────────────

// GET /admin/hero — get the current homepage hero config (legacy)
router.get('/hero', requireAuth, adminOnly, async (_req, res) => {
  const record = await prisma.listing.findFirst({ where: { osmId: 'seshaa-hero-config' } });
  res.json(record || null);
});

// POST /admin/hero — save / update the homepage hero config (legacy single slot)
router.post('/hero', requireAuth, adminOnly, async (req: AuthRequest, res) => {
  try {
    const record = await prisma.listing.upsert({
      where: { osmId: 'seshaa-hero-config' },
      update: {
        name: 'Hero Ad Config',
        description: JSON.stringify(req.body),
        active: true,
        verified: true,
      },
      create: {
        name: 'Hero Ad Config',
        description: JSON.stringify(req.body),
        osmId: 'seshaa-hero-config',
        country: 'ZZ',
        city: 'Global',
        type: 'BUSINESS',
        active: true,
        verified: true,
      },
    });
    res.json(record);
  } catch (err) {
    console.error('Hero save error:', err);
    res.status(500).json({ error: 'Failed to save hero config', detail: String(err) });
  }
});

// ─── YouTube metadata fetch (oEmbed, no API key needed) ───────────────────────
// GET /admin/youtube-meta?url=VIDEO_URL_OR_ID
router.get('/youtube-meta', requireAuth, adminOnly, async (req, res) => {
  const raw = (req.query.url as string || '').trim();
  if (!raw) return res.status(400).json({ error: 'url param required' });

  // Extract bare video ID from any YouTube URL format
  function extractId(s: string): string {
    const m =
      s.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
      s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
      s.match(/embed\/([A-Za-z0-9_-]{11})/) ||
      s.match(/shorts\/([A-Za-z0-9_-]{11})/) ||
      s.match(/live\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    return '';
  }

  const videoId = extractId(raw);
  if (!videoId) return res.status(400).json({ error: 'Could not extract YouTube video ID' });

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const r = await fetch(oembedUrl, { headers: { 'User-Agent': 'Seshaa/1.0' } });
    if (!r.ok) return res.status(502).json({ error: `YouTube oEmbed returned ${r.status}` });
    const data = await r.json() as {
      title?: string; author_name?: string; thumbnail_url?: string;
      width?: number; height?: number;
    };

    // Prefer maxresdefault, fall back to hqdefault
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

    res.json({
      videoId,
      title:     data.title      || '',
      author:    data.author_name || '',
      thumbnail: data.thumbnail_url ? thumbnail : (data.thumbnail_url || ''),
      embedUrl:  `https://www.youtube.com/embed/${videoId}`,
    });
  } catch (err) {
    console.error('YouTube meta fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch YouTube metadata', detail: String(err) });
  }
});

// ─── Hero Slides (slideshow ad campaign manager) ──────────────────────────────

// GET /admin/hero-slides — all hero slides (incl. inactive)
router.get('/hero-slides', requireAuth, adminOnly, async (_req, res) => {
  const slides = await prisma.ad.findMany({
    where: { packageId: 'hero-slide' },
    orderBy: { createdAt: 'asc' },
  });
  res.json(slides.map(s => {
    let extra: Record<string, unknown> = {};
    try { extra = JSON.parse(s.description || '{}'); } catch { /* ok */ }
    return { ...s, ...extra };
  }));
});

// POST /admin/hero-slides — create a new hero slide
router.post('/hero-slides', requireAuth, adminOnly, async (req: AuthRequest, res) => {
  try {
    const {
      mediaType = 'youtube', mediaUrl = '', youtubeId = '',
      startTime = 0, endTime = 0,
      overlayTitle = '', overlaySubtitle = '', ctaText = 'Learn More',
      ctaUrl, targetUrl, advertiser = '',
      clientEmail = '', clientPhone = '', clientCountry = '',
      paymentStatus = 'unpaid', paymentAmount = 0, invoiceRef = '',
      notes = '', active = true,
    } = req.body;

    const resolvedCtaUrl = ctaUrl || targetUrl || '/advertise';
    const extra = JSON.stringify({ mediaType, mediaUrl, youtubeId, startTime: Number(startTime) || 0, endTime: Number(endTime) || 0, overlayTitle, overlaySubtitle, ctaText, ctaUrl: resolvedCtaUrl, clientEmail, clientPhone, clientCountry, paymentStatus, paymentAmount, invoiceRef, notes });

    const slide = await prisma.ad.create({
      data: {
        title: overlayTitle || advertiser || 'Hero Slide',
        description: extra,
        imageUrl: mediaUrl || youtubeId || null,
        targetUrl: resolvedCtaUrl,
        advertiser: advertiser || 'Seshaa',
        contactPhone: clientPhone || null,
        packageId: 'hero-slide',
        tier: 'PREMIUM',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        budget: Number(paymentAmount) || 0,
        active: Boolean(active),
        // required non-nullable arrays — must be explicit
        countries: [],
        targetKeywords: [],
        targetInterests: [],
      },
    });
    const extra2 = JSON.parse(slide.description || '{}');
    res.json({ ...slide, ...extra2 });
  } catch (err) {
    console.error('Hero slide create error:', err);
    res.status(500).json({ error: 'Failed to create hero slide', detail: String(err) });
  }
});

// PUT /admin/hero-slides/:id — update a hero slide
router.put('/hero-slides/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const id = req.params.id as string;
    const {
      mediaType, mediaUrl, youtubeId, startTime, endTime,
      overlayTitle, overlaySubtitle, ctaText,
      ctaUrl, targetUrl,  // accept both names
      advertiser, clientEmail, clientPhone, clientCountry,
      paymentStatus, paymentAmount, invoiceRef, notes, active,
    } = req.body;

    const resolvedCtaUrl = ctaUrl ?? targetUrl;

    const current = await prisma.ad.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Not found' });

    let currentExtra: Record<string, unknown> = {};
    try { currentExtra = JSON.parse(current.description || '{}'); } catch { /* ok */ }

    const merged = {
      ...currentExtra,
      ...(mediaType !== undefined ? { mediaType } : {}),
      ...(mediaUrl !== undefined ? { mediaUrl } : {}),
      ...(youtubeId !== undefined ? { youtubeId } : {}),
      ...(startTime !== undefined ? { startTime: Number(startTime) || 0 } : {}),
      ...(endTime !== undefined ? { endTime: Number(endTime) || 0 } : {}),
      ...(overlayTitle !== undefined ? { overlayTitle } : {}),
      ...(overlaySubtitle !== undefined ? { overlaySubtitle } : {}),
      ...(ctaText !== undefined ? { ctaText } : {}),
      ...(resolvedCtaUrl !== undefined ? { ctaUrl: resolvedCtaUrl } : {}),
      ...(clientEmail !== undefined ? { clientEmail } : {}),
      ...(clientPhone !== undefined ? { clientPhone } : {}),
      ...(clientCountry !== undefined ? { clientCountry } : {}),
      ...(paymentStatus !== undefined ? { paymentStatus } : {}),
      ...(paymentAmount !== undefined ? { paymentAmount } : {}),
      ...(invoiceRef !== undefined ? { invoiceRef } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };

    const slide = await prisma.ad.update({
      where: { id },
      data: {
        title: (overlayTitle ?? currentExtra.overlayTitle ?? advertiser ?? current.title) as string,
        description: JSON.stringify(merged),
        imageUrl: mediaUrl ?? currentExtra.mediaUrl as string ?? current.imageUrl,
        targetUrl: resolvedCtaUrl ?? current.targetUrl,
        advertiser: advertiser ?? current.advertiser,
        contactPhone: clientPhone ?? current.contactPhone,
        budget: paymentAmount !== undefined ? Number(paymentAmount) : current.budget,
        active: active !== undefined ? Boolean(active) : current.active,
      },
    });
    res.json({ ...slide, ...JSON.parse(slide.description || '{}') });
  } catch (err) {
    console.error('Hero slide update error:', err);
    res.status(500).json({ error: 'Failed to update hero slide', detail: String(err) });
  }
});

// DELETE /admin/hero-slides/:id — remove a hero slide
router.delete('/hero-slides/:id', requireAuth, adminOnly, async (req, res) => {
  const id = req.params.id as string;
  await prisma.ad.delete({ where: { id } });
  res.json({ ok: true });
});

// PATCH /admin/hero-slides/:id/toggle — toggle active/inactive
router.patch('/hero-slides/:id/toggle', requireAuth, adminOnly, async (req, res) => {
  const id = req.params.id as string;
  const current = await prisma.ad.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ error: 'Not found' });
  const slide = await prisma.ad.update({ where: { id }, data: { active: !current.active } });
  res.json({ ...slide, active: slide.active });
});

// GET /admin/public/stats — public aggregate stats for homepage visitor dashboard
router.get('/public/stats', async (_req, res) => {
  try {
    const [totalListings, totalUsers, countryCounts, totalClassifieds] = await Promise.all([
      prisma.listing.count({ where: { verified: true } }),
      prisma.user.count(),
      prisma.listing.groupBy({ by: ['country'], _count: { id: true } }),
      prisma.classified.count().catch(() => 0),
    ]);
    res.json({
      listings: totalListings,
      users: totalUsers,
      countries: countryCounts.length,
      classifieds: totalClassifieds,
    });
  } catch {
    res.json({ listings: 0, users: 0, countries: 0, classifieds: 0 });
  }
});

// GET /hero-slides (public) — active hero slides for the homepage
router.get('/public/hero-slides', async (_req, res) => {
  const slides = await prisma.ad.findMany({
    where: { packageId: 'hero-slide', active: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(slides.map(s => {
    let extra: Record<string, unknown> = {};
    try { extra = JSON.parse(s.description || '{}'); } catch { /* ok */ }
    return {
      id: s.id,
      advertiser: s.advertiser,
      targetUrl: s.targetUrl,
      imageUrl: s.imageUrl,
      impressions: s.impressions,
      ...extra,
    };
  }));
});

// GET /admin/seo-settings — fetch editable social sharing SEO settings
router.get('/seo-settings', requireAuth, adminOnly, async (_req, res) => {
  const record = await prisma.listing.findUnique({ where: { osmId: 'seshaa-seo-config' } });
  if (!record?.description) {
    return res.json({
      title: 'Seshaa Africa — Directory for All 54 Countries',
      description: 'Find businesses, services, and people across all 54 African countries on Seshaa.',
      thumbnailUrl: 'https://www.seshaa.africa/og-image.svg',
      url: 'https://www.seshaa.africa',
    });
  }

  try {
    const parsed = JSON.parse(record.description) as { title?: string; description?: string; thumbnailUrl?: string; url?: string };
    return res.json({
      title: parsed.title || 'Seshaa Africa — Directory for All 54 Countries',
      description: parsed.description || 'Find businesses, services, and people across all 54 African countries on Seshaa.',
      thumbnailUrl: parsed.thumbnailUrl || 'https://www.seshaa.africa/og-image.svg',
      url: parsed.url || 'https://www.seshaa.africa',
    });
  } catch {
    return res.json({
      title: 'Seshaa Africa — Directory for All 54 Countries',
      description: 'Find businesses, services, and people across all 54 African countries on Seshaa.',
      thumbnailUrl: 'https://www.seshaa.africa/og-image.svg',
      url: 'https://www.seshaa.africa',
    });
  }
});

// POST /admin/seo-settings — save social sharing SEO metadata
router.post('/seo-settings', requireAuth, adminOnly, async (req, res) => {
  const title = String(req.body?.title || '').trim() || 'Seshaa Africa — Directory for All 54 Countries';
  const description = String(req.body?.description || '').trim() || 'Find businesses, services, and people across all 54 African countries on Seshaa.';
  const thumbnailUrl = String(req.body?.thumbnailUrl || '').trim() || 'https://www.seshaa.africa/og-image.svg';
  const url = String(req.body?.url || '').trim() || 'https://www.seshaa.africa';

  const payload = JSON.stringify({ title, description, thumbnailUrl, url });

  await prisma.listing.upsert({
    where: { osmId: 'seshaa-seo-config' },
    update: {
      name: 'SEO Share Config',
      description: payload,
      active: true,
      verified: true,
    },
    create: {
      name: 'SEO Share Config',
      description: payload,
      osmId: 'seshaa-seo-config',
      country: 'ZZ',
      city: 'Global',
      type: 'BUSINESS',
      active: true,
      verified: true,
    },
  });

  res.json({ ok: true, title, description, thumbnailUrl, url });
});

// GET /admin/public/seo-settings — public SEO metadata for frontend head tags
router.get('/public/seo-settings', async (_req, res) => {
  const record = await prisma.listing.findUnique({ where: { osmId: 'seshaa-seo-config' } });
  if (!record?.description) {
    return res.json({
      title: 'Seshaa Africa — Directory for All 54 Countries',
      description: 'Find businesses, services, and people across all 54 African countries on Seshaa.',
      thumbnailUrl: 'https://www.seshaa.africa/og-image.svg',
      url: 'https://www.seshaa.africa',
    });
  }

  try {
    const parsed = JSON.parse(record.description) as { title?: string; description?: string; thumbnailUrl?: string; url?: string };
    return res.json({
      title: parsed.title || 'Seshaa Africa — Directory for All 54 Countries',
      description: parsed.description || 'Find businesses, services, and people across all 54 African countries on Seshaa.',
      thumbnailUrl: parsed.thumbnailUrl || 'https://www.seshaa.africa/og-image.svg',
      url: parsed.url || 'https://www.seshaa.africa',
    });
  } catch {
    return res.json({
      title: 'Seshaa Africa — Directory for All 54 Countries',
      description: 'Find businesses, services, and people across all 54 African countries on Seshaa.',
      thumbnailUrl: 'https://www.seshaa.africa/og-image.svg',
      url: 'https://www.seshaa.africa',
    });
  }
});

// GET /admin/ai-settings — fetch AI provider settings for admin UI
router.get('/ai-settings', requireAuth, adminOnly, async (_req, res) => {
  const envKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const record = await prisma.listing.findUnique({ where: { osmId: 'seshaa-ai-config' } });

  let dbKey = '';
  let model = '';
  if (record?.description) {
    try {
      const parsed = JSON.parse(record.description) as { openRouterApiKey?: string; openRouterModel?: string };
      dbKey = (parsed.openRouterApiKey || '').trim();
      model = (parsed.openRouterModel || '').trim();
    } catch {
      // ignore malformed legacy config
    }
  }

  res.json({
    hasOpenRouterKey: Boolean(envKey || dbKey),
    keySource: envKey ? 'env' : dbKey ? 'db' : 'none',
    openRouterModel: model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  });
});

// POST /admin/ai-settings — save OpenRouter key/model to DB config
router.post('/ai-settings', requireAuth, adminOnly, async (req, res) => {
  const openRouterApiKey = String(req.body?.openRouterApiKey || '').trim();
  const openRouterModel = String(req.body?.openRouterModel || '').trim() || 'openai/gpt-4o-mini';

  const existing = await prisma.listing.findUnique({ where: { osmId: 'seshaa-ai-config' } });
  let existingConfig: { openRouterApiKey?: string; openRouterModel?: string } = {};
  if (existing?.description) {
    try {
      existingConfig = JSON.parse(existing.description) as { openRouterApiKey?: string; openRouterModel?: string };
    } catch {
      existingConfig = {};
    }
  }

  const merged = {
    ...existingConfig,
    ...(openRouterApiKey ? { openRouterApiKey } : {}),
    openRouterModel,
  };

  await prisma.listing.upsert({
    where: { osmId: 'seshaa-ai-config' },
    update: {
      name: 'AI Provider Config',
      description: JSON.stringify(merged),
      active: true,
      verified: true,
    },
    create: {
      name: 'AI Provider Config',
      description: JSON.stringify(merged),
      osmId: 'seshaa-ai-config',
      country: 'ZZ',
      city: 'Global',
      type: 'BUSINESS',
      active: true,
      verified: true,
    },
  });

  res.json({ ok: true, hasOpenRouterKey: Boolean(merged.openRouterApiKey), openRouterModel: merged.openRouterModel });
});

// GET /admin/theme-settings — fetch per-country theme color overrides
router.get('/theme-settings', requireAuth, adminOnly, async (_req, res) => {
  const record = await prisma.listing.findUnique({ where: { osmId: 'seshaa-theme-config' } });
  if (!record?.description) return res.json({ overrides: {} });
  try {
    const parsed = JSON.parse(record.description) as { overrides?: Record<string, { primary?: string; secondary?: string; accent?: string; text?: string }> };
    return res.json({ overrides: parsed.overrides || {} });
  } catch {
    return res.json({ overrides: {} });
  }
});

// POST /admin/theme-settings — save per-country theme color overrides
router.post('/theme-settings', requireAuth, adminOnly, async (req, res) => {
  const overrides = (req.body?.overrides || {}) as Record<string, { primary?: string; secondary?: string; accent?: string; text?: string }>;

  await prisma.listing.upsert({
    where: { osmId: 'seshaa-theme-config' },
    update: {
      name: 'Theme Config',
      description: JSON.stringify({ overrides }),
      active: true,
      verified: true,
    },
    create: {
      name: 'Theme Config',
      description: JSON.stringify({ overrides }),
      osmId: 'seshaa-theme-config',
      country: 'ZZ',
      city: 'Global',
      type: 'BUSINESS',
      active: true,
      verified: true,
    },
  });

  res.json({ ok: true, overrides });
});

// GET /admin/public/theme-settings — public theme color overrides for frontend runtime
router.get('/public/theme-settings', async (_req, res) => {
  const record = await prisma.listing.findUnique({ where: { osmId: 'seshaa-theme-config' } });
  if (!record?.description) return res.json({ overrides: {} });
  try {
    const parsed = JSON.parse(record.description) as { overrides?: Record<string, { primary?: string; secondary?: string; accent?: string; text?: string }> };
    return res.json({ overrides: parsed.overrides || {} });
  } catch {
    return res.json({ overrides: {} });
  }
});

// GET /admin/pod-settings — retrieve POD API settings (without exposing full keys)
router.get('/pod-settings', requireAuth, adminOnly, async (_req, res) => {
  const record = await prisma.listing.findUnique({ where: { osmId: 'seshaa-pod-config' } });
  let cfg: { printifyApiKey?: string; printfulApiKey?: string; services?: Array<{ name: string; website: string; region: string; eco?: string; description?: string }> } = {};
  if (record?.description) {
    try { cfg = JSON.parse(record.description) as typeof cfg; } catch { cfg = {}; }
  }
  res.json({
    hasPrintifyApiKey: Boolean((cfg.printifyApiKey || '').trim()),
    hasPrintfulApiKey: Boolean((cfg.printfulApiKey || '').trim()),
    services: cfg.services || [],
  });
});

// POST /admin/pod-settings — save POD API keys from admin panel
router.post('/pod-settings', requireAuth, adminOnly, async (req, res) => {
  const printifyApiKey = String(req.body?.printifyApiKey || '').trim();
  const printfulApiKey = String(req.body?.printfulApiKey || '').trim();

  const existing = await prisma.listing.findUnique({ where: { osmId: 'seshaa-pod-config' } });
  let current: { printifyApiKey?: string; printfulApiKey?: string; services?: Array<{ name: string; website: string; region: string; eco?: string; description?: string }> } = {};
  if (existing?.description) {
    try { current = JSON.parse(existing.description) as typeof current; } catch { current = {}; }
  }

  const merged = {
    ...current,
    ...(printifyApiKey ? { printifyApiKey } : {}),
    ...(printfulApiKey ? { printfulApiKey } : {}),
  };

  await prisma.listing.upsert({
    where: { osmId: 'seshaa-pod-config' },
    update: {
      name: 'POD Config',
      description: JSON.stringify(merged),
      active: true,
      verified: true,
    },
    create: {
      name: 'POD Config',
      description: JSON.stringify(merged),
      osmId: 'seshaa-pod-config',
      country: 'ZZ',
      city: 'Global',
      type: 'BUSINESS',
      active: true,
      verified: true,
    },
  });

  res.json({ ok: true, hasPrintifyApiKey: Boolean(merged.printifyApiKey), hasPrintfulApiKey: Boolean(merged.printfulApiKey) });
});

// POST /admin/pod-services/scrape — scrape known African POD candidate services
router.post('/pod-services/scrape', requireAuth, adminOnly, async (_req, res) => {
  const candidates = [
    { name: 'Printify', website: 'https://printify.com', region: 'Global', eco: 'On-demand production reduces waste' },
    { name: 'Printful', website: 'https://www.printful.com', region: 'Global', eco: 'Eco product line and reduced packaging waste' },
    { name: 'Gelato', website: 'https://www.gelato.com', region: 'Global', eco: 'Local production network lowers shipping footprint' },
    { name: 'Merch42 Africa', website: 'https://merch42.com', region: 'Africa', eco: 'On-demand model avoids overproduction' },
  ];

  const scraped: Array<{ name: string; website: string; region: string; eco?: string; description?: string }> = [];

  for (const item of candidates) {
    try {
      const html = await fetch(item.website, { signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.text() : '');
      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
      const desc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]?.trim();
      scraped.push({
        ...item,
        description: desc || title || `${item.name} POD service`,
      });
    } catch {
      scraped.push({ ...item, description: `${item.name} POD service` });
    }
  }

  const existing = await prisma.listing.findUnique({ where: { osmId: 'seshaa-pod-config' } });
  let current: { printifyApiKey?: string; printfulApiKey?: string; services?: Array<{ name: string; website: string; region: string; eco?: string; description?: string }> } = {};
  if (existing?.description) {
    try { current = JSON.parse(existing.description) as typeof current; } catch { current = {}; }
  }

  await prisma.listing.upsert({
    where: { osmId: 'seshaa-pod-config' },
    update: {
      name: 'POD Config',
      description: JSON.stringify({ ...current, services: scraped }),
      active: true,
      verified: true,
    },
    create: {
      name: 'POD Config',
      description: JSON.stringify({ ...current, services: scraped }),
      osmId: 'seshaa-pod-config',
      country: 'ZZ',
      city: 'Global',
      type: 'BUSINESS',
      active: true,
      verified: true,
    },
  });

  res.json({ ok: true, services: scraped });
});

export default router;
