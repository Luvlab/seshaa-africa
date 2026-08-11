/**
 * Seshaa Radio — Footer Player
 * Fixed bar at the bottom. Only renders when a track is loaded.
 * Shows a full seekable waveform above the controls.
 * Sits above MobileTabBar (z-50 < z-60 for mobile nav).
 */
import { useEffect, useRef, useState } from 'react';
import { useRadioStore } from '../../store/radio';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  X, Radio,
} from 'lucide-react';
import { radioApi } from '../../services/api';
import Waveform from './Waveform';

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function FooterPlayer() {
  const {
    currentTrack, playing, playlist, volume, muted, elapsed,
    pause, resume, next, prev, close, setVolume, toggleMute, setElapsed, setPlaylist,
  } = useRadioStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const playCountedRef = useRef<string | null>(null);

  // ── Pre-load featured tracks as default playlist ──────────────────────────
  useEffect(() => {
    if (playlist.length) return; // already loaded
    radioApi.featured().then(res => {
      if (!res.data.length) return;
      const tracks = res.data.map(t => ({
        id: t.id, title: t.title, artist: t.artist,
        audioUrl: t.audioUrl, imageUrl: t.imageUrl,
        country: t.country, genre: t.genre,
        source: 'featured' as const, approved: true,
      }));
      setPlaylist(tracks as never);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync playing state ────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.play().catch(() => pause());
    else audio.pause();
  }, [playing, currentTrack, pause]);

  // ── Sync volume / mute ────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // ── Track metadata loaded ─────────────────────────────────────────────────
  const handleLoaded = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const d = audio.duration;
    setDuration(isFinite(d) ? d : currentTrack?.duration || 0);
  };

  // ── Elapsed time updates ──────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setElapsed(audio.currentTime);
    // record a play after 30 s
    if (audio.currentTime >= 30 && currentTrack && playCountedRef.current !== currentTrack.id) {
      playCountedRef.current = currentTrack.id;
      radioApi.recordPlay(currentTrack.id).catch(() => {});
    }
  };

  // ── Seek via waveform click ───────────────────────────────────────────────
  const handleSeek = (time: number) => {
    if (audioRef.current && isFinite(duration) && duration > 0) {
      audioRef.current.currentTime = time;
    }
    setElapsed(time);
  };

  if (!currentTrack) return null;

  const image = currentTrack.image || '';

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack.audio}
        onLoadedMetadata={handleLoaded}
        onDurationChange={handleLoaded}
        onTimeUpdate={handleTimeUpdate}
        onEnded={next}
        preload="metadata"
      />

      {/* Player bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{ background: 'linear-gradient(to right, #0f172a, #1e293b)' }}
      >
        {/* ── Waveform (full width, seekable) — hidden for live streams ── */}
        {!currentTrack.isLive && (
          <div className="w-full px-2 pt-2 pb-0">
            <Waveform
              trackId={currentTrack.id}
              elapsed={elapsed}
              duration={duration}
              onSeek={handleSeek}
              height={36}
              bars={100}
              playedColor="#10b981"
              unplayedColor="rgba(255,255,255,0.15)"
            />
          </div>
        )}

        {/* ── Controls row ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-3 py-2 min-w-0">

          {/* Art + track info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative shrink-0">
              {image
                ? <img src={image} alt="" className="w-9 h-9 rounded-lg object-cover" />
                : <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center">
                    <Radio size={16} className="text-emerald-300" />
                  </div>
              }
              {playing && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">{currentTrack.name}</p>
              <p className="text-[10px] text-white/50 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Time / LIVE badge */}
          {currentTrack.isLive
            ? <span className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                LIVE
              </span>
            : <span className="text-[10px] text-white/40 shrink-0 hidden sm:block tabular-nums">
                {fmtTime(elapsed)}{duration > 0 ? ` / ${fmtTime(duration)}` : ''}
              </span>
          }

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prev} className="p-1.5 text-white/60 hover:text-white transition-colors">
              <SkipBack size={15} />
            </button>
            <button
              onClick={playing ? pause : resume}
              className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-colors shadow-lg"
            >
              {playing
                ? <Pause size={15} className="text-white" />
                : <Play  size={15} className="text-white ml-0.5" />
              }
            </button>
            <button onClick={next} className="p-1.5 text-white/60 hover:text-white transition-colors">
              <SkipForward size={15} />
            </button>
          </div>

          {/* Volume (desktop only) */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors">
              {muted || volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
            <input
              type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Close */}
          <button onClick={close} className="p-1.5 text-white/40 hover:text-white transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
