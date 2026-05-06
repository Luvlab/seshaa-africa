/**
 * Seshaa Radio — 4-tab music hub
 * Live  · Discovery (Jamendo CC) · Archive (Internet Archive, oldest→newest) · Community
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { radioApi } from '../services/api';
import type { LiveStation } from '../services/api';
import { useRadioStore } from '../store/radio';
import type { RadioTrack } from '../store/radio';
import Waveform from '../components/radio/Waveform';
import {
  Play, Pause, Music, Radio, Headphones, Plus, ExternalLink,
  CheckCircle, Loader2, UploadCloud, Signal, ChevronLeft, ChevronRight,
  Clock, Globe2, Users, Archive,
} from 'lucide-react';
import FavoriteButton from '../components/ui/FavoriteButton';

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDur(s?: number) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function countryFlag(code: string) {
  if (!code || code.length !== 2) return '🌍';
  return code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('');
}

// ── types ─────────────────────────────────────────────────────────────────────
type RadioTab = 'live' | 'discovery' | 'archive' | 'community';

const GENRE_TAGS = [
  { id: 'afrobeats',  label: 'Afrobeats',   emoji: '🎵' },
  { id: 'afropop',    label: 'Afropop',      emoji: '🎤' },
  { id: 'afrobeat',   label: 'Afrobeat',     emoji: '🥁' },
  { id: 'afrofusion', label: 'Afrofusion',   emoji: '🎸' },
  { id: 'highlife',   label: 'Highlife',     emoji: '🎷' },
  { id: 'afrojazz',   label: 'Afro Jazz',    emoji: '🎺' },
  { id: 'afrohouse',  label: 'Afro House',   emoji: '🎧' },
  { id: 'amapiano',   label: 'Amapiano',     emoji: '🎹' },
  { id: 'soukous',    label: 'Soukous',      emoji: '💃' },
  { id: 'kizomba',    label: 'Kizomba',      emoji: '🌹' },
  { id: 'afro',       label: 'Afro',         emoji: '🌍' },
  { id: 'world',      label: 'World Music',  emoji: '🌐' },
];

const ARCHIVE_GENRES = [
  { id: '',          label: 'All genres' },
  { id: 'highlife',  label: 'Highlife' },
  { id: 'soukous',   label: 'Soukous' },
  { id: 'afrobeat',  label: 'Afrobeat' },
  { id: 'juju',      label: 'Juju' },
  { id: 'taarab',    label: 'Taarab' },
  { id: 'makossa',   label: 'Makossa' },
  { id: 'marabi',    label: 'Marabi' },
  { id: 'kwela',     label: 'Kwela' },
  { id: 'mbaqanga',  label: 'Mbaqanga' },
  { id: 'mbalax',    label: 'Mbalax' },
];

const DECADES = [
  { label: 'All eras', from: 1900, to: new Date().getFullYear() },
  { label: 'Pre-1930', from: 1900, to: 1929 },
  { label: '1930s',    from: 1930, to: 1939 },
  { label: '1940s',    from: 1940, to: 1949 },
  { label: '1950s',    from: 1950, to: 1959 },
  { label: '1960s',    from: 1960, to: 1969 },
  { label: '1970s',    from: 1970, to: 1979 },
  { label: '1980s',    from: 1980, to: 1989 },
  { label: '1990s',    from: 1990, to: 1999 },
  { label: '2000s+',   from: 2000, to: new Date().getFullYear() },
];

// ── Shared TrackRow ───────────────────────────────────────────────────────────
function TrackRow({ track, playlist, index }: { track: RadioTrack; playlist: RadioTrack[]; index: number }) {
  const { currentTrack, playing, elapsed, play, pause, resume } = useRadioStore();
  const isActive = currentTrack?.id === track.id;
  // Store duration from audio element via store; fallback to track metadata
  const duration = (isActive ? (useRadioStore.getState() as any)._duration : track.duration) || track.duration || 0;

  const handlePlay = () => {
    if (isActive) { playing ? pause() : resume(); }
    else play(track, playlist);
  };

  return (
    <div
      className={`px-3 py-2.5 rounded-xl cursor-pointer transition-colors group ${
        isActive ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50'
      }`}
      onClick={handlePlay}
    >
      {/* Main row */}
      <div className="flex items-center gap-3">
        <div className="w-7 shrink-0 flex items-center justify-center">
          {isActive && playing
            ? <Pause size={14} className="text-emerald-600" />
            : isActive
              ? <Play  size={14} className="text-emerald-600 ml-0.5" />
              : <span className="text-xs text-gray-400 group-hover:hidden">{index + 1}</span>
          }
          {!isActive && <Play size={14} className="text-emerald-500 ml-0.5 hidden group-hover:block" />}
        </div>

        {track.image
          ? <img src={track.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Music size={14} className="text-emerald-600" />
            </div>
        }

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isActive ? 'text-emerald-700' : 'text-gray-800'}`}>
            {track.name}
          </p>
          <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
            {track.artist}
            {track.year && <span className="text-gray-400 font-medium">{track.year}</span>}
          </p>
        </div>

        {track.shareUrl && (
          <a href={track.shareUrl} target="_blank" rel="noopener noreferrer"
            className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-gray-400"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink size={13} />
          </a>
        )}

        <span onClick={e => e.stopPropagation()}>
          <FavoriteButton id={track.id} type="track" name={`${track.name} – ${track.artist}`} size={14}
            className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>

        {track.duration ? (
          <span className="text-xs text-gray-400 shrink-0 tabular-nums">{fmtDur(track.duration)}</span>
        ) : null}
      </div>

      {/* Waveform — shown for all tracks, indicates progress when active */}
      <div className="mt-1.5 ml-10">
        <Waveform
          trackId={track.id}
          elapsed={isActive ? elapsed : 0}
          duration={isActive ? duration : track.duration || 0}
          height={20}
          bars={60}
          playedColor={isActive ? '#10b981' : '#d1fae5'}
          unplayedColor={isActive ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)'}
        />
      </div>
    </div>
  );
}

// ── StationCard ───────────────────────────────────────────────────────────────
function StationCard({ station }: { station: LiveStation }) {
  const { t } = useTranslation();
  const { currentTrack, playing, play, pause, resume } = useRadioStore();
  const stationId = `rb_${station.id}`;
  const isActive = currentTrack?.id === stationId;
  const [imgError, setImgError] = useState(false);

  const handlePlay = () => {
    if (isActive) { playing ? pause() : resume(); return; }
    const track: RadioTrack = {
      id: stationId,
      name: station.name,
      artist: station.countryName || station.country,
      image: station.favicon || '',
      audio: station.streamUrl,
      source: 'live',
      isLive: true,
      country: station.country,
      genre: station.tags?.split(',')[0]?.trim() || '',
    };
    play(track, [track]);
  };

  const genreLabel = station.tags?.split(',').slice(0, 2).filter(Boolean).map(t => t.trim()).join(' · ') || 'Radio';

  return (
    <div
      className={`relative flex flex-col gap-2 p-3.5 rounded-2xl border cursor-pointer transition-all ${
        isActive
          ? 'bg-emerald-50 border-emerald-200 shadow-md'
          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
      }`}
      onClick={handlePlay}
    >
      {/* Live badge */}
      {isActive && playing && (
        <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          LIVE
        </span>
      )}

      {/* Logo / flag */}
      <div className="flex items-center gap-2.5">
        {station.favicon && !imgError
          ? <img src={station.favicon} alt="" className="w-10 h-10 rounded-xl object-contain bg-gray-50 p-1 shrink-0"
              onError={() => setImgError(true)} />
          : <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0">
              {countryFlag(station.country)}
            </div>
        }
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold truncate leading-tight ${isActive ? 'text-emerald-700' : 'text-gray-800'}`}>
            {station.name}
          </p>
          <p className="text-[11px] text-gray-500 truncate">{station.countryName || station.country}</p>
        </div>
      </div>

      {/* Genre + bitrate */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400 truncate max-w-[70%]">{genreLabel}</span>
        <span className="text-[10px] text-gray-300 shrink-0">
          {station.codec || 'MP3'}{station.bitrate > 0 ? ` ${station.bitrate}k` : ''}
        </span>
      </div>

      {/* Play button */}
      <button
        className={`mt-1 w-full py-1.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
          isActive && playing
            ? 'bg-emerald-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        onClick={handlePlay}
      >
        {isActive && playing
          ? <><Pause size={13} /> {t('radio.pause')}</>
          : isActive
            ? <><Play size={13} className="ml-0.5" /> {t('radio.play')}</>
            : <><Signal size={13} /> {t('radio.play')}</>
        }
      </button>
    </div>
  );
}

// ── SubmitTrackForm ───────────────────────────────────────────────────────────
function SubmitTrackForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    title: '', artist: '', audioUrl: '', imageUrl: '',
    genre: '', country: '', album: '', ownerRights: false,
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const upd = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      await radioApi.submit({
        title: form.title, artist: form.artist, audioUrl: form.audioUrl,
        imageUrl: form.imageUrl || undefined, genre: form.genre || undefined,
        country: form.country || undefined, album: form.album || undefined,
        ownerRights: form.ownerRights,
      });
      setDone(true); setTimeout(onDone, 2500);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Submission failed');
    } finally { setSaving(false); }
  };

  if (done) return (
    <div className="text-center py-8">
      <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
      <p className="font-bold text-gray-800">Track submitted!</p>
      <p className="text-sm text-gray-500 mt-1">Our team will review it shortly.</p>
    </div>
  );

  const inp = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Track title *</label>
          <input required className={inp} placeholder="e.g. Essence" value={form.title} onChange={e => upd('title', e.target.value)} /></div>
        <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Artist *</label>
          <input required className={inp} placeholder="e.g. Wizkid" value={form.artist} onChange={e => upd('artist', e.target.value)} /></div>
      </div>
      <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Audio URL * <span className="text-gray-400 font-normal">(direct MP3/OGG/M4A stream)</span></label>
        <input required type="url" className={inp} placeholder="https://cdn.example.com/track.mp3" value={form.audioUrl} onChange={e => upd('audioUrl', e.target.value)} /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Cover image URL</label>
          <input type="url" className={inp} placeholder="https://…/cover.jpg" value={form.imageUrl} onChange={e => upd('imageUrl', e.target.value)} /></div>
        <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Genre</label>
          <select className={inp} value={form.genre} onChange={e => upd('genre', e.target.value)}>
            <option value="">Select genre…</option>
            {GENRE_TAGS.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>)}
          </select></div>
        <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Country</label>
          <input className={inp} placeholder="e.g. Nigeria" value={form.country} onChange={e => upd('country', e.target.value)} /></div>
        <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Album</label>
          <input className={inp} placeholder="e.g. Made in Lagos" value={form.album} onChange={e => upd('album', e.target.value)} /></div>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" required checked={form.ownerRights} onChange={e => upd('ownerRights', e.target.checked)} className="mt-0.5 accent-emerald-500" />
        <span className="text-xs text-gray-600">I confirm I own or hold a valid license for this audio content and have the right to stream it on Seshaa Radio.</span>
      </label>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <button type="submit" disabled={saving}
        className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: 'var(--cp, #008751)' }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {saving ? 'Submitting…' : 'Submit track for review'}
      </button>
      <p className="text-[11px] text-gray-400 text-center">Seshaa does not store audio files. We only link to your existing stream URL.</p>
    </form>
  );
}

// ── LIVE TAB ──────────────────────────────────────────────────────────────────
function LiveTab() {
  const { t } = useTranslation();
  const [stations, setStations] = useState<LiveStation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [country, setCountry]   = useState('');
  const [search, setSearch]     = useState('');

  useEffect(() => {
    radioApi.stations()
      .then(r => setStations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Unique countries from result
  const countries = Array.from(
    new Map(stations.filter(s => s.country).map(s => [s.country, s.countryName || s.country])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtered = stations.filter(s => {
    if (country && s.country !== country) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return (
    <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
      <Loader2 size={28} className="animate-spin" />
      <p className="text-sm">{t('common.loading')}</p>
    </div>
  );

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-emerald-400"
          placeholder="Search stations…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          value={country}
          onChange={e => setCountry(e.target.value)}
        >
          <option value="">All countries ({stations.length} stations)</option>
          {countries.map(([code, name]) => (
            <option key={code} value={code}>
              {countryFlag(code)} {name}
            </option>
          ))}
        </select>
      </div>

      {/* Station count */}
      {!loading && (
        <p className="text-xs text-gray-400 mb-3">
          {filtered.length} station{filtered.length !== 1 ? 's' : ''} found
          {country ? ` in ${countries.find(c => c[0] === country)?.[1] || country}` : ' across Africa'}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0
        ? <div className="py-16 text-center text-gray-400">
            <Radio size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No stations found</p>
          </div>
        : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(s => <StationCard key={s.id} station={s} />)}
          </div>
      }

      <p className="text-[11px] text-gray-400 text-center mt-6">
        Stations sourced from <a href="https://www.radio-browser.info" target="_blank" rel="noopener noreferrer" className="underline">RadioBrowser</a> — an open community directory. Stream availability depends on each station.
      </p>
    </div>
  );
}

const LIMIT_OPTIONS = [30, 50, 100, 200];

// ── DISCOVERY TAB (Jamendo CC) ────────────────────────────────────────────────
function DiscoveryTab() {
  const { t } = useTranslation();
  const [activeTag, setActiveTag] = useState('afrobeats');
  const [tracks, setTracks]       = useState<RadioTrack[]>([]);
  const [loading, setLoading]     = useState(false);
  const [limit, setLimit]         = useState(50);
  const { currentTrack, playing } = useRadioStore();

  const loadTracks = useCallback(async (tag: string, lim: number) => {
    setLoading(true);
    try {
      const r = await radioApi.tracks(tag, lim);
      setTracks(r.data.map(t => ({
        id: t.id, name: t.name, artist: t.artist, album: t.album,
        image: t.image, audio: t.audio, duration: t.duration,
        source: 'jamendo' as const, year: t.year, shareUrl: t.shareUrl,
      })));
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTracks(activeTag, limit); }, [activeTag, limit, loadTracks]);
  const meta = GENRE_TAGS.find(g => g.id === activeTag) ?? GENRE_TAGS[0];

  return (
    <div>
      {/* Genre tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {GENRE_TAGS.map(tag => (
          <button key={tag.id} onClick={() => setActiveTag(tag.id)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              activeTag === tag.id ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            style={activeTag === tag.id ? { background: 'var(--cp, #008751)' } : {}}>
            {tag.emoji} {tag.label}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-base">{meta.emoji}</span>
            <span className="font-bold text-gray-800">{meta.label}</span>
            {!loading && <span className="text-xs text-gray-400">({tracks.length} tracks)</span>}
          </div>
          <div className="flex items-center gap-3">
            {/* Limit selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 hidden sm:block">Show:</span>
              {LIMIT_OPTIONS.map(n => (
                <button key={n} onClick={() => setLimit(n)}
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
                    limit === n ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            <a href="https://www.jamendo.com" target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
              Jamendo CC <ExternalLink size={11} />
            </a>
          </div>
        </div>
        {loading
          ? <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">{t('common.loading')}</p>
            </div>
          : tracks.length === 0
            ? <div className="py-16 text-center text-gray-400">
                <Music size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No tracks found for this genre</p>
              </div>
            : <div className="divide-y divide-gray-50 px-1 py-1">
                {tracks.map((track, i) => <TrackRow key={track.id} track={track} playlist={tracks} index={i} />)}
              </div>
        }
      </div>

      {currentTrack?.source === 'jamendo' && (
        <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" style={{ animation: playing ? 'pulse 1s ease-in-out infinite' : 'none' }} />
          <p className="text-sm text-emerald-800 flex-1 min-w-0 truncate">
            {playing ? `${t('radio.nowPlaying')}: ` : `${t('radio.pause')}: `}<strong>{currentTrack.name}</strong> by {currentTrack.artist}
          </p>
        </div>
      )}
      <p className="text-[11px] text-gray-400 text-center mt-6">
        Music sourced from <a href="https://www.jamendo.com" target="_blank" rel="noopener noreferrer" className="underline">Jamendo</a> under Creative Commons licenses.
      </p>
    </div>
  );
}

// ── ARCHIVE TAB (Internet Archive, oldest → newest) ───────────────────────────
function ArchiveTab() {
  const { t } = useTranslation();
  const [decade,    setDecade]    = useState(0);   // index into DECADES
  const [genre,     setGenre]     = useState('');
  const [page,      setPage]      = useState(1);
  const [tracks,    setTracks]    = useState<RadioTrack[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [archiveLimit, setArchiveLimit] = useState(30);

  const load = useCallback(async (dec: number, g: string, p: number, lim: number) => {
    setLoading(true); setError('');
    try {
      const { from, to } = DECADES[dec];
      const r = await radioApi.archive({ genre: g || undefined, year_from: from, year_to: to, page: p, limit: lim });
      const archiveTracks: RadioTrack[] = r.data.tracks.map(t => ({
        id: t.id, name: t.name, artist: t.artist, album: t.album,
        image: t.image, audio: t.audio, duration: t.duration,
        source: 'archive' as const, year: t.year, shareUrl: t.shareUrl,
        genre: t.tags?.[0],
      }));
      setTracks(archiveTracks);
      setTotal(r.data.total);
    } catch {
      setError('Could not load archive tracks. Please try again.');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(decade, genre, page, archiveLimit); }, [decade, genre, page, archiveLimit, load]);

  const totalPages = Math.ceil(Math.min(total, 1000) / archiveLimit);

  const handleDecade = (idx: number) => { setDecade(idx); setPage(1); };
  const handleGenre  = (g: string)   => { setGenre(g);    setPage(1); };

  return (
    <div>
      {/* Info banner */}
      <div className="mb-5 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <Archive size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Internet Archive — African Music Collection</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Royalty-free recordings from the 1900s onwards. Public domain and CC-licensed African music, oldest to newest.
          </p>
        </div>
      </div>

      {/* Decade filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {DECADES.map((d, i) => (
          <button key={i} onClick={() => handleDecade(i)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              decade === i ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            style={decade === i ? { background: 'var(--cp, #008751)' } : {}}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Genre filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {ARCHIVE_GENRES.map(g => (
          <button key={g.id} onClick={() => handleGenre(g.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              genre === g.id ? 'bg-gray-800 text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-gray-400" />
            <span className="font-bold text-gray-800">
              {DECADES[decade].label}{genre ? ` · ${ARCHIVE_GENRES.find(g2 => g2.id === genre)?.label}` : ''}
            </span>
            {!loading && total > 0 && (
              <span className="text-xs text-gray-400">(~{total.toLocaleString()} recordings)</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Per-page selector */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 hidden sm:block">Show:</span>
              {LIMIT_OPTIONS.map(n => (
                <button key={n} onClick={() => { setArchiveLimit(n); setPage(1); }}
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
                    archiveLimit === n ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            <a href="https://archive.org/search?query=subject:africa+AND+mediatype:audio&sort=year+asc"
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
              Archive <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {loading
          ? <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">{t('common.loading')}</p>
              <p className="text-xs text-gray-300">Fetching audio metadata from archive.org</p>
            </div>
          : error
            ? <div className="py-16 text-center text-gray-400">
                <p className="text-sm">{t('common.error')}</p>
                <button onClick={() => load(decade, genre, page, archiveLimit)}
                  className="mt-3 text-xs text-emerald-600 underline">{t('common.retry')}</button>
              </div>
            : tracks.length === 0
              ? <div className="py-16 text-center text-gray-400">
                  <Archive size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No archived tracks found for this filter</p>
                </div>
              : <div className="divide-y divide-gray-50 px-1 py-1">
                  {tracks.map((track, i) => (
                    <div key={track.id} className="flex items-center">
                      {/* Year badge */}
                      <div className="w-14 shrink-0 flex justify-center">
                        {track.year
                          ? <span className="text-[10px] font-bold text-gray-400 tabular-nums">{track.year}</span>
                          : <span className="text-[10px] text-gray-300">—</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <TrackRow track={track} playlist={tracks} index={i} />
                      </div>
                    </div>
                  ))}
                </div>
        }
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <p className="text-[11px] text-gray-400 text-center mt-5">
        Recordings sourced from <a href="https://archive.org" target="_blank" rel="noopener noreferrer" className="underline">Internet Archive</a> under public domain and Creative Commons licenses. First load may take ~5 seconds while metadata is fetched.
      </p>
    </div>
  );
}

// ── COMMUNITY TAB ─────────────────────────────────────────────────────────────
function CommunityTab() {
  const { t } = useTranslation();
  const [tracks,      setTracks]      = useState<RadioTrack[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [showSubmit,  setShowSubmit]  = useState(false);
  const [filterGenre, setFilterGenre] = useState('');
  const [communityLimit, setCommunityLimit] = useState(50);

  const load = useCallback(async (genre?: string, lim = 50) => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await radioApi.community({ genre: genre || undefined, limit: lim }) as any;
      const items = r.data?.tracks ?? [];
      setTotal(r.data?.total ?? 0);
      setTracks(items.map((t: {
        id: string; title: string; artist: string; album?: string;
        imageUrl?: string; audioUrl: string; duration?: number; genre?: string; country?: string;
      }) => ({
        id: t.id, name: t.title, artist: t.artist, album: t.album,
        image: t.imageUrl || '', audio: t.audioUrl, duration: t.duration,
        source: 'community' as const, genre: t.genre, country: t.country,
      })));
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(filterGenre, communityLimit); }, [filterGenre, communityLimit, load]);

  return (
    <div>
      {/* Submit CTA */}
      <div className="mb-5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4 flex items-start gap-3">
        <Users size={20} className="text-purple-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-bold text-purple-800">{t('radio.community')}</p>
          <p className="text-xs text-purple-700 mt-0.5">Submit a link to music you own or are licensed to share. After review it appears here.</p>
        </div>
        <button
          onClick={() => setShowSubmit(v => !v)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'var(--cp, #008751)' }}
        >
          <Plus size={14} /> {t('radio.submit')}
        </button>
      </div>

      {showSubmit && (
        <div className="mb-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <UploadCloud size={16} className="text-emerald-500" /> Submit your track
          </h2>
          <SubmitTrackForm onDone={() => { setShowSubmit(false); load(filterGenre); }} />
        </div>
      )}

      {/* Genre filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {[{ id: '', label: 'All' }, ...GENRE_TAGS].map(g => (
          <button key={g.id} onClick={() => setFilterGenre(g.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              filterGenre === g.id ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            style={filterGenre === g.id ? { background: 'var(--cp, #008751)' } : {}}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <span className="font-bold text-gray-800">{t('radio.community')}</span>
          <div className="flex items-center gap-3">
            {/* Limit selector */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 hidden sm:block">Show:</span>
              {LIMIT_OPTIONS.map(n => (
                <button key={n} onClick={() => setCommunityLimit(n)}
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
                    communityLimit === n ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            {!loading && <span className="text-xs text-gray-400">{total} approved track{total !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        {loading
          ? <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">{t('common.loading')}</p>
            </div>
          : tracks.length === 0
            ? <div className="py-16 text-center text-gray-400">
                <Music size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No community tracks yet.</p>
                <p className="text-xs mt-1">Be the first to submit!</p>
              </div>
            : <div className="divide-y divide-gray-50 px-1 py-1">
                {tracks.map((track, i) => <TrackRow key={track.id} track={track} playlist={tracks} index={i} />)}
              </div>
        }
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function RadioPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<RadioTab>('live');
  const scrollRef = useRef<HTMLDivElement>(null);

  const TABS: { id: RadioTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'live',      label: 'Live',      icon: <Signal     size={15} />, desc: 'African radio stations streaming live' },
    { id: 'discovery', label: 'Discovery', icon: <Music      size={15} />, desc: 'Creative Commons music by genre' },
    { id: 'archive',   label: 'Archive',   icon: <Archive    size={15} />, desc: 'Historical recordings, oldest to newest' },
    { id: 'community', label: 'Community', icon: <Globe2     size={15} />, desc: 'Submitted by the Seshaa community' },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-4" ref={scrollRef}>

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--cp, #008751)' }}>
          <Radio size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-black text-gray-900 text-xl leading-tight">{t('radio.title')}</h1>
          <p className="text-xs text-gray-500">{t('radio.subtitle')}</p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5">
          <Headphones size={14} className="text-amber-500" />
          <span className="text-xs font-semibold text-amber-700">Advertise on Radio →</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-2xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title={t.desc}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'live'      && <LiveTab />}
      {tab === 'discovery' && <DiscoveryTab />}
      {tab === 'archive'   && <ArchiveTab />}
      {tab === 'community' && <CommunityTab />}

    </div>
  );
}
