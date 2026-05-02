/**
 * Seshaa Radio — Discovery + Community Submissions
 *
 * Left/top: Jamendo CC African music organised by genre tag
 * Right/bottom: Community-submitted tracks (approved)
 * Footer: "Submit your track" CTA + monetisation info
 */
import { useState, useEffect, useCallback } from 'react';
import { radioApi } from '../services/api';
import { useRadioStore, RadioTrack } from '../store/radio';
import {
  Play, Pause, Music, Radio, Headphones, Plus, ExternalLink,
  CheckCircle, Loader2, UploadCloud, ChevronDown,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtDur(s: number) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const GENRE_TAGS = [
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

// ── TrackRow ──────────────────────────────────────────────────────────────────
function TrackRow({ track, playlist, index }: { track: RadioTrack; playlist: RadioTrack[]; index: number }) {
  const { currentTrack, playing, play, pause, resume } = useRadioStore();
  const isActive = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isActive) {
      playing ? pause() : resume();
    } else {
      play(track, playlist);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors group ${
        isActive ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50'
      }`}
      onClick={handlePlay}
    >
      {/* Index / play icon */}
      <div className="w-7 shrink-0 flex items-center justify-center">
        {isActive && playing
          ? <Pause size={14} className="text-emerald-600" />
          : isActive
            ? <Play  size={14} className="text-emerald-600 ml-0.5" />
            : <span className="text-xs text-gray-400 group-hover:hidden">{index + 1}</span>
        }
        {!isActive && <Play size={14} className="text-emerald-500 ml-0.5 hidden group-hover:block" />}
      </div>

      {/* Art */}
      {track.image
        ? <img src={track.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
        : <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <Music size={14} className="text-emerald-600" />
          </div>
      }

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isActive ? 'text-emerald-700' : 'text-gray-800'}`}>
          {track.name}
        </p>
        <p className="text-xs text-gray-500 truncate">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
      </div>

      {/* Duration */}
      {track.duration ? (
        <span className="text-xs text-gray-400 shrink-0 tabular-nums">{fmtDur(track.duration)}</span>
      ) : null}
    </div>
  );
}

// ── Submit form ───────────────────────────────────────────────────────────────
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
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await radioApi.submit({
        title: form.title, artist: form.artist, audioUrl: form.audioUrl,
        imageUrl: form.imageUrl || undefined, genre: form.genre || undefined,
        country: form.country || undefined, album: form.album || undefined,
        ownerRights: form.ownerRights,
      });
      setDone(true);
      setTimeout(onDone, 2500);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Submission failed';
      setErr(msg);
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
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Track title *</label>
          <input required className={inp} placeholder="e.g. Essence" value={form.title} onChange={e => upd('title', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Artist *</label>
          <input required className={inp} placeholder="e.g. Wizkid" value={form.artist} onChange={e => upd('artist', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Audio URL * <span className="text-gray-400 font-normal">(direct MP3/OGG/M4A stream)</span></label>
        <input required type="url" className={inp} placeholder="https://cdn.example.com/track.mp3" value={form.audioUrl} onChange={e => upd('audioUrl', e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Cover image URL</label>
          <input type="url" className={inp} placeholder="https://…/cover.jpg" value={form.imageUrl} onChange={e => upd('imageUrl', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Genre</label>
          <select className={inp} value={form.genre} onChange={e => upd('genre', e.target.value)}>
            <option value="">Select genre…</option>
            {GENRE_TAGS.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Country</label>
          <input className={inp} placeholder="e.g. Nigeria" value={form.country} onChange={e => upd('country', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Album</label>
          <input className={inp} placeholder="e.g. Made in Lagos" value={form.album} onChange={e => upd('album', e.target.value)} />
        </div>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" required checked={form.ownerRights} onChange={e => upd('ownerRights', e.target.checked)} className="mt-0.5 accent-emerald-500" />
        <span className="text-xs text-gray-600">
          I confirm I own or hold a valid license for this audio content and have the right to stream it on Seshaa Radio.
        </span>
      </label>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <button
        type="submit" disabled={saving}
        className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
        style={{ background: 'var(--cp, #008751)' }}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {saving ? 'Submitting…' : 'Submit track for review'}
      </button>
      <p className="text-[11px] text-gray-400 text-center">Seshaa does not store audio files. We only link to your existing stream URL.</p>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RadioPage() {
  const [activeTag, setActiveTag] = useState('afrobeats');
  const [tracks, setTracks]       = useState<RadioTrack[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  const { currentTrack, playing } = useRadioStore();

  // ── Load Jamendo tracks for selected tag ──────────────────────────────────
  const loadTracks = useCallback(async (tag: string) => {
    setLoading(true);
    try {
      const r = await radioApi.tracks(tag, 50);
      setTracks(r.data.map(t => ({
        id: t.id,
        name: t.name,
        artist: t.artist,
        album: t.album,
        image: t.image,
        audio: t.audio,
        duration: t.duration,
        source: 'jamendo' as const,
      })));
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTracks(activeTag); }, [activeTag, loadTracks]);

  const activeTagMeta = GENRE_TAGS.find(g => g.id === activeTag) ?? GENRE_TAGS[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--cp, #008751)' }}>
          <Radio size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-black text-gray-900 text-lg leading-tight">African Music Discovery</h1>
          <p className="text-xs text-gray-500">Free Creative Commons music via Jamendo + community submissions</p>
        </div>
        <button
          onClick={() => setShowSubmit(v => !v)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white shrink-0"
          style={{ background: 'var(--cp, #008751)' }}
        >
          <Plus size={14} /> Submit track
        </button>
      </div>

      {/* ── Submit form ── */}
      {showSubmit && (
        <div className="mb-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <UploadCloud size={16} className="text-emerald-500" /> Submit your track
          </h2>
          <SubmitTrackForm onDone={() => setShowSubmit(false)} />
        </div>
      )}

      {/* ── Monetisation notice ── */}
      <div className="mb-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <Headphones size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Advertise on Seshaa Radio</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Reach millions of Africans at home and in the diaspora with audio commercial slots between tracks.{' '}
            <a href="/advertise" className="font-semibold underline">Get in touch →</a>
          </p>
        </div>
      </div>

      {/* ── Genre tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {GENRE_TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => setActiveTag(tag.id)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              activeTag === tag.id
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            style={activeTag === tag.id ? { background: 'var(--cp, #008751)' } : {}}
          >
            {tag.emoji} {tag.label}
          </button>
        ))}
      </div>

      {/* ── Track list ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-base">{activeTagMeta.emoji}</span>
            <span className="font-bold text-gray-800">{activeTagMeta.label}</span>
            {!loading && <span className="text-xs text-gray-400">({tracks.length} tracks)</span>}
          </div>
          <a
            href="https://www.jamendo.com"
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600 transition-colors"
          >
            via Jamendo CC <ExternalLink size={11} />
          </a>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Loading {activeTagMeta.label} tracks…</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Music size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No tracks found for this genre</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 px-1 py-1">
            {tracks.map((track, i) => (
              <TrackRow key={track.id} track={track} playlist={tracks} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* ── Currently playing info ── */}
      {currentTrack && (
        <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" style={{ animation: playing ? 'pulse 1s ease-in-out infinite' : 'none' }} />
          <p className="text-sm text-emerald-800 flex-1 min-w-0 truncate">
            {playing ? 'Now playing: ' : 'Paused: '}
            <strong>{currentTrack.name}</strong> by {currentTrack.artist}
          </p>
        </div>
      )}

      {/* ── Footer CTA ── */}
      <div className="mt-8 mb-4 text-center">
        <p className="text-xs text-gray-400">
          Music sourced from{' '}
          <a href="https://www.jamendo.com" target="_blank" rel="noopener noreferrer" className="underline">Jamendo</a>{' '}
          under Creative Commons licenses. Seshaa does not host any audio files.
          Community submissions are reviewed before going live.
        </p>
      </div>

    </div>
  );
}
