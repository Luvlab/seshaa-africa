/**
 * Seshaa Radio — Footer Player
 * Fixed 72 px bar at the bottom. Only renders when a track is loaded.
 * Sits above MobileTabBar (z-50 < z-60 for mobile nav).
 */
import { useEffect, useRef, useState } from 'react';
import { useRadioStore } from '../../store/radio';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  X, Radio,
} from 'lucide-react';
import { radioApi } from '../../services/api';

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function FooterPlayer() {
  const {
    currentTrack, playing, volume, muted, elapsed,
    pause, resume, next, prev, close, setVolume, toggleMute, setElapsed,
  } = useRadioStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const playCountedRef = useRef<string | null>(null);

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
    setDuration(audio.duration || currentTrack?.duration || 0);
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

  // ── Seek ──────────────────────────────────────────────────────────────────
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = val;
    setElapsed(val);
  };

  if (!currentTrack) return null;

  const pct = duration > 0 ? (elapsed / duration) * 100 : 0;
  const image = currentTrack.image || '';

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack.audio}
        onLoadedMetadata={handleLoaded}
        onTimeUpdate={handleTimeUpdate}
        onEnded={next}
        preload="metadata"
      />

      {/* Player bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{ height: 72, background: 'linear-gradient(to right, #0f172a, #1e293b)' }}
      >
        {/* Progress bar — thin line at top */}
        <div className="relative w-full h-1 bg-white/10 shrink-0">
          <div
            className="absolute inset-y-0 left-0 bg-emerald-400 transition-all"
            style={{ width: `${pct}%` }}
          />
          <input
            type="range" min={0} max={duration || 1} step={0.5} value={elapsed}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-1"
          />
        </div>

        {/* Main row */}
        <div className="flex items-center gap-3 px-3 flex-1 min-w-0">

          {/* Art + track info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative shrink-0">
              {image
                ? <img src={image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                : <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center">
                    <Radio size={18} className="text-emerald-300" />
                  </div>
              }
              {playing && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">{currentTrack.name}</p>
              <p className="text-[11px] text-white/50 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Time */}
          <span className="text-[10px] text-white/40 shrink-0 hidden sm:block tabular-nums">
            {fmtTime(elapsed)}{duration > 0 ? ` / ${fmtTime(duration)}` : ''}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prev} className="p-1.5 text-white/60 hover:text-white transition-colors">
              <SkipBack size={16} />
            </button>
            <button
              onClick={playing ? pause : resume}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-colors shadow-lg"
            >
              {playing
                ? <Pause size={16} className="text-white" />
                : <Play  size={16} className="text-white ml-0.5" />
              }
            </button>
            <button onClick={next} className="p-1.5 text-white/60 hover:text-white transition-colors">
              <SkipForward size={16} />
            </button>
          </div>

          {/* Volume (desktop only) */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors">
              {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Close */}
          <button onClick={close} className="p-1.5 text-white/40 hover:text-white transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
