/**
 * Seshaa Radio
 * ─ Live:      RadioBrowser open API — African station streams
 * ─ Discovery: Jamendo CC African music (cached 1 h)
 * ─ Archive:   Internet Archive — royalty-free African music, oldest to newest
 * ─ Community: user-submitted tracks (URL only — no audio stored on platform)
 */
import { Router } from 'express';
import https from 'https';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID || 'b6747d04';

// ── All 54 African country codes ─────────────────────────────────────────────
const AFRICAN_COUNTRY_CODES = [
  'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ',
  'EG','GQ','ER','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW',
  'ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SL','SO','ZA','SS',
  'SD','SZ','TZ','TG','TN','UG','ZM','ZW',
];

// ── African music tag groups ──────────────────────────────────────────────────
export const AFRICAN_TAGS = [
  { id: 'afrobeats',  label: 'Afrobeats',   emoji: '🎵' },
  { id: 'afropop',    label: 'Afropop',     emoji: '🎤' },
  { id: 'afrobeat',   label: 'Afrobeat',    emoji: '🥁' },
  { id: 'afrofusion', label: 'Afrofusion',  emoji: '🎸' },
  { id: 'highlife',   label: 'Highlife',    emoji: '🎷' },
  { id: 'afrojazz',   label: 'Afro Jazz',   emoji: '🎺' },
  { id: 'afrohouse',  label: 'Afro House',  emoji: '🎧' },
  { id: 'amapiano',   label: 'Amapiano',    emoji: '🎹' },
  { id: 'soukous',    label: 'Soukous',     emoji: '💃' },
  { id: 'kizomba',    label: 'Kizomba',     emoji: '🌹' },
  { id: 'afro',       label: 'Afro',        emoji: '🌍' },
  { id: 'world',      label: 'World Music', emoji: '🌐' },
];

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface JamendoTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  audio: string;
  audioDownload: string;
  duration: number;
  tags: string[];
  shareUrl: string;
  source: 'jamendo';
  year?: number;
}

export interface LiveStation {
  id: string;
  name: string;
  country: string;        // ISO code
  countryName: string;
  streamUrl: string;
  favicon?: string;
  tags: string;           // comma-separated genres
  codec: string;
  bitrate: number;
  language?: string;
  homepage?: string;
  votes?: number;
}

export interface ArchiveTrack {
  id: string;
  name: string;
  artist: string;
  album?: string;
  image: string;
  audio: string;
  audioDownload?: string;
  duration?: number;
  year?: number;
  shareUrl: string;
  source: 'archive';
  tags?: string[];
  subjects?: string[];
}

// ── Generic HTTPS GET with redirect + timeout ────────────────────────────────
function httpsGet(url: string, timeoutMs = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Seshaa/2.0 (+https://seshaa.africa)' },
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        req.destroy();
        return resolve(httpsGet(res.headers.location, timeoutMs));
      }
      let raw = '';
      res.on('data', (c: Buffer | string) => { raw += c.toString(); });
      res.on('end', () => resolve(raw));
      res.on('error', reject);
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// ── In-memory caches ──────────────────────────────────────────────────────────
const jamCache        = new Map<string, { tracks: JamendoTrack[]; expires: number }>();
const stationsCache   = new Map<string, { stations: LiveStation[]; expires: number }>();
const archiveSearch   = new Map<string, { data: { total: number; tracks: ArchiveTrack[] }; expires: number }>();
const archiveMeta     = new Map<string, { data: { audioUrl: string; duration: number; image: string } | null; expires: number }>();

// ── Jamendo fetch ─────────────────────────────────────────────────────────────
function jamendoFetch(tag: string, limit = 50): Promise<JamendoTrack[]> {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({
      client_id:   CLIENT_ID,
      format:      'json',
      limit:       String(Math.min(limit, 100)),
      tags:        tag,
      audioformat: 'mp32',
      include:     'musicinfo',
      imagesize:   '200',
      order:       'popularity_total',
    });
    const url = `https://api.jamendo.com/v3.0/tracks/?${qs}`;
    https.get(url, { headers: { 'User-Agent': 'Seshaa/2.0 (+https://seshaa.africa)' } }, (res) => {
      let raw = '';
      res.on('data', (c: string) => { raw += c; });
      res.on('end', () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const json = JSON.parse(raw) as { results?: any[] };
          const tracks: JamendoTrack[] = (json.results ?? [])
            .filter((t: { audio?: string }) => t.audio)
            .map((t: {
              id: string; name: string; artist_name: string; album_name: string;
              image?: string; album_image?: string; audio: string;
              audiodownload?: string; duration: number; shareurl?: string;
              releasedate?: string;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              musicinfo?: { tags?: { genres?: string[]; instruments?: string[] } };
            }) => ({
              id:            `jam_${t.id}`,
              name:          t.name,
              artist:        t.artist_name,
              album:         t.album_name ?? '',
              image:         t.image ?? t.album_image ?? '',
              audio:         t.audio,
              audioDownload: t.audiodownload ?? t.audio,
              duration:      t.duration ?? 0,
              year:          t.releasedate ? parseInt(t.releasedate.slice(0, 4)) : undefined,
              tags:          [
                ...(t.musicinfo?.tags?.genres ?? []),
                ...(t.musicinfo?.tags?.instruments ?? []),
              ],
              shareUrl:      t.shareurl ?? '',
              source:        'jamendo' as const,
            }));
          resolve(tracks);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ── RadioBrowser: live African stations ───────────────────────────────────────
async function fetchLiveStations(limit = 300): Promise<LiveStation[]> {
  const key = `stations_${limit}`;
  const hit = stationsCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.stations;

  // Use one of RadioBrowser's distributed servers
  const servers = ['de1', 'at1', 'nl1', 'fr1'];
  const host = servers[Math.floor(Math.random() * servers.length)];
  const qs = new URLSearchParams({
    countrycodes: AFRICAN_COUNTRY_CODES.join(','),
    hidebroken:   'true',
    order:        'clickcount',
    reverse:      'true',
    limit:        String(limit),
  });

  try {
    const raw = await httpsGet(`https://${host}.api.radio-browser.info/json/stations/search?${qs}`, 12_000);
    const data = JSON.parse(raw) as Array<{
      stationuuid: string; name: string;
      url: string; url_resolved: string;
      country: string; countrycode: string;
      favicon: string; tags: string;
      language: string; codec: string;
      bitrate: number; homepage: string; votes: number;
    }>;

    const stations: LiveStation[] = data
      .filter(s => (s.url_resolved || s.url) && s.name?.trim())
      .map(s => ({
        id:          s.stationuuid,
        name:        s.name.trim(),
        country:     (s.countrycode || '').toUpperCase(),
        countryName: s.country,
        streamUrl:   s.url_resolved || s.url,
        favicon:     s.favicon || undefined,
        tags:        s.tags || '',
        codec:       s.codec || 'MP3',
        bitrate:     s.bitrate || 0,
        language:    s.language || undefined,
        homepage:    s.homepage || undefined,
        votes:       s.votes || 0,
      }));

    stationsCache.set(key, { stations, expires: Date.now() + 6 * 60 * 60_000 }); // 6 h
    return stations;
  } catch (err) {
    console.error('[radio] RadioBrowser error:', err);
    return stationsCache.get(key)?.stations ?? [];
  }
}

// ── Internet Archive: single item metadata ────────────────────────────────────
async function fetchArchiveMeta(identifier: string): Promise<{
  audioUrl: string; duration: number; image: string;
} | null> {
  const hit = archiveMeta.get(identifier);
  if (hit && hit.expires > Date.now()) return hit.data;

  try {
    const raw = await httpsGet(`https://archive.org/metadata/${identifier}`, 6_000);
    const meta = JSON.parse(raw) as {
      files?: Array<{ name: string; format: string; length?: string }>;
    };

    const files = meta.files ?? [];
    // Prefer higher-quality MP3 formats
    const fmtPriority = ['VBR MP3', '128Kbps MP3', '64Kbps MP3', 'MP3'];
    let hit2 = files.find(f => fmtPriority.includes(f.format) && /\.mp3$/i.test(f.name));
    if (!hit2) hit2 = files.find(f => /\.mp3$/i.test(f.name));
    if (!hit2) hit2 = files.find(f => /\.(ogg|oga)$/i.test(f.name));

    if (!hit2) {
      archiveMeta.set(identifier, { data: null, expires: Date.now() + 24 * 60 * 60_000 });
      return null;
    }

    const result = {
      audioUrl: `https://archive.org/download/${identifier}/${encodeURIComponent(hit2.name)}`,
      duration: hit2.length ? Math.round(parseFloat(hit2.length)) : 0,
      image:    `https://archive.org/services/img/${identifier}`,
    };
    archiveMeta.set(identifier, { data: result, expires: Date.now() + 24 * 60 * 60_000 });
    return result;
  } catch {
    archiveMeta.set(identifier, { data: null, expires: Date.now() + 60 * 60_000 });
    return null;
  }
}

// ── Internet Archive: search African music, oldest first ─────────────────────
const IA_SUBJECT_QUERY = [
  '"african music"', '"African popular music"', 'highlife', 'soukous',
  'afrobeat', 'afropop', 'makossa', 'mbalax', 'benga', 'marabi', 'kwela',
  'mbaqanga', '"palm wine music"', 'sungura', 'taarab', '"juju music"',
  'kizomba', '"afro jazz"', '"west african music"', '"east african music"',
  '"south african music"', '"congolese music"', '"ethiopian music"',
  '"highlife music"', '"afrobeat music"',
].join(' OR ');

async function fetchArchive(params: {
  genre?: string;
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
  page?: number;
}): Promise<{ total: number; tracks: ArchiveTrack[] }> {
  const { genre, yearFrom = 1900, yearTo = new Date().getFullYear(), limit = 20, page = 1 } = params;

  const subjectPart = genre
    ? `(subject:(${genre}) OR title:(${genre}) OR creator:(${genre}))`
    : `(subject:(africa OR african OR ${IA_SUBJECT_QUERY}))`;
  const q = `${subjectPart} AND mediatype:audio AND year:[${yearFrom} TO ${yearTo}]`;

  const cacheKey = `ia_${q}_${limit}_${page}`;
  const hit = archiveSearch.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.data;

  try {
    const flFields = ['identifier', 'title', 'creator', 'year', 'date', 'subject', 'description']
      .map(f => `fl[]=${encodeURIComponent(f)}`).join('&');
    const qs = new URLSearchParams({
      q,
      output: 'json',
      rows:   String(Math.min(limit * 4, 80)), // overfetch — many items lack audio
      start:  String((page - 1) * limit),
    });
    const url = `https://archive.org/advancedsearch.php?${qs}&${flFields}&sort[]=year+asc&sort[]=downloads+desc`;
    const raw = await httpsGet(url, 12_000);
    const json = JSON.parse(raw) as {
      response: {
        numFound: number;
        docs: Array<{
          identifier: string;
          title?: string | string[];
          creator?: string | string[];
          year?: string | number;
          date?: string;
          subject?: string | string[];
        }>;
      };
    };

    const docs   = json.response?.docs ?? [];
    const total  = json.response?.numFound ?? 0;

    // Fetch metadata for all candidates in parallel (capped at 60)
    const candidates = docs.slice(0, Math.min(limit * 4, 60));
    const settled = await Promise.allSettled(
      candidates.map(async (doc) => {
        const audio = await fetchArchiveMeta(doc.identifier);
        if (!audio) return null;

        const rawTitle   = doc.title;
        const rawCreator = doc.creator;
        const title   = Array.isArray(rawTitle)   ? rawTitle[0]   : rawTitle   ?? 'Unknown Title';
        const creator = Array.isArray(rawCreator) ? rawCreator[0] : rawCreator ?? 'Unknown Artist';
        const yearRaw = doc.year ?? doc.date?.slice(0, 4) ?? '';
        const year    = yearRaw ? parseInt(String(yearRaw), 10) : undefined;
        const subjects = Array.isArray(doc.subject) ? doc.subject : doc.subject ? [doc.subject] : [];

        return {
          id:           `ia_${doc.identifier}`,
          name:         String(title).slice(0, 200),
          artist:       String(creator).slice(0, 200),
          image:        audio.image,
          audio:        audio.audioUrl,
          audioDownload: audio.audioUrl,
          duration:     audio.duration,
          year:         Number.isFinite(year) ? year : undefined,
          shareUrl:     `https://archive.org/details/${doc.identifier}`,
          source:       'archive' as const,
          subjects:     subjects.slice(0, 8),
          tags:         subjects.slice(0, 5),
        } as ArchiveTrack;
      })
    );

    const tracks: ArchiveTrack[] = settled
      .filter((r): r is PromiseFulfilledResult<ArchiveTrack> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)
      .slice(0, limit);

    const data = { total, tracks };
    archiveSearch.set(cacheKey, { data, expires: Date.now() + 6 * 60 * 60_000 }); // 6 h
    return data;
  } catch (err) {
    console.error('[radio] IA fetch error:', err);
    return { total: 0, tracks: [] };
  }
}

// ── GET /radio/tags ───────────────────────────────────────────────────────────
router.get('/tags', (_req, res) => {
  res.json(AFRICAN_TAGS);
});

// ── GET /radio/tracks?tag=afrobeats&limit=50 ─────────────────────────────────
router.get('/tracks', async (req, res) => {
  const tag   = String(req.query.tag   ?? 'afrobeats');
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 100);
  const key   = `${tag}::${limit}`;

  const hit = jamCache.get(key);
  if (hit && hit.expires > Date.now()) return res.json(hit.tracks);

  try {
    const tracks = await jamendoFetch(tag, limit);
    jamCache.set(key, { tracks, expires: Date.now() + 60 * 60_000 }); // 1 h
    return res.json(tracks);
  } catch (err) {
    console.error('[radio] Jamendo fetch error:', err);
    const stale = jamCache.get(key);
    if (stale) return res.json(stale.tracks);
    return res.status(502).json({ error: 'Could not load tracks' });
  }
});

// ── GET /radio/stations?limit=200 ────────────────────────────────────────────
router.get('/stations', async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '300'), 10) || 300, 500);
  try {
    const stations = await fetchLiveStations(limit);
    res.json(stations);
  } catch (err) {
    console.error('[radio] /stations error:', err);
    res.status(502).json({ error: 'Could not load stations' });
  }
});

// ── GET /radio/archive?genre=highlife&year_from=1950&year_to=1970&page=1 ─────
router.get('/archive', async (req, res) => {
  const genre    = req.query.genre     ? String(req.query.genre)    : undefined;
  const yearFrom = req.query.year_from ? parseInt(String(req.query.year_from), 10) : 1900;
  const yearTo   = req.query.year_to   ? parseInt(String(req.query.year_to),   10) : new Date().getFullYear();
  const limit    = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 40);
  const page     = Math.max(parseInt(String(req.query.page  ?? '1'),  10) || 1,  1);

  try {
    const result = await fetchArchive({ genre, yearFrom, yearTo, limit, page });
    res.json(result);
  } catch (err) {
    console.error('[radio] /archive error:', err);
    res.status(502).json({ error: 'Could not load archive tracks' });
  }
});

// ── GET /radio/community?genre=afrobeats&country=NG ──────────────────────────
router.get('/community', async (req, res) => {
  const genre   = req.query.genre   ? String(req.query.genre)   : undefined;
  const country = req.query.country ? String(req.query.country) : undefined;
  const limit   = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 100);
  const page    = Math.max(parseInt(String(req.query.page  ?? '1'),  10) || 1,  1);

  try {
    const where = {
      approved: true,
      ...(genre   ? { genre }   : {}),
      ...(country ? { country } : {}),
    };
    const [total, tracks] = await Promise.all([
      prisma.radioTrack.count({ where }),
      prisma.radioTrack.findMany({
        where,
        orderBy: { playCount: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: { submittedBy: { select: { id: true, name: true, avatarUrl: true } } },
      }),
    ]);
    res.json({ total, page, tracks });
  } catch (err) {
    console.error('[radio] community fetch error:', err);
    res.status(500).json({ error: 'Could not load community tracks' });
  }
});

// ── POST /radio/submit ────────────────────────────────────────────────────────
router.post('/submit', requireAuth, async (req: AuthRequest, res) => {
  const { title, artist, audioUrl, imageUrl, country, genre, album, duration, ownerRights } = req.body;
  if (!title || !artist || !audioUrl)
    return res.status(400).json({ error: 'title, artist and audioUrl are required' });
  if (!ownerRights)
    return res.status(400).json({ error: 'You must confirm you own or are licensed to share this track' });
  try { new URL(audioUrl); } catch { return res.status(400).json({ error: 'audioUrl must be a valid URL' }); }

  try {
    const track = await prisma.radioTrack.create({
      data: {
        title, artist, audioUrl,
        imageUrl:    imageUrl || null,
        country:     country  || null,
        genre:       genre    || null,
        album:       album    || null,
        duration:    duration ? parseInt(duration) : null,
        ownerRights: true,
        approved:    false,
        submittedById: req.user!.id,
      },
    });
    res.status(201).json(track);
  } catch (err) {
    console.error('[radio] submit error:', err);
    res.status(500).json({ error: 'Could not submit track' });
  }
});

// ── POST /radio/:id/play ──────────────────────────────────────────────────────
router.post('/:id/play', async (req, res) => {
  const { id } = req.params;
  if (id.startsWith('jam_') || id.startsWith('ia_') || id.startsWith('rb_'))
    return res.json({ ok: true });
  try {
    await prisma.radioTrack.update({ where: { id }, data: { playCount: { increment: 1 } } });
    res.json({ ok: true });
  } catch { res.json({ ok: true }); }
});

// ── Admin helpers ─────────────────────────────────────────────────────────────
function adminOnly(req: AuthRequest, res: import('express').Response, next: () => void) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  next();
}

router.get('/admin/pending', requireAuth, adminOnly, async (_req, res) => {
  const tracks = await prisma.radioTrack.findMany({
    where: { approved: false },
    orderBy: { createdAt: 'asc' },
    include: { submittedBy: { select: { id: true, name: true, email: true } } },
  });
  res.json(tracks);
});

router.patch('/admin/:id/approve', requireAuth, adminOnly, async (req, res) => {
  const track = await prisma.radioTrack.update({
    where: { id: String(req.params.id) },
    data: { approved: true },
  });
  res.json(track);
});

router.delete('/admin/:id', requireAuth, adminOnly, async (req, res) => {
  await prisma.radioTrack.delete({ where: { id: String(req.params.id) } });
  res.json({ ok: true });
});

// ── GET /radio/featured — tracks currently featured on home page ──────────────
router.get('/featured', async (_req, res) => {
  const now = new Date();
  const tracks = await prisma.radioTrack.findMany({
    where: {
      approved: true,
      featured: true,
      OR: [{ featuredUntil: null }, { featuredUntil: { gte: now } }],
    },
    orderBy: { playCount: 'desc' },
    take: 20,
  });
  res.json(tracks);
});

// ── POST /radio/:id/feature-request — request to feature a track ─────────────
router.post('/:id/feature-request', requireAuth, async (req: AuthRequest, res) => {
  const trackId = String(req.params.id);
  const track = await prisma.radioTrack.findUnique({ where: { id: trackId } });
  if (!track) return res.status(404).json({ error: 'Track not found.' });
  if (!track.approved) return res.status(400).json({ error: 'Track must be approved before featuring.' });

  const { weeks = 1, paymentRef } = req.body as { weeks?: number; paymentRef?: string };
  const priceUSD = (weeks || 1) * 10;

  const req_ = await prisma.trackFeatureRequest.create({
    data: {
      trackId,
      userId: req.user!.id,
      weeks: weeks || 1,
      priceUSD,
      paymentRef: paymentRef || null,
    },
  });
  res.status(201).json(req_);
});

// ── Admin: list all feature requests ─────────────────────────────────────────
router.get('/admin/feature-requests', requireAuth, adminOnly, async (_req, res) => {
  const requests = await prisma.trackFeatureRequest.findMany({
    include: { track: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(requests);
});

// ── Admin: approve/reject a feature request ───────────────────────────────────
router.patch('/admin/feature-requests/:id', requireAuth, adminOnly, async (req, res) => {
  const { status, adminNote } = req.body as { status: string; adminNote?: string };
  const fr = await prisma.trackFeatureRequest.update({
    where: { id: String(req.params.id) },
    data: { status: status as never, adminNote },
  });

  if (status === 'APPROVED') {
    const weeks = fr.weeks;
    const until = new Date();
    until.setDate(until.getDate() + weeks * 7);
    await prisma.radioTrack.update({
      where: { id: fr.trackId },
      data: { featured: true, featuredUntil: until },
    });
  } else if (status === 'REJECTED') {
    await prisma.radioTrack.update({
      where: { id: fr.trackId },
      data: { featured: false },
    });
  }

  res.json(fr);
});

export default router;
