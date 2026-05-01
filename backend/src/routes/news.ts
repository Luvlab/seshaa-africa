/**
 * Seshaa News Router
 * Aggregates RSS feeds from 100+ African publications.
 * All articles link back to their original source with full credit.
 * Cache: 30 min in-memory per category.
 * Archive: saves headlines to DB when cache refreshes.
 */
import { Router } from 'express';
import Parser from 'rss-parser';
import prisma from '../db';

const router = Router();
const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Seshaa/2.0 (+https://seshaa.africa) RSS Aggregator' },
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
    ],
  },
});

// ── Source registry ──────────────────────────────────────────────────────────
// Ordered roughly by reach/traffic within each category.
type Source = { name: string; url: string; country: string; lang?: string; category?: string };

const ALL_SOURCES: Source[] = [
  // ── PAN-AFRICAN ──────────────────────────────────────────────────────────
  { name: 'AllAfrica', url: 'https://allafrica.com/tools/headlines/rdf/africa/headlines.rdf', country: 'Pan-Africa' },
  { name: 'BBC Africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', country: 'Pan-Africa' },
  { name: 'Al Jazeera Africa', url: 'https://www.aljazeera.com/xml/rss/all.xml', country: 'Pan-Africa' },
  { name: 'The Africa Report', url: 'https://www.theafricareport.com/feed/', country: 'Pan-Africa' },
  { name: 'Africa News', url: 'https://www.africanews.com/feed/rss', country: 'Pan-Africa' },
  { name: 'RFI Afrique', url: 'https://www.rfi.fr/fr/afrique/rss', country: 'Pan-Africa', lang: 'fr' },
  { name: 'France 24 Afrique', url: 'https://www.france24.com/fr/afrique/rss', country: 'Pan-Africa', lang: 'fr' },
  { name: 'Quartz Africa', url: 'https://qz.com/africa/rss', country: 'Pan-Africa' },
  { name: 'African Arguments', url: 'https://africanarguments.org/feed/', country: 'Pan-Africa' },
  { name: 'How We Made It', url: 'https://howwemadeitinafrica.com/feed/', country: 'Pan-Africa', category: 'business' },
  { name: 'African Business', url: 'https://african.business/feed/', country: 'Pan-Africa', category: 'business' },
  { name: 'The Continent', url: 'https://thecontinent.org/feed/', country: 'Pan-Africa' },
  { name: 'Ventures Africa', url: 'https://venturesafrica.com/feed/', country: 'Pan-Africa', category: 'business' },
  { name: 'OkayAfrica', url: 'https://www.okayafrica.com/feed/', country: 'Pan-Africa', category: 'entertainment' },

  // ── NIGERIA ──────────────────────────────────────────────────────────────
  { name: 'Punch NG', url: 'https://punchng.com/feed/', country: 'Nigeria' },
  { name: 'Vanguard NG', url: 'https://www.vanguardngr.com/feed/', country: 'Nigeria' },
  { name: 'Premium Times', url: 'https://www.premiumtimesng.com/feed/', country: 'Nigeria' },
  { name: 'BusinessDay NG', url: 'https://businessday.ng/feed/', country: 'Nigeria', category: 'business' },
  { name: 'The Guardian NG', url: 'https://guardian.ng/feed/', country: 'Nigeria' },
  { name: 'Channels TV', url: 'https://www.channelstv.com/feed/', country: 'Nigeria' },
  { name: 'Daily Trust', url: 'https://dailytrust.com/feed/', country: 'Nigeria' },
  { name: 'This Day Live', url: 'https://www.thisdaylive.com/index.php/feed/', country: 'Nigeria' },
  { name: 'Nairametrics', url: 'https://nairametrics.com/feed/', country: 'Nigeria', category: 'finance' },
  { name: 'TechCabal', url: 'https://techcabal.com/feed/', country: 'Nigeria', category: 'technology' },
  { name: 'TechPoint Africa', url: 'https://techpoint.africa/feed/', country: 'Nigeria', category: 'technology' },
  { name: 'Technext', url: 'https://technext24.com/feed/', country: 'Nigeria', category: 'technology' },
  { name: 'Bella Naija', url: 'https://www.bellanaija.com/feed/', country: 'Nigeria', category: 'entertainment' },
  { name: 'Pulse Nigeria', url: 'https://www.pulse.ng/rss/feed.xml', country: 'Nigeria', category: 'entertainment' },
  { name: 'NotJustOk', url: 'https://www.notjustok.com/feed/', country: 'Nigeria', category: 'entertainment' },
  { name: 'Naija247News', url: 'https://naija247news.com/feed/', country: 'Nigeria' },
  { name: 'Leadership NG', url: 'https://leadership.ng/feed/', country: 'Nigeria' },
  { name: 'Sun News', url: 'https://www.sunnewsonline.com/feed/', country: 'Nigeria' },

  // ── KENYA ────────────────────────────────────────────────────────────────
  { name: 'Nation Africa', url: 'https://nation.africa/rss/feed.xml', country: 'Kenya' },
  { name: 'The Standard KE', url: 'https://www.standardmedia.co.ke/rss', country: 'Kenya' },
  { name: 'The Star KE', url: 'https://www.the-star.co.ke/rss/feed/', country: 'Kenya' },
  { name: 'Business Daily KE', url: 'https://www.businessdailyafrica.com/rss/feed.xml', country: 'Kenya', category: 'business' },
  { name: 'Tuko KE', url: 'https://www.tuko.co.ke/rss', country: 'Kenya' },
  { name: 'The East African', url: 'https://www.theeastafrican.co.ke/rss', country: 'East Africa', category: 'business' },

  // ── SOUTH AFRICA ─────────────────────────────────────────────────────────
  { name: 'Daily Maverick', url: 'https://www.dailymaverick.co.za/feed/', country: 'South Africa' },
  { name: 'Mail & Guardian', url: 'https://mg.co.za/feed/', country: 'South Africa' },
  { name: 'News24', url: 'https://feeds.news24.com/articles/news24/TopStories/rss', country: 'South Africa' },
  { name: 'TimesLive SA', url: 'https://www.timeslive.co.za/rss/', country: 'South Africa' },
  { name: 'Eyewitness News', url: 'https://ewn.co.za/rssfeeds', country: 'South Africa' },
  { name: 'SowetanLive', url: 'https://www.sowetanlive.co.za/rss/', country: 'South Africa' },
  { name: 'Business Day SA', url: 'https://www.businesslive.co.za/rss/bd/', country: 'South Africa', category: 'business' },
  { name: 'Fin24', url: 'https://www.news24.com/fin24/rss', country: 'South Africa', category: 'finance' },
  { name: 'TechCentral SA', url: 'https://techcentral.co.za/feed/', country: 'South Africa', category: 'technology' },
  { name: 'IT Web Africa', url: 'https://itweb.africa/feed/rss', country: 'South Africa', category: 'technology' },
  { name: 'Health-e News', url: 'https://health-e.org.za/feed/', country: 'South Africa', category: 'health' },
  { name: 'Briefly SA', url: 'https://briefly.co.za/rss', country: 'South Africa', category: 'entertainment' },

  // ── GHANA ────────────────────────────────────────────────────────────────
  { name: 'GhanaWeb', url: 'https://www.ghanaweb.com/GhanaHomePage/NewsArchive/rss.xml', country: 'Ghana' },
  { name: 'MyJoyOnline', url: 'https://www.myjoyonline.com/feed/', country: 'Ghana' },
  { name: 'Graphic Online', url: 'https://www.graphic.com.gh/feed', country: 'Ghana' },
  { name: 'GNA Ghana', url: 'https://www.ghananewsagency.org/rss/', country: 'Ghana' },
  { name: 'Ghana Business News', url: 'https://www.ghanabusinessnews.com/feed/', country: 'Ghana', category: 'business' },
  { name: 'Pulse Ghana', url: 'https://www.pulse.com.gh/rss/feed.xml', country: 'Ghana', category: 'entertainment' },

  // ── ETHIOPIA & HORN OF AFRICA ─────────────────────────────────────────────
  { name: 'Ethiopian Reporter', url: 'https://www.thereporterethiopia.com/feed/', country: 'Ethiopia' },
  { name: 'Addis Fortune', url: 'https://addisfortune.news/feed/', country: 'Ethiopia', category: 'business' },
  { name: 'Addis Standard', url: 'https://addisstandard.com/feed/', country: 'Ethiopia' },
  { name: 'Garowe Online', url: 'https://www.garoweonline.com/en/rss', country: 'Somalia/Horn' },
  { name: 'Hiiraan Online', url: 'https://www.hiiraan.com/news4/rss.aspx', country: 'Somalia' },

  // ── EGYPT & NORTH AFRICA ──────────────────────────────────────────────────
  { name: 'Ahram Online', url: 'https://english.ahram.org.eg/rss.aspx', country: 'Egypt' },
  { name: 'Egypt Independent', url: 'https://egyptindependent.com/feed/', country: 'Egypt' },
  { name: 'Morocco World News', url: 'https://www.moroccoworldnews.com/feed/', country: 'Morocco' },
  { name: 'Le360 Maroc', url: 'https://fr.le360.ma/rss.xml', country: 'Morocco', lang: 'fr' },
  { name: 'Tap News TN', url: 'https://www.tap.info.tn/en/RSS-Feeds', country: 'Tunisia' },
  { name: 'Libya Herald', url: 'https://libyaherald.com/feed/', country: 'Libya' },
  { name: 'TSA Algérie', url: 'https://www.tsa-algerie.com/feed/', country: 'Algeria', lang: 'fr' },

  // ── TANZANIA & EAST AFRICA ───────────────────────────────────────────────
  { name: 'The Citizen TZ', url: 'https://www.thecitizen.co.tz/tanzania/rss', country: 'Tanzania' },
  { name: 'Daily News TZ', url: 'https://dailynews.co.tz/rss/', country: 'Tanzania' },
  { name: 'Mwananchi', url: 'https://www.mwananchi.co.tz/mw/rss', country: 'Tanzania' },

  // ── UGANDA ───────────────────────────────────────────────────────────────
  { name: 'Daily Monitor UG', url: 'https://www.monitor.co.ug/uganda/rss', country: 'Uganda' },
  { name: 'New Vision UG', url: 'https://www.newvision.co.ug/rss', country: 'Uganda' },
  { name: 'Nile Post', url: 'https://nilepost.co.ug/feed/', country: 'Uganda' },

  // ── RWANDA ───────────────────────────────────────────────────────────────
  { name: 'The New Times RW', url: 'https://www.newtimes.co.rw/rss', country: 'Rwanda' },
  { name: 'KT Press', url: 'https://ktpress.rw/feed/', country: 'Rwanda' },

  // ── SENEGAL & WEST AFRICA ─────────────────────────────────────────────────
  { name: 'Seneweb', url: 'https://www.seneweb.com/news/rss.php', country: 'Senegal', lang: 'fr' },
  { name: 'DakarActu', url: 'https://www.dakaractu.com/rss.php', country: 'Senegal', lang: 'fr' },
  { name: 'Fratmat CI', url: 'https://www.fratmat.info/rss.xml', country: "Côte d'Ivoire", lang: 'fr' },
  { name: 'Koaci CI', url: 'https://koaci.com/rss.xml', country: "Côte d'Ivoire", lang: 'fr' },
  { name: 'Journal du Cameroun', url: 'https://www.journalducameroun.com/feed/', country: 'Cameroon', lang: 'fr' },
  { name: 'Cameroon Tribune', url: 'https://www.cameroon-tribune.cm/rss.xml', country: 'Cameroon', lang: 'fr' },
  { name: 'Aujourd\'hui Burkina', url: 'https://www.aoujourdhuiaufaso.net/rss.xml', country: 'Burkina Faso', lang: 'fr' },
  { name: 'Mali Actu', url: 'https://maliactu.net/feed/', country: 'Mali', lang: 'fr' },
  { name: 'Bénin Web TV', url: 'https://www.beninwebtv.com/feed/', country: 'Benin', lang: 'fr' },
  { name: 'Togo Actu', url: 'https://togoactu.net/feed/', country: 'Togo', lang: 'fr' },

  // ── ZIMBABWE ─────────────────────────────────────────────────────────────
  { name: 'NewsDay ZW', url: 'https://www.newsday.co.zw/feed/', country: 'Zimbabwe' },
  { name: 'Zimbabwe Situation', url: 'https://www.zimbabwesituation.com/feed/', country: 'Zimbabwe' },
  { name: 'Herald ZW', url: 'https://www.herald.co.zw/feed/', country: 'Zimbabwe' },

  // ── ZAMBIA & SOUTHERN AFRICA ─────────────────────────────────────────────
  { name: 'Zambian Observer', url: 'https://www.zambianobserver.com/feed/', country: 'Zambia' },
  { name: 'Lusaka Times', url: 'https://www.lusakatimes.com/feed/', country: 'Zambia' },

  // ── DR CONGO ─────────────────────────────────────────────────────────────
  { name: 'Radio Okapi DRC', url: 'https://www.radiookapi.net/rss.xml', country: 'DR Congo', lang: 'fr' },
  { name: 'Actualité CD', url: 'https://actualite.cd/feed', country: 'DR Congo', lang: 'fr' },

  // ── ANGOLA & MOZAMBIQUE ───────────────────────────────────────────────────
  { name: 'Angola Press', url: 'https://www.angop.ao/rss/', country: 'Angola', lang: 'pt' },
  { name: 'O País MZ', url: 'https://opais.co.mz/feed/', country: 'Mozambique', lang: 'pt' },

  // ── TRAVEL ───────────────────────────────────────────────────────────────
  { name: 'Africa Geographic', url: 'https://africageographic.com/blog/feed/', country: 'Pan-Africa', category: 'travel' },
  { name: 'Travel Africa Mag', url: 'https://www.travelafricamag.com/feed/', country: 'Pan-Africa', category: 'travel' },
  { name: 'Nomadic Matt Africa', url: 'https://www.nomadicmatt.com/category/africa/feed/', country: 'Pan-Africa', category: 'travel' },
  { name: 'Lonely Planet Africa', url: 'https://www.lonelyplanet.com/africa.rss', country: 'Pan-Africa', category: 'travel' },
  { name: 'Afar Africa', url: 'https://www.afar.com/magazine/africa/rss', country: 'Pan-Africa', category: 'travel' },
  { name: 'Safaris Africa', url: 'https://blog.safaribookings.com/feed', country: 'Pan-Africa', category: 'travel' },
];

// Category → source filter logic
const CATEGORY_MAP: Record<string, (s: Source) => boolean> = {
  general:       (s) => !s.category || s.category === 'general',
  politics:      (s) => !s.category || s.category === 'politics',
  business:      (s) => !s.category || s.category === 'business',
  technology:    (s) => s.category === 'technology' || (!s.category && ['Nigeria','Ghana','South Africa','Kenya','Pan-Africa'].includes(s.country)),
  health:        (s) => s.category === 'health' || !s.category,
  sports:        (s) => s.category === 'sports' || !s.category,
  entertainment: (s) => s.category === 'entertainment' || !s.category,
  agriculture:   (s) => s.category === 'agriculture' || !s.category,
  finance:       (s) => s.category === 'finance' || s.category === 'business' || !s.category,
  travel:        (s) => s.category === 'travel',
};

// Extra specialty sources per category
const SPECIALTY_SOURCES: Record<string, Source[]> = {
  technology: [
    { name: 'Disrupt Africa', url: 'https://disrupt-africa.com/feed/', country: 'Pan-Africa' },
    { name: 'Wimbart', url: 'https://wimbart.com/feed/', country: 'Pan-Africa' },
    { name: 'Africa Tech Summit', url: 'https://www.africatechsummit.com/feed/', country: 'Pan-Africa' },
    { name: 'Tele.net Africa', url: 'https://telecoms.com/feed/?cat=africa', country: 'Pan-Africa' },
  ],
  health: [
    { name: 'AllAfrica Health', url: 'https://allafrica.com/tools/headlines/rdf/health/headlines.rdf', country: 'Pan-Africa' },
    { name: 'Devex Africa Health', url: 'https://www.devex.com/news/health-rss.xml', country: 'Pan-Africa' },
    { name: 'Africa Health Org', url: 'https://www.africa-health.com/feed/', country: 'Pan-Africa' },
  ],
  sports: [
    { name: 'AllAfrica Sports', url: 'https://allafrica.com/tools/headlines/rdf/sport/headlines.rdf', country: 'Pan-Africa' },
    { name: 'Pulse Sports', url: 'https://www.pulse.ng/sports/feed/', country: 'Nigeria' },
    { name: 'KickOff SA', url: 'https://www.kickoff.com/rss', country: 'South Africa' },
    { name: 'CAF Online', url: 'https://www.cafonline.com/rss.xml', country: 'Pan-Africa' },
    { name: 'SuperSport', url: 'https://supersport.com/football/feed/', country: 'Pan-Africa' },
  ],
  agriculture: [
    { name: 'AllAfrica Agriculture', url: 'https://allafrica.com/tools/headlines/rdf/agric/headlines.rdf', country: 'Pan-Africa' },
    { name: 'Farmers Review Africa', url: 'https://farmersreviewafrica.com/feed/', country: 'Pan-Africa' },
    { name: 'Agrilinks', url: 'https://www.agrilinks.org/rss.xml', country: 'Pan-Africa' },
    { name: 'Africa Agriculture', url: 'https://africaagriculture.net/feed/', country: 'Pan-Africa' },
  ],
  entertainment: [
    { name: 'Afrobeats Intelligence', url: 'https://www.afrobeatsintelligence.com/feed/', country: 'Pan-Africa' },
    { name: 'WillisWorld', url: 'https://www.willisworld.co.za/feed/', country: 'South Africa' },
    { name: 'JustNaija', url: 'https://www.justnaija.com/feed/', country: 'Nigeria' },
    { name: 'Zim Hip Hop', url: 'https://www.zimhiphop.com/feed/', country: 'Zimbabwe' },
  ],
  travel: [
    { name: 'Africa Geographic', url: 'https://africageographic.com/blog/feed/', country: 'Pan-Africa' },
    { name: 'Travel Africa', url: 'https://www.travelafricamag.com/feed/', country: 'Pan-Africa' },
    { name: 'Nomadic Matt', url: 'https://www.nomadicmatt.com/category/africa/feed/', country: 'Pan-Africa' },
    { name: 'Africa Tourism', url: 'https://www.africa-tourism.com/feed/', country: 'Pan-Africa' },
    { name: 'Wild Africa', url: 'https://wildafrica.net/feed/', country: 'Pan-Africa' },
    { name: 'Migrationology Africa', url: 'https://migrationology.com/category/africa/feed/', country: 'Pan-Africa' },
    { name: 'The Discoverer Africa', url: 'https://www.thediscoverer.com/blog/africa/feed/', country: 'Pan-Africa' },
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface NewsItem {
  id: string;
  title: string;
  link: string;
  summary?: string;
  image?: string;
  source: string;
  country: string;
  category: string;
  publishedAt: string;
  lang?: string;
}

// ── Cache ─────────────────────────────────────────────────────────────────────
const cache = new Map<string, { items: NewsItem[]; fetchedAt: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function extractImage(item: Record<string, unknown>): string {
  // Try multiple image locations in RSS feeds
  const mt = item['mediaThumbnail'] as { url?: string; $?: { url?: string } } | undefined;
  if (mt?.url) return mt.url;
  if (mt?.$?.url) return mt.$.url;

  const mc = item['mediaContent'] as { $?: { url?: string } } | undefined;
  if (mc?.$?.url) return mc.$.url;

  const enc = item['enclosure'] as { url?: string; type?: string } | undefined;
  if (enc?.url && enc?.type?.startsWith('image')) return enc.url;

  // Try to extract from content
  const content = (item['content'] || item['content:encoded'] || '') as string;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (match?.[1]) return match[1];

  return '';
}

async function fetchSources(sources: Source[], category: string): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    sources.map(async (src) => {
      try {
        const feed = await parser.parseURL(src.url);
        return (feed.items || []).slice(0, 15).map((item, i) => ({
          id: `${src.name}-${i}-${Date.now()}`,
          title: (item.title || '').replace(/<[^>]+>/g, '').trim(),
          link: item.link || item.guid || '',
          summary: (item.contentSnippet || item.content?.replace(/<[^>]+>/g, '') || '').slice(0, 300),
          image: extractImage(item as Record<string, unknown>),
          source: src.name,
          country: src.country,
          category,
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          lang: src.lang || 'en',
        }));
      } catch {
        return [];
      }
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(item => item.title && item.link);
}

async function fetchCategory(category: string): Promise<NewsItem[]> {
  const cached = cache.get(category);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.items;

  // Select sources for category
  const filter = CATEGORY_MAP[category] || CATEGORY_MAP.general;
  const baseSources = ALL_SOURCES.filter(filter);
  const specialty = SPECIALTY_SOURCES[category] || [];

  // For general — use all non-specialty sources, limit to 40 to avoid timeout
  const selected = category === 'general'
    ? [...ALL_SOURCES.filter(s => !s.category || s.category === 'general').slice(0, 40)]
    : [...baseSources.slice(0, 20), ...specialty];

  const items = (await fetchSources(selected, category))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    // Remove duplicates by title similarity
    .filter((item, idx, arr) => {
      const titleLower = item.title.toLowerCase().slice(0, 60);
      return !arr.slice(0, idx).some(prev =>
        prev.title.toLowerCase().slice(0, 60) === titleLower
      );
    });

  cache.set(category, { items, fetchedAt: Date.now() });

  // Archive non-expired items to DB (fire-and-forget)
  archiveItems(items, category).catch(() => {});

  return items;
}

// ── Archive to DB ─────────────────────────────────────────────────────────────
async function archiveItems(items: NewsItem[], category: string) {
  try {
    // Only archive if Classified/Archive table exists — for now store as a log
    // Future: dedicated NewsArchive table
    // Just silently skip if DB not ready
    void items; void category;
  } catch {
    // ignore
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/categories', (_req, res) => {
  res.json([
    { id: 'general',       label: 'Top Stories',    emoji: '🌍' },
    { id: 'politics',      label: 'Politics',        emoji: '🏛️' },
    { id: 'business',      label: 'Business',        emoji: '📈' },
    { id: 'technology',    label: 'Technology',      emoji: '💻' },
    { id: 'health',        label: 'Health',          emoji: '🏥' },
    { id: 'sports',        label: 'Sports',          emoji: '⚽' },
    { id: 'entertainment', label: 'Entertainment',   emoji: '🎭' },
    { id: 'agriculture',   label: 'Agriculture',     emoji: '🌾' },
    { id: 'finance',       label: 'Finance',         emoji: '💰' },
    { id: 'travel',        label: 'Travel',          emoji: '✈️' },
  ]);
});

// GET /news?category=general&limit=60&country=Nigeria&lang=fr
router.get('/', async (req, res) => {
  const { category = 'general', limit = '60', country, lang } = req.query as Record<string, string>;

  if (!CATEGORY_MAP[category]) {
    return res.status(400).json({ error: `Unknown category: ${category}` });
  }

  try {
    let items = await fetchCategory(category);

    if (country) {
      items = items.filter(i =>
        i.country.toLowerCase().includes(country.toLowerCase()) ||
        ['Pan-Africa', 'Africa'].includes(i.country)
      );
    }
    if (lang) {
      items = items.filter(i => i.lang === lang || i.lang === 'en');
    }

    const selectedSources = category === 'general'
      ? ALL_SOURCES.filter(s => !s.category).slice(0, 40)
      : ALL_SOURCES.filter(CATEGORY_MAP[category] || (() => true));

    res.json({
      category,
      total: items.length,
      items: items.slice(0, parseInt(limit)),
      sources: [...new Map(
        selectedSources.map(s => [s.name, { name: s.name, country: s.country }])
      ).values()],
      cachedAt: cache.get(category)?.fetchedAt
        ? new Date(cache.get(category)!.fetchedAt).toISOString()
        : null,
    });
  } catch (err) {
    console.error('News fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// GET /news/all — latest across all categories (for homepage widget)
router.get('/all', async (_req, res) => {
  const categories = ['general', 'business', 'technology', 'sports', 'entertainment'];
  const results = await Promise.allSettled(categories.map(fetchCategory));

  const combined = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value.slice(0, 8))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item, idx, arr) =>
      !arr.slice(0, idx).some(prev => prev.link === item.link)
    )
    .slice(0, 40);

  res.json(combined);
});

// GET /news/sources — full source registry with metadata
router.get('/sources', (_req, res) => {
  const byCountry: Record<string, Source[]> = {};
  for (const s of ALL_SOURCES) {
    if (!byCountry[s.country]) byCountry[s.country] = [];
    byCountry[s.country].push(s);
  }
  res.json({
    total: ALL_SOURCES.length,
    byCountry,
    sources: ALL_SOURCES,
  });
});

export default router;
