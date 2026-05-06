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
// Set `eventsOnly: true` for feeds that are 100% events — skips the looksLikeEvent filter
type RssSource = { name: string; url: string; country: string; city?: string; category?: string; eventsOnly?: boolean };

const RSS_SOURCES: RssSource[] = [
  // ── Pan-Africa ────────────────────────────────────────────────────────────
  { name: 'OkayAfrica Events',         url: 'https://www.okayafrica.com/tag/events/feed/',    country: 'Pan-Africa', category: 'Culture' },
  { name: 'AfroPunk',                  url: 'https://afropunk.com/feed/',                     country: 'Pan-Africa', category: 'Music' },
  { name: 'The Africa Report Events',  url: 'https://www.theafricareport.com/tag/events/feed/', country: 'Pan-Africa' },
  { name: 'African Business Events',   url: 'https://african.business/tag/events/feed/',      country: 'Pan-Africa', category: 'Business' },
  { name: 'This Is Africa Events',     url: 'https://thisisafrica.me/tag/events/feed/',       country: 'Pan-Africa', category: 'Culture' },

  // ── South Africa ──────────────────────────────────────────────────────────
  { name: "What's On in Cape Town",    url: 'https://www.whatsonincapetown.com/feed/',        country: 'South Africa', city: 'Cape Town', eventsOnly: true },
  { name: 'SA Events',                 url: 'https://saevents.co.za/feed/',                   country: 'South Africa', eventsOnly: true },
  { name: 'CapeTownMagazine Events',   url: 'https://www.capetownmagazine.com/whats-on/feed', country: 'South Africa', city: 'Cape Town', eventsOnly: true },
  { name: 'TimeOut South Africa',      url: 'https://www.timeout.com/south-africa/things-to-do/rss', country: 'South Africa', eventsOnly: true },
  { name: 'Joburg Events',             url: 'https://joburg.co.za/events/feed/',              country: 'South Africa', city: 'Johannesburg', eventsOnly: true },
  { name: '2Oceansvibe Events',        url: 'https://2oceansvibe.com/tag/events/feed/',       country: 'South Africa', city: 'Cape Town' },
  { name: 'IOL Entertainment SA',      url: 'https://www.iol.co.za/entertainment/rss',        country: 'South Africa' },

  // ── Nigeria ───────────────────────────────────────────────────────────────
  { name: 'Lagos Events',              url: 'https://lagosevents.com/feed/',                  country: 'Nigeria', city: 'Lagos', eventsOnly: true },
  { name: 'BellaNaija Events',         url: 'https://www.bellanaija.com/tag/event/feed/',     country: 'Nigeria', category: 'Culture' },
  { name: 'Pulse Nigeria Events',      url: 'https://www.pulse.ng/entertainment/rss',         country: 'Nigeria', category: 'Entertainment' },
  { name: 'Guardian Nigeria Events',   url: 'https://guardian.ng/tag/events/feed/',           country: 'Nigeria' },
  { name: 'This Day Events',           url: 'https://www.thisdaylive.com/index.php/category/arts-culture/feed/', country: 'Nigeria' },

  // ── Kenya ─────────────────────────────────────────────────────────────────
  { name: 'TimeOut Nairobi',           url: 'https://www.timeout.com/nairobi/things-to-do/rss', country: 'Kenya', city: 'Nairobi', eventsOnly: true },
  { name: 'Pulse Kenya Events',        url: 'https://www.pulselive.co.ke/entertainment/rss',  country: 'Kenya', category: 'Entertainment' },
  { name: 'Nairobi Events',            url: 'https://nairobievents.com/feed/',                country: 'Kenya', city: 'Nairobi', eventsOnly: true },
  { name: 'Nairobi Wire Events',       url: 'https://nairobiwire.com/tag/events/feed/',       country: 'Kenya', city: 'Nairobi' },
  { name: 'Standard Media Events KE',  url: 'https://www.standardmedia.co.ke/tag/events/rss', country: 'Kenya' },

  // ── Ghana ─────────────────────────────────────────────────────────────────
  { name: 'Ghana Events Online',       url: 'https://www.ghanaeventsonline.com/feed/',        country: 'Ghana', city: 'Accra', eventsOnly: true },
  { name: 'MyJoyOnline Entertainment', url: 'https://www.myjoyonline.com/entertainment/feed/', country: 'Ghana', category: 'Entertainment' },
  { name: 'GhanaWeb Entertainment',    url: 'https://www.ghanaweb.com/GhanaHomePage/entertainment/rss.php', country: 'Ghana' },
  { name: 'Citifmonline Events',       url: 'https://citifmonline.com/tag/events/feed/',      country: 'Ghana', city: 'Accra' },

  // ── Tanzania ──────────────────────────────────────────────────────────────
  { name: 'IPPMedia Lifestyle',        url: 'https://www.ippmedia.com/en/lifestyle/feed',     country: 'Tanzania' },
  { name: 'Citizen Tanzania Events',   url: 'https://www.thecitizen.co.tz/tag/events/rss',   country: 'Tanzania' },

  // ── Uganda ────────────────────────────────────────────────────────────────
  { name: 'Pulse Uganda Events',       url: 'https://www.pulselive.co.ug/entertainment/rss', country: 'Uganda', category: 'Entertainment' },
  { name: 'Kampala Guide Events',      url: 'https://www.kampala.guide/events/feed/',         country: 'Uganda', city: 'Kampala', eventsOnly: true },

  // ── Egypt ─────────────────────────────────────────────────────────────────
  { name: 'Egyptian Streets Events',   url: 'https://egyptianstreets.com/tag/events/feed/',  country: 'Egypt' },
  { name: 'Cairo 360 Events',          url: 'https://www.cairo360.com/events/feed/',          country: 'Egypt', city: 'Cairo', eventsOnly: true },
  { name: 'Egypt Independent Events',  url: 'https://egyptindependent.com/tag/events/feed/', country: 'Egypt' },

  // ── Morocco ───────────────────────────────────────────────────────────────
  { name: 'Morocco World News Culture',url: 'https://www.moroccoworldnews.com/category/culture/feed/', country: 'Morocco', category: 'Culture' },
  { name: 'H24 Info Maroc Events',     url: 'https://www.h24info.ma/tag/evenement/feed/',    country: 'Morocco' },

  // ── Ethiopia ──────────────────────────────────────────────────────────────
  { name: 'Addis Fortune',             url: 'https://addisfortune.news/feed/',                country: 'Ethiopia', city: 'Addis Ababa' },
  { name: 'Addis Standard Events',     url: 'https://addisstandard.com/tag/events/feed/',    country: 'Ethiopia' },

  // ── Senegal / West Africa ─────────────────────────────────────────────────
  { name: 'Seneplus Events',           url: 'https://www.seneplus.com/tag/evenements/rss',   country: 'Senegal', city: 'Dakar' },
  { name: 'Abidjan Events',            url: 'https://www.abidjan.net/rss/news.asp',          country: "Côte d'Ivoire", city: 'Abidjan' },

  // ── Rwanda ────────────────────────────────────────────────────────────────
  { name: 'KigaliWire Events',         url: 'https://www.kigaliwire.com/feed/',              country: 'Rwanda', city: 'Kigali' },
  { name: 'New Times Rwanda Events',   url: 'https://www.newtimes.co.rw/section/events/rss', country: 'Rwanda', eventsOnly: true },

  // ── Zimbabwe ─────────────────────────────────────────────────────────────
  { name: 'Zimbabwe Events',           url: 'https://www.zimevents.co.zw/feed/',             country: 'Zimbabwe', eventsOnly: true },
  { name: 'ZimPraise Events',          url: 'https://zimpraise.com/feed/',                   country: 'Zimbabwe' },

  // ── Zambia ───────────────────────────────────────────────────────────────
  { name: 'Lusaka Times Events',       url: 'https://www.lusakatimes.com/tag/events/feed/',  country: 'Zambia', city: 'Lusaka' },

  // ── Cameroon ─────────────────────────────────────────────────────────────
  { name: 'Cameroon Tribune Events',   url: 'https://www.cameroon-tribune.cm/category/culture/feed/', country: 'Cameroon' },

  // ── Tunisia ──────────────────────────────────────────────────────────────
  { name: 'Business News Tunisia',     url: 'https://www.businessnews.com.tn/feeds/rss',    country: 'Tunisia' },
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
  if (mt?.$?.url && /^https?:\/\//.test(mt.$.url)) return mt.$.url;
  if (Array.isArray(mt) && mt[0]?.$?.url) return mt[0].$.url;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mc = item.mediaContent as any;
  if (mc?.$?.url && /^https?:\/\//.test(mc.$.url)) return mc.$.url;
  if (Array.isArray(mc) && mc[0]?.$?.url) return mc[0].$.url;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enc = item.enclosure as any;
  if (enc?.url && /image/i.test(enc.type ?? '')) return enc.url;
  // Search in all HTML fields
  const htmlFields = ['content:encoded', 'content', 'summary', 'description'];
  for (const field of htmlFields) {
    const html = (item[field] as string) || '';
    if (!html) continue;
    // Try data-lazy-src, data-src, src in that order
    const m = html.match(/<img[^>]+(?:data-lazy-src|data-src|src)=["']([^"']+)["']/i);
    if (m?.[1] && /^https?:\/\//.test(m[1]) && !/1x1|spacer|blank|pixel/i.test(m[1])) return m[1];
  }
  return undefined;
}

// Heuristic: does this RSS item look like an event (not just general news)?
function looksLikeEvent(title: string, desc: string): boolean {
  const text = (title + ' ' + desc).toLowerCase();
  return /\b(concert|festival|event|show|exhibition|fair|expo|summit|conference|gala|launch|performance|competition|tournament|workshop|seminar|marathon|race|carnival|parade|ceremony|match|game|screening|film|tour|party|meetup|hackathon|fashion|week|award|ceremony|live|night|outdoor|indoor|grand.?prix|championship|league|cup|fete|fêt|foire|spectacle|soirée|bal|gala|symposium|retreat|bootcamp|accelerator|demo.?day|graduation|fundraiser|charity|auction|bazaar|market|open.?day)\b/.test(text);
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
    // Prune items older than 60 days from publication
    const cutoff = Date.now() - 60 * 86400_000;

    for (const item of feed.items.slice(0, 20)) {
      const title   = item.title?.trim() || '';
      const link    = item.link || '';
      const desc    = (item.contentSnippet || item.summary || '').slice(0, 600);
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const image   = extractImage(item as unknown as Record<string, unknown>);

      if (!title || !link) continue;
      if (pubDate.getTime() < cutoff) continue; // skip very old items
      // Skip the looksLikeEvent filter for dedicated event feeds
      if (!src.eventsOnly && !looksLikeEvent(title, desc)) continue;

      // Use pubDate as a proxy for startDate (RSS events rarely have structured dates)
      const startDate = pubDate.toISOString();

      results.push({
        id:          `rss_${Buffer.from(link).toString('base64').slice(0, 12)}`,
        title,
        description: desc || undefined,
        startDate,
        city:        src.city ?? 'TBD',
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

// ── Ticketmaster Discovery API ────────────────────────────────────────────────
const TM_KEY = () => process.env.TICKETMASTER_API_KEY;

// Two-letter country codes for African nations on Ticketmaster
const TM_COUNTRIES = ['ZA', 'NG', 'KE', 'GH', 'EG', 'MA', 'TN', 'ET', 'TZ', 'UG', 'RW', 'CM', 'SN', 'CI'];

const TM_COUNTRY_NAMES: Record<string, string> = {
  ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', GH: 'Ghana', EG: 'Egypt',
  MA: 'Morocco', TN: 'Tunisia', ET: 'Ethiopia', TZ: 'Tanzania', UG: 'Uganda',
  RW: 'Rwanda', CM: 'Cameroon', SN: 'Senegal', CI: "Côte d'Ivoire",
};

async function fetchTicketmaster(countryCode: string): Promise<DiscoveredEvent[]> {
  const key = TM_KEY();
  if (!key) return [];
  try {
    const qs = new URLSearchParams({
      countryCode,
      size: '20',
      sort: 'date,asc',
      startDateTime: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      apikey: key,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await httpsGet(`https://app.ticketmaster.com/discovery/v2/events.json?${qs}`) as { _embedded?: { events?: any[] } };
    const events = data._embedded?.events ?? [];
    const country = TM_COUNTRY_NAMES[countryCode] ?? countryCode;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return events.map((e: any) => ({
      id:          `tm_${e.id}`,
      title:       e.name ?? '',
      description: e.info?.slice(0, 400) ?? e.pleaseNote?.slice(0, 400),
      startDate:   e.dates?.start?.dateTime ?? e.dates?.start?.localDate ?? new Date().toISOString(),
      venue:       e._embedded?.venues?.[0]?.name,
      city:        e._embedded?.venues?.[0]?.city?.name ?? '',
      country,
      imageUrl:    e.images?.find((i: {ratio?: string}) => i.ratio === '16_9')?.url ?? e.images?.[0]?.url,
      sourceUrl:   e.url ?? '',
      sourceName:  'Ticketmaster',
      category:    e.classifications?.[0]?.genre?.name ?? e.classifications?.[0]?.segment?.name ?? 'Other',
      isFree:      false,
      price:       e.priceRanges ? `${e.priceRanges[0]?.min} ${e.priceRanges[0]?.currency}` : undefined,
      ticketUrl:   e.url,
    })).filter((e: { title: string; sourceUrl: string }) => e.title && e.sourceUrl);
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

    // Ticketmaster (when key is configured) — batch by country
    if (TM_KEY()) {
      for (let i = 0; i < TM_COUNTRIES.length; i += 4) {
        const batch = TM_COUNTRIES.slice(i, i + 4);
        const results = await Promise.all(batch.map(fetchTicketmaster));
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
  const limit    = Math.min(parseInt(String(req.query.limit ?? '60'), 10) || 60, 200);
  const fresh    = req.query.refresh === '1';
  // upcoming=1 (default) → only show events from yesterday onward
  const upcomingOnly = req.query.upcoming !== '0';

  if (fresh) cacheExpiry = 0; // force refresh

  try {
    let events = await getEvents();

    // Default: only upcoming events (started within last 24h or in the future)
    if (upcomingOnly) {
      const cutoff = Date.now() - 24 * 60 * 60_000;
      events = events.filter(e => new Date(e.startDate).getTime() >= cutoff);
    }

    if (country)  events = events.filter(e => e.country.toLowerCase().includes(country.toLowerCase()) || country.toLowerCase().includes(e.country.toLowerCase()));
    if (category) events = events.filter(e => e.category?.toLowerCase() === category.toLowerCase());
    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      events = events.filter(e => {
        const blob = [e.title, e.description, e.city, e.country, e.category, e.venue].join(' ').toLowerCase();
        return terms.every(t => blob.includes(t));
      });
    }

    // Sort: upcoming first, then chronological
    const now = Date.now();
    events.sort((a, b) => {
      const aT = new Date(a.startDate).getTime();
      const bT = new Date(b.startDate).getTime();
      const aFuture = aT >= now;
      const bFuture = bT >= now;
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      return aT - bT;
    });

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
