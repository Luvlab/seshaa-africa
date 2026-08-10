/**
 * obituaries.ts — Daily death notices from Uganda and Africa.
 * Uganda sources are fetched first and ranked highest.
 * Combines dedicated obituary feeds + keyword-filtered general news.
 * Cache: 1 hour in-memory.
 */
import { Router } from 'express';
import Parser from 'rss-parser';
import prisma from '../db';

const router = Router();
const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Seshaa/2.0 (+https://seshaa.africa) Obituaries Aggregator' },
  customFields: { item: [['media:thumbnail', 'mediaThumbnail'], ['media:content', 'mediaContent'], ['enclosure', 'enclosure']] },
});

type ObitSource = { name: string; url: string; country: string; priority: number; dedicated?: boolean };

// Priority: 1 = Uganda (top), 2 = East Africa, 3 = Pan-Africa / rest
const SOURCES: ObitSource[] = [
  // ── UGANDA (primary market) ───────────────────────────────────────────────
  { name: 'Daily Monitor',        url: 'https://www.monitor.co.ug/rss',                                     country: 'Uganda',      priority: 1 },
  { name: 'New Vision',           url: 'https://www.newvision.co.ug/rss',                                   country: 'Uganda',      priority: 1 },
  { name: 'The Observer Uganda',  url: 'https://observer.ug/feed/',                                         country: 'Uganda',      priority: 1 },
  { name: 'Nile Post',            url: 'https://nilepost.co.ug/feed/',                                      country: 'Uganda',      priority: 1 },
  { name: 'Kampala Post',         url: 'https://www.kampalapost.com/feed/',                                 country: 'Uganda',      priority: 1 },
  { name: 'Chimp Reports',        url: 'https://chimpreports.com/feed/',                                    country: 'Uganda',      priority: 1 },
  { name: 'Eagle Online',         url: 'https://eagle.co.ug/feed/',                                        country: 'Uganda',      priority: 1 },
  { name: 'NBS TV Uganda',        url: 'https://nbstv.ug/feed/',                                           country: 'Uganda',      priority: 1 },
  { name: 'Bukedde',              url: 'https://www.bukedde.co.ug/rss',                                    country: 'Uganda',      priority: 1 },
  { name: 'Red Pepper Uganda',    url: 'https://www.redpepper.co.ug/feed/',                                country: 'Uganda',      priority: 1 },
  // ── EAST AFRICA ──────────────────────────────────────────────────────────
  { name: 'Nairobi News',         url: 'https://nairobinews.nation.africa/feed/',                          country: 'Kenya',       priority: 2 },
  { name: 'The Standard Kenya',   url: 'https://www.standardmedia.co.ke/rss/latest.php',                  country: 'Kenya',       priority: 2 },
  { name: 'Citizen TV Kenya',     url: 'https://www.citizen.digital/feed',                                 country: 'Kenya',       priority: 2 },
  { name: 'The East African',     url: 'https://www.theeastafrican.co.ke/tea/rss',                        country: 'East Africa', priority: 2 },
  { name: 'Tanzania Daily News',  url: 'https://dailynews.co.tz/feed/',                                   country: 'Tanzania',    priority: 2 },
  { name: 'IPP Media Tanzania',   url: 'https://www.ippmedia.com/en/rss.xml',                             country: 'Tanzania',    priority: 2 },
  // ── PAN-AFRICA / DEDICATED OBIT FEEDS ────────────────────────────────────
  { name: 'AllAfrica Obituaries', url: 'https://allafrica.com/obituaries/rss/',                           country: 'Pan-Africa',  priority: 3, dedicated: true },
  { name: 'Punch Obituaries',     url: 'https://punchng.com/category/obituaries/feed/',                   country: 'Nigeria',     priority: 3, dedicated: true },
  { name: 'Guardian NG Obits',    url: 'https://guardian.ng/category/features/obits/feed/',               country: 'Nigeria',     priority: 3, dedicated: true },
  { name: 'Vanguard Tributes',    url: 'https://www.vanguardngr.com/category/tribute/feed/',              country: 'Nigeria',     priority: 3, dedicated: true },
  { name: 'Nation Africa Obits',  url: 'https://nation.africa/kenya/obituaries/rss',                     country: 'Kenya',       priority: 3, dedicated: true },
];

const OBIT_KEYWORDS = [
  'obituary', 'obituaries', 'passed away', 'rest in peace', 'rip ', 'in memoriam',
  'death of', 'dies at', 'died at', 'has died', 'has passed', 'tribute to',
  'burial', 'funeral', 'funeral service', 'final journey', 'gone to rest',
  'remembering', 'in loving memory', 'we mourn', 'condolences', 'laid to rest',
  'gone home', 'gone too soon', 'death notice', 'death announcement', 'mourn',
];

function isObituary(title: string, summary?: string): boolean {
  const text = (title + ' ' + (summary || '')).toLowerCase();
  return OBIT_KEYWORDS.some(kw => text.includes(kw));
}

interface ObitItem {
  id: string;
  title: string;
  excerpt: string;
  link: string;
  source: string;
  country: string;
  priority: number;
  date: string;
  image?: string;
}

interface CacheEntry { items: ObitItem[]; ts: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchSource(src: ObitSource): Promise<ObitItem[]> {
  try {
    const feed = await parser.parseURL(src.url);
    const items: ObitItem[] = [];
    for (const item of (feed.items || []).slice(0, 40)) {
      const title   = (item.title || '').trim();
      const summary = item.contentSnippet || item.content || '';
      if (!src.dedicated && !isObituary(title, summary)) continue;
      if (!title) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = item as any;
      const image =
        raw.mediaThumbnail?.['$']?.url ||
        raw.mediaContent?.['$']?.url ||
        raw.enclosure?.url ||
        undefined;
      items.push({
        id:       item.guid || item.link || `${src.name}-${title}`,
        title,
        excerpt:  summary.slice(0, 250).replace(/<[^>]+>/g, '').trim(),
        link:     item.link || '',
        source:   src.name,
        country:  src.country,
        priority: src.priority,
        date:     item.pubDate || item.isoDate || new Date().toISOString(),
        image:    typeof image === 'string' ? image : undefined,
      });
    }
    return items;
  } catch { return []; }
}

// GET /obituaries?country=UG — all obituaries, Uganda first by default
router.get('/', async (_req, res) => {
  const key = 'all';
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.items);

  const results = await Promise.all(SOURCES.map(fetchSource));
  const merged  = results.flat();

  // Deduplicate by link
  const seen = new Set<string>();
  const unique = merged.filter(i => {
    if (!i.link || seen.has(i.link)) return false;
    seen.add(i.link);
    return true;
  });

  // Sort: priority asc (Uganda first), then date desc within each group
  unique.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  cache.set(key, { items: unique, ts: Date.now() });
  return res.json(unique);
});

// POST /obituaries/submit — community submission stored in DB
router.post('/submit', async (req, res) => {
  const { name, area, tribe, profession, description, submittedBy } = req.body as {
    name?: string; area?: string; tribe?: string; profession?: string;
    description?: string; submittedBy?: string;
  };
  if (!name || !description) return res.status(400).json({ error: 'name and description are required' });

  await prisma.listing.create({
    data: {
      name: `In Memoriam: ${name}`,
      description: JSON.stringify({ name, area, tribe, profession, description, submittedBy }),
      osmId: `obit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'OBITUARY' as never,
      city: area || 'Uganda',
      country: 'UG',
      active: false,
      verified: false,
      category: 'obituary',
    },
  });
  res.json({ ok: true });
});

export default router;
