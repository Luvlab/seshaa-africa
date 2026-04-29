import { Router } from 'express';
import Parser from 'rss-parser';

const router = Router();
const parser = new Parser({ timeout: 8000, headers: { 'User-Agent': 'Seshaa/2.0 RSS Reader' } });

// ——— African news sources by category ———
const SOURCES: Record<string, { name: string; url: string; country: string; lang?: string }[]> = {
  general: [
    { name: 'AllAfrica', url: 'https://allafrica.com/tools/headlines/rdf/africa/headlines.rdf', country: 'Africa' },
    { name: 'BBC Africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', country: 'Africa' },
    { name: 'Al Jazeera Africa', url: 'https://www.aljazeera.com/xml/rss/all.xml', country: 'Africa' },
    { name: 'The Africa Report', url: 'https://www.theafricareport.com/feed/', country: 'Africa' },
  ],
  politics: [
    { name: 'Punch Nigeria', url: 'https://punchng.com/topics/politics/feed/', country: 'Nigeria' },
    { name: 'The Guardian Nigeria', url: 'https://guardian.ng/category/news/politics/feed/', country: 'Nigeria' },
    { name: 'Daily Nation Kenya', url: 'https://nation.africa/kenya/news/politics/-/1190332', country: 'Kenya' },
    { name: 'Mail & Guardian SA', url: 'https://mg.co.za/feed/', country: 'South Africa' },
    { name: 'AllAfrica Politics', url: 'https://allafrica.com/tools/headlines/rdf/politics/headlines.rdf', country: 'Africa' },
  ],
  business: [
    { name: 'BusinessDay Nigeria', url: 'https://businessday.ng/feed/', country: 'Nigeria' },
    { name: 'The East African', url: 'https://www.theeastafrican.co.ke/tea/business/-/2560604', country: 'East Africa' },
    { name: 'AllAfrica Business', url: 'https://allafrica.com/tools/headlines/rdf/business/headlines.rdf', country: 'Africa' },
    { name: 'African Business', url: 'https://african.business/feed/', country: 'Africa' },
    { name: 'Quartz Africa', url: 'https://qz.com/africa/rss', country: 'Africa' },
  ],
  technology: [
    { name: 'TechCabal', url: 'https://techcabal.com/feed/', country: 'Nigeria' },
    { name: 'Disrupt Africa', url: 'https://disrupt-africa.com/feed/', country: 'Africa' },
    { name: 'IT Web Africa', url: 'https://itweb.africa/rss', country: 'South Africa' },
    { name: 'TechPoint Africa', url: 'https://techpoint.africa/feed/', country: 'Nigeria' },
    { name: 'Technext', url: 'https://technext24.com/feed/', country: 'Africa' },
  ],
  health: [
    { name: 'AllAfrica Health', url: 'https://allafrica.com/tools/headlines/rdf/health/headlines.rdf', country: 'Africa' },
    { name: 'Health-e News', url: 'https://health-e.org.za/feed/', country: 'South Africa' },
    { name: 'STAT Africa', url: 'https://www.statnews.com/feed/', country: 'Africa' },
  ],
  sports: [
    { name: 'AllAfrica Sports', url: 'https://allafrica.com/tools/headlines/rdf/sport/headlines.rdf', country: 'Africa' },
    { name: 'Goal.com Africa', url: 'https://www.goal.com/feeds/rss/news?country=ng', country: 'Africa' },
    { name: 'SuperSport', url: 'https://supersport.com/football/news/rss', country: 'South Africa' },
    { name: 'Punch Sports', url: 'https://punchng.com/topics/sports/feed/', country: 'Nigeria' },
  ],
  entertainment: [
    { name: 'NotJustOk', url: 'https://www.notjustok.com/feed/', country: 'Nigeria' },
    { name: 'Pulse Nigeria', url: 'https://www.pulse.ng/entertainment/feed/', country: 'Nigeria' },
    { name: 'BN', url: 'https://www.bellanaija.com/feed/', country: 'Nigeria' },
    { name: 'Briefly SA', url: 'https://briefly.co.za/rss', country: 'South Africa' },
  ],
  agriculture: [
    { name: 'AllAfrica Agriculture', url: 'https://allafrica.com/tools/headlines/rdf/agric/headlines.rdf', country: 'Africa' },
    { name: 'Agrilinks', url: 'https://www.agrilinks.org/rss.xml', country: 'Africa' },
    { name: 'Farmers Review Africa', url: 'https://farmersreviewafrica.com/feed/', country: 'Africa' },
  ],
  finance: [
    { name: 'Nairametrics', url: 'https://nairametrics.com/feed/', country: 'Nigeria' },
    { name: 'AllAfrica Economy', url: 'https://allafrica.com/tools/headlines/rdf/economy/headlines.rdf', country: 'Africa' },
    { name: 'MMA Africa', url: 'https://mma.africa/feed/', country: 'Africa' },
  ],
};

// Cache: category → { items, fetchedAt }
const cache = new Map<string, { items: NewsItem[]; fetchedAt: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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
}

async function fetchCategory(category: string): Promise<NewsItem[]> {
  const cached = cache.get(category);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.items;

  const sources = SOURCES[category] || SOURCES.general;
  const results = await Promise.allSettled(
    sources.map(async src => {
      const feed = await parser.parseURL(src.url);
      return (feed.items || []).slice(0, 10).map((item, i) => ({
        id: `${category}-${src.name}-${i}`,
        title: item.title || '',
        link: item.link || item.guid || '',
        summary: item.contentSnippet || item.content?.replace(/<[^>]+>/g, '').slice(0, 200) || '',
        image: (item as Record<string, unknown>)['media:thumbnail']
          ? ((item as Record<string, unknown>)['media:thumbnail'] as { url: string })?.url
          : (item.enclosure?.url || ''),
        source: src.name,
        country: src.country,
        category,
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
      }));
    })
  );

  const items: NewsItem[] = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r as PromiseFulfilledResult<NewsItem[]>).value)
    .filter(item => item.title && item.link)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  cache.set(category, { items, fetchedAt: Date.now() });
  return items;
}

// GET /news — list categories
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
  ]);
});

// GET /news?category=general&limit=20
router.get('/', async (req, res) => {
  const { category = 'general', limit = '20', country } = req.query as Record<string, string>;

  if (!SOURCES[category]) return res.status(400).json({ error: 'Unknown category' });

  const items = await fetchCategory(category);
  const filtered = country
    ? items.filter(i => i.country.toLowerCase().includes(country.toLowerCase()) || i.country === 'Africa')
    : items;

  res.json({
    category,
    total: filtered.length,
    items: filtered.slice(0, parseInt(limit)),
    sources: SOURCES[category].map(s => ({ name: s.name, country: s.country })),
    cachedAt: cache.get(category)?.fetchedAt ? new Date(cache.get(category)!.fetchedAt).toISOString() : null,
  });
});

// GET /news/all — latest across all categories (for homepage widget)
router.get('/all', async (_req, res) => {
  const topCategories = ['general', 'business', 'technology', 'sports'];
  const results = await Promise.allSettled(topCategories.map(fetchCategory));

  const combined = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value.slice(0, 5))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 30);

  res.json(combined);
});

export default router;
