/**
 * Seshaa Radio
 * ─ Discovery: Jamendo CC African music (cached 1 h)
 * ─ Community: user-submitted tracks (URL only — no audio stored on platform)
 *
 * JAMENDO_CLIENT_ID env var overrides the public demo key.
 */
import { Router } from 'express';
import https from 'https';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID || 'b6747d04';

// ── African music tag groups ──────────────────────────────────────────────────
export const AFRICAN_TAGS = [
  { id: 'afrobeats',  label: 'Afrobeats',  emoji: '🎵' },
  { id: 'afropop',    label: 'Afropop',    emoji: '🎤' },
  { id: 'afrobeat',   label: 'Afrobeat',   emoji: '🥁' },
  { id: 'afrofusion', label: 'Afrofusion', emoji: '🎸' },
  { id: 'highlife',   label: 'Highlife',   emoji: '🎷' },
  { id: 'afrojazz',   label: 'Afro Jazz',  emoji: '🎺' },
  { id: 'afrohouse',  label: 'Afro House', emoji: '🎧' },
  { id: 'amapiano',   label: 'Amapiano',   emoji: '🎹' },
  { id: 'soukous',    label: 'Soukous',    emoji: '💃' },
  { id: 'kizomba',    label: 'Kizomba',    emoji: '🌹' },
  { id: 'afro',       label: 'Afro',       emoji: '🌍' },
  { id: 'world',      label: 'World Music',emoji: '🌐' },
];

// ── Jamendo track shape ───────────────────────────────────────────────────────
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
}

// ── In-memory cache: tag → { tracks, expires } ───────────────────────────────
const jamCache = new Map<string, { tracks: JamendoTrack[]; expires: number }>();

// ── Fetch from Jamendo API ────────────────────────────────────────────────────
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

// ── GET /radio/tags ───────────────────────────────────────────────────────────
router.get('/tags', (_req, res) => {
  res.json(AFRICAN_TAGS);
});

// ── GET /radio/tracks?tag=afrobeats&limit=50 ─────────────────────────────────
// Returns Jamendo CC tracks for the given genre tag
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

// ── GET /radio/community?genre=afrobeats&country=NG ──────────────────────────
// Returns approved user-submitted tracks
router.get('/community', async (req, res) => {
  const genre   = req.query.genre   ? String(req.query.genre)   : undefined;
  const country = req.query.country ? String(req.query.country) : undefined;
  const limit   = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 100);
  const page    = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);

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

// ── POST /radio/submit — authenticated, submit a track URL ───────────────────
router.post('/submit', requireAuth, async (req: AuthRequest, res) => {
  const { title, artist, audioUrl, imageUrl, country, genre, album, duration, ownerRights } = req.body;
  if (!title || !artist || !audioUrl) {
    return res.status(400).json({ error: 'title, artist and audioUrl are required' });
  }
  if (!ownerRights) {
    return res.status(400).json({ error: 'You must confirm you own or are licensed to share this track' });
  }
  // basic URL sanity check
  try { new URL(audioUrl); } catch { return res.status(400).json({ error: 'audioUrl must be a valid URL' }); }

  try {
    const track = await prisma.radioTrack.create({
      data: {
        title,
        artist,
        audioUrl,
        imageUrl: imageUrl || null,
        country: country || null,
        genre: genre || null,
        album: album || null,
        duration: duration ? parseInt(duration) : null,
        ownerRights: true,
        approved: false,        // requires admin approval
        submittedById: req.user!.id,
      },
    });
    res.status(201).json(track);
  } catch (err) {
    console.error('[radio] submit error:', err);
    res.status(500).json({ error: 'Could not submit track' });
  }
});

// ── POST /radio/:id/play — increment play count (no auth needed) ─────────────
router.post('/:id/play', async (req, res) => {
  const { id } = req.params;
  // Only count community tracks (prefix "jam_" are Jamendo, skip DB)
  if (id.startsWith('jam_')) return res.json({ ok: true });
  try {
    await prisma.radioTrack.update({ where: { id }, data: { playCount: { increment: 1 } } });
    res.json({ ok: true });
  } catch { res.json({ ok: true }); } // silently ignore not-found
});

// ── ADMIN helpers ─────────────────────────────────────────────────────────────
function adminOnly(req: AuthRequest, res: import('express').Response, next: () => void) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ── ADMIN: GET /radio/admin/pending ──────────────────────────────────────────
router.get('/admin/pending', requireAuth, adminOnly, async (_req, res) => {
  const tracks = await prisma.radioTrack.findMany({
    where: { approved: false },
    orderBy: { createdAt: 'asc' },
    include: { submittedBy: { select: { id: true, name: true, email: true } } },
  });
  res.json(tracks);
});

// ── ADMIN: PATCH /radio/admin/:id/approve ────────────────────────────────────
router.patch('/admin/:id/approve', requireAuth, adminOnly, async (req, res) => {
  const track = await prisma.radioTrack.update({
    where: { id: String(req.params.id) },
    data: { approved: true },
  });
  res.json(track);
});

// ── ADMIN: DELETE /radio/admin/:id ───────────────────────────────────────────
router.delete('/admin/:id', requireAuth, adminOnly, async (req, res) => {
  await prisma.radioTrack.delete({ where: { id: String(req.params.id) } });
  res.json({ ok: true });
});

export default router;
