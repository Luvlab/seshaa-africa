/**
 * Seshaa Events Discovery
 * Aggregates African events from:
 *  1. Eventbrite public API  (set EVENTBRITE_API_KEY)
 *  2. RSS feeds from African event/lifestyle publishers
 *  3. AllEvents.in public search (no key needed)
 *
 * Cache: 1 hour in-memory. Results archived to EventDiscovery DB table.
 * Every discovered event links back to its original source with full credit.
 */
import { Router } from 'express';
import https from 'https';
import Parser from 'rss-parser';
import prisma from '../db';

const router = Router();

// ── Types ────────────────────────────────────────────────────────────────────
export interface DiscoveredEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;   // ISO
  endDate?: string;
  venue?: string;
  city: string;
  country: string;
  imageUrl?: string;
  sourceUrl: string;   // original link — full credit
  sourceName: string;  // publisher name
  category?: string;
  isFree: boolean;
  price?: string;
  ticketUrl?: string;
}

// ── RSS sources with event content ───────────────────────────────────────────
type RssSource = { name: string; url: string; country: string; city?: string; category?: string };

const RSS_SOURCES: RssSource[] = [
  // ── Pan-Africa ────────────────────────────────────────────────────────────
  { name: 'OkayAfrica Events',        url: 'https://www.okayafrica.com/tag/events/feed/', country: 'Pan-Africa', category: 'Culture' },
  { name: 'AfroPunk',                 url: 'https://afropunk.com/feed/',                  country: 'Pan-Africa', category: 'Music' },
  { name: 'Africa.com Events',        url: 'https://www.africa.com/feed/',                country: 'Pan-Africa' },
  { name: 'The Africa Report Events', url: 'https://www.theafricareport.com/tag/events/feed/', country: 'Pan-Africa' },

  // ── South Africa ──────────────────────────────────────────────────────────
  { name: "What's On in Cape Town",   url: 'https://www.whatsonincapetown.com/feed/',     country: 'South Africa', city: 'Cape Town' },
  { name: 'Joburg Tourism Events',    url: 'https://www.joburgtourism.com/events/feed/',  country: 'South Africa', city: 'Johannesburg' },
  { name: 'TimeOut South Africa',     url: 'https://www.timeout.com/south-africa/rss',   country: 'South Africa' },
  { name: 'SA Events',                url: 'https://saevents.co.za/feed/',                country: 'South Africa' },
  { name: 'Expresso Online',          url: 'https://www.expresso.co.za/feed/',            country: 'South Africa' },
  { name: 'CapeTownMagazine Events',  url: 'https://www.capetownmagazine.com/whats-on/feed', country: 'South Africa', city: 'Cape Town' },

  // ── Nigeria ───────────────────────────────────────────────────────────────
  { name: 'Pulse Nigeria Events',     url: 'https://www.pulse.ng/entertainment/rss',     country: 'Nigeria', category: 'Entertainment' },
  { name: 'BellaNaija Events',        url: 'https://www.bellanaija.com/tag/event/feed/', country: 'Nigeria', category: 'Culture' },
  { name: 'Lagos Events',             url: 'https://lagosevents.com/feed/',               country: 'Nigeria', city: 'Lagos' },
  { name: 'Naira Events',             url: 'https://nairaevents.com/feed/',               country: 'Nigeria' },

  // ── Kenya ─────────────────────────────────────────────────────────────────
  { name: 'TimeOut Nairobi',          url: 'https://www.timeout.com/nairobi/rss',        country: 'Kenya', city: 'Nairobi' },
  { name: 'Pulse Kenya Events',       url: 'https://www.pulselive.co.ke/entertainment/rss', country: 'Kenya', category: 'Entertainment' },
  { name: 'Nairobi Events Guide',     url: 'https://nairobievents.com/feed/',             country: 'Kenya', city: 'Nairobi' },
  { name: 'Nairobi Wire Events',      url: 'https://nairobiwire.com/tag/events/feed/',   country: 'Kenya', city: 'Nairobi' },

  // ── Ghana ─────────────────────────────────────────────────────────────────
  { name: 'Ghana Events Online',      url: 'https://www.ghanaeventsonline.com/feed/',    country: 'Ghana', city: 'Accra' },
  { name: 'MyJoyOnline Events',       url: 'https://www.myjoyonline.com/entertainment/feed/', country: 'Ghana', category: 'Entertainment' },

  // ── Tanzania ──────────────────────────────────────────────────────────────
  { name: 'IPPMedia Events',          url: 'https://www.ippmedia.com/en/lifestyle/feed', country: 'Tanzania' },

  // ── Uganda ────────────────────────────────────────────────────────────────
  { name: 'Pulse Uganda Events',      url: 'https://www.pulselive.co.ug/entertainment/rss', country: 'Uganda', category: 'Entertainment' },

  // ── Egypt ─────────────────────────────────────────────────────────────────
  { name: 'Egyptian Streets Events',  url: 'https://egyptianstreets.com/tag/events/feed/', country: 'Egypt' },
  { name: 'Cairo 360',                url: 'https://www.cairo360.com/feed/',               country: 'Egypt', city: 'Cairo' },

  // ── Morocco ───────────────────────────────────────────────────────────────
  { name: 'Morocco World News Events',url: 'https://www.moroccoworldnews.com/category/culture/feed/', country: 'Morocco', category: 'Culture' },

  // ── Ethiopia ──────────────────────────────────────────────────────────────
  { name: 'Addis Events',             url: 'https://addisevents.com/feed/',                country: 'Ethiopia', city: 'Addis Ababa' },
  { name: 'Addis Fortune',            url: 'https://addisfortune.news/feed/',              country: 'Ethiopia', city: 'Addis Ababa' },

  // ── Senegal ───────────────────────────────────────────────────────────────
  { name: 'Dakar Actu Events',        url: 'https://www.dakaractu.com/rss/feed.xml',       country: 'Senegal', city: 'Dakar' },

  // ── Rwanda ────────────────────────────────────────────────────────────────
  { name: 'KigaliWire Events',        url: 'https://www.kigaliwire.com/feed/',             country: 'Rwanda', city: 'Kigali' },

  // ── Zimbabwe ─────────────────────────────────────────────────────────────
  { name: 'Zimbabwe Events',          url: 'https://www.zimevents.co.zw/feed/',            country: 'Zimbabwe' },
];

// ── RSS parser ────────────────────────────────────────────────────────────────
const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Seshaa/2.0 (+https://seshaa.africa) EventDiscovery' },
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
      ['event:location', 'eventLocation'],
      ['event:startdate', 'eventStartDate'],
    ],
  },
});

function extractImage(item: Record<string, unknown>): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mt = item.mediaThumbnail as any;
  if (mt?.$?.url) return mt.$.url;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mc = item.mediaContent as any;
  if (mc?.$?.url) return mc.$.url;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enc = item.enclosure as any;
  if (enc?.url) return enc.url;
  // fallback: first <img src> in content
  const html = (item.content as string) || (item['content:encoded'] as string) || '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

// Heuristic: does this RSS item look like an event (not just general news)?
function looksLikeEvent(title: string, desc: string): boolean {
  const text = (title + ' ' + desc).toLowerCase();
  return /\b(concert|festival|event|show|exhibition|fair|expo|summit|conference|gala|launch|performance|competition|tournament|workshop|seminar|marathon|race|carnival|parade|ceremony|match|game|screening|film|tour|party|meetup|hackathon|fashion|award|ceremony)\b/.test(text);
}

function guessCategory(title: string, desc: string): string {
  const t = (title + ' ' + desc).toLowerCase();
  if (/\b(concert|music|festival|afrobeats|jazz|hip.?hop|gospel|choir)\b/.test(t)) return 'Music';
  if (/\b(film|movie|cinema|screening|art|exhibition|gallery|fashion|design)\b/.test(t)) return 'Culture';
  if (/\b(food|wine|chef|culinary|restaurant|taste|gastro)\b/.test(t)) return 'Food';
  if (/\b(marathon|race|sport|football|soccer|cricket|rugby|athletics|gym|fitness)\b/.test(t)) return 'Sports';
  if (/\b(tech|startup|hackathon|coding|developer|innovation|ai|summit|conference)\b/.test(t)) return 'Tech';
  if (/\b(business|investment|entrepreneur|startup|summit|seminar|workshop|finance)\b/.test(t)) return 'Business';
  return 'Other';
}

async function scrapeRss(src: RssSource): Promise<DiscoveredEvent[]> {
  try {
    const feed = await parser.parseURL(src.url);
    const results: DiscoveredEvent[] = [];

    for (const item of feed.items.slice(0, 15)) {
      const title   = item.title?.trim() || '';
      const link    = item.link || '';
      const desc    = (item.contentSnippet || item.summary || '').slice(0, 500);
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const image   = extractImage(item as unknown as Record<string, unknown>);

      if (!title || !link) continue;
      if (!looksLikeEvent(title, desc)) continue;

      // Use pubDate as a proxy for startDate (RSS events rarely have structured dates)
      const startDate = pubDate.toISOString();

      results.push({
        id:          `rss_${Buffer.from(link).toString('base64').slice(0, 12)}`,
        title,
        description: desc || undefined,
        startDate,
        city:        src.city ?? (feed.title?.split(' ')[0] ?? 'TBD'),
        country:     src.country,
        imageUrl:    image,
        sourceUrl:   link,
        sourceName:  src.name,
        category:    src.category ?? guessCategory(title, desc),
        isFree:      /\bfree\b/i.test(title + ' ' + desc),
      });
    }
    return results;
  } catch { return []; }
}

// ── Eventbrite API ─────────────────────────────────────────────────────────
const EVENTBRITE_KEY = () => process.env.EVENTBRITE_API_KEY;

const AFRICAN_CITIES_EB = [
  'Lagos', 'Nairobi', 'Accra', 'Cape Town', 'Johannesburg', 'Cairo',
  'Casablanca', 'Addis Ababa', 'Dar es Salaam', 'Kampala', 'Kigali',
  'Abidjan', 'Dakar', 'Tunis', 'Luanda', 'Harare', 'Maputo',
];

function httpsGet(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Seshaa/2.0', ...headers } }, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Country lookup for Eventbrite venue
const EB_COUNTRY_MAP: Record<string, string> = {
  Lagos: 'Nigeria', Nairobi: 'Kenya', Accra: 'Ghana',
  'Cape Town': 'South Africa', Johannesburg: 'South Africa',
  Cairo: 'Egypt', Casablanca: 'Morocco', 'Addis Ababa': 'Ethiopia',
  'Dar es Salaam': 'Tanzania', Kampala: 'Uganda', Kigali: 'Rwanda',
  Abidjan: "Côte d'Ivoire", Dakar: 'Senegal', Tunis: 'Tunisia',
  Luanda: 'Angola', Harare: 'Zimbabwe', Maputo: 'Mozambique',
};

async function fetchEventbrite(city: string): Promise<DiscoveredEvent[]> {
  const key = EVENTBRITE_KEY();
  if (!key) return [];

  try {
    const qs = new URLSearchParams({
      'location.address': city,
      'location.within': '50km',
      'start_date.range_start': new Date().toISOString().split('T')[0] + 'T00:00:00Z',
      expand: 'venue,organizer',
      page_size: '20',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await httpsGet(`https://www.eventbriteapi.com/v3/events/search/?${qs}`, { Authorization: `Bearer ${key}` }) as { events?: any[] };
    const country = EB_COUNTRY_MAP[city] || 'Africa';

    return (data.events ?? []).map((e: {
      id: string; name?: { text?: string }; description?: { text?: string };
      start?: { utc?: string }; end?: { utc?: string };
      venue?: { name?: string; address?: { city?: string } };
      logo?: { url?: string }; url?: string;
      is_free?: boolean; ticket_availability?: { minimum_ticket_price?: { display?: string } };
      category_id?: string;
    }) => ({
      id:          `eb_${e.id}`,
      title:       e.name?.text ?? '',
      description: e.description?.text?.slice(0, 400),
      startDate:   e.start?.utc ?? new Date().toISOString(),
      endDate:     e.end?.utc,
      venue:       e.venue?.name,
      city:        e.venue?.address?.city ?? city,
      country,
      imageUrl:    e.logo?.url,
      sourceUrl:   e.url ?? '',
      sourceName:  'Eventbrite',
      isFree:      e.is_free ?? false,
      price:       e.ticket_availability?.minimum_ticket_price?.display,
      ticketUrl:   e.url,
    })).filter((e: { title: string; sourceUrl: string }) => e.title && e.sourceUrl);
  } catch { return []; }
}

// ── In-memory cache ──────────────────────────────────────────────────────────
let cachedEvents: DiscoveredEvent[] = [];
let cacheExpiry  = 0;
let refreshing   = false;

async function refreshCache(): Promise<DiscoveredEvent[]> {
  if (refreshing) return cachedEvents;
  refreshing = true;

  try {
    // Run all RSS scrapers + Eventbrite for key cities in parallel (batched)
    const BATCH = 8;
    const allItems: DiscoveredEvent[] = [];

    for (let i = 0; i < RSS_SOURCES.length; i += BATCH) {
      const batch = RSS_SOURCES.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(scrapeRss));
      results.forEach(r => allItems.push(...r));
    }

    // Eventbrite (when key is configured) — batch cities
    if (EVENTBRITE_KEY()) {
      for (let i = 0; i < AFRICAN_CITIES_EB.length; i += 4) {
        const batch = AFRICAN_CITIES_EB.slice(i, i + 4);
        const results = await Promise.all(batch.map(fetchEventbrite));
        results.forEach(r => allItems.push(...r));
      }
    }

    // Deduplicate by sourceUrl
    const seen = new Set<string>();
    const unique = allItems.filter(e => {
      if (seen.has(e.sourceUrl)) return false;
      seen.add(e.sourceUrl);
      return true;
    });

    // Sort: future events first, then past (desc)
    const now = Date.now();
    unique.sort((a, b) => {
      const aFuture = new Date(a.startDate).getTime() >= now;
      const bFuture = new Date(b.startDate).getTime() >= now;
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    cachedEvents = unique;
    cacheExpiry  = Date.now() + 60 * 60_000; // 1 h

    // Archive to DB best-effort
    archiveEvents(unique).catch(() => {});
    return unique;
  } catch (err) {
    console.error('[eventDiscover] refresh error', err);
    return cachedEvents; // serve stale
  } finally {
    refreshing = false;
  }
}

async function getEvents(): Promise<DiscoveredEvent[]> {
  if (Date.now() < cacheExpiry && cachedEvents.length) return cachedEvents;
  return refreshCache();
}

// ── Archive to DB ─────────────────────────────────────────────────────────────
async function archiveEvents(events: DiscoveredEvent[]) {
  for (const e of events.slice(0, 200)) {
    if (!e.sourceUrl) continue;
    try {
      await prisma.eventDiscovery.upsert({
        where:  { sourceUrl: e.sourceUrl },
        update: {
          title:       e.title,
          description: e.description,
          startDate:   new Date(e.startDate),
          endDate:     e.endDate ? new Date(e.endDate) : null,
          venue:       e.venue,
          city:        e.city,
          country:     e.country,
          imageUrl:    e.imageUrl,
          sourceName:  e.sourceName,
          category:    e.category,
          isFree:      e.isFree,
          price:       e.price,
          ticketUrl:   e.ticketUrl,
          archivedAt:  new Date(),
        },
        create: {
          title:       e.title,
          description: e.description,
          startDate:   new Date(e.startDate),
          endDate:     e.endDate ? new Date(e.endDate) : null,
          venue:       e.venue,
          city:        e.city,
          country:     e.country,
          imageUrl:    e.imageUrl,
          sourceUrl:   e.sourceUrl,
          sourceName:  e.sourceName,
          category:    e.category,
          isFree:      e.isFree,
          price:       e.price,
          ticketUrl:   e.ticketUrl,
        },
      });
    } catch { /* ignore individual failures */ }
  }
}

// ── GET /events/discover ──────────────────────────────────────────────────────
router.get('/discover', async (req, res) => {
  const country  = req.query.country  ? String(req.query.country)  : '';
  const category = req.query.category ? String(req.query.category) : '';
  const q        = req.query.q        ? String(req.query.q).toLowerCase() : '';
  const limit    = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 100);
  const fresh    = req.query.refresh === '1';

  if (fresh) cacheExpiry = 0; // force refresh

  try {
    let events = await getEvents();

    if (country)  events = events.filter(e => e.country.toLowerCase() === country.toLowerCase());
    if (category) events = events.filter(e => e.category?.toLowerCase() === category.toLowerCase());
    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      events = events.filter(e => {
        const blob = [e.title, e.description, e.city, e.country, e.category, e.venue].join(' ').toLowerCase();
        return terms.every(t => blob.includes(t));
      });
    }

    res.json({ total: events.length, events: events.slice(0, limit) });
  } catch (err) {
    console.error('[eventDiscover] route error', err);
    res.status(500).json({ error: 'Could not load discovered events' });
  }
});

// ── GET /events/discover/archive — search DB archive ─────────────────────────
router.get('/discover/archive', async (req, res) => {
  const country  = req.query.country  ? String(req.query.country)  : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;
  const q        = req.query.q        ? String(req.query.q)        : undefined;
  const limit    = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 100);

  try {
    const where: Record<string, unknown> = {};
    if (country)  where.country  = { equals: country, mode: 'insensitive' };
    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (q) where.OR = [
      { title:       { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { city:        { contains: q, mode: 'insensitive' } },
    ];

    const [total, events] = await Promise.all([
      prisma.eventDiscovery.count({ where }),
      prisma.eventDiscovery.findMany({
        where,
        orderBy: { startDate: 'asc' },
        take: limit,
      }),
    ]);
    res.json({ total, events });
  } catch (err) {
    console.error('[eventDiscover] archive error', err);
    res.status(500).json({ error: 'Archive search failed' });
  }
});

export default router;
