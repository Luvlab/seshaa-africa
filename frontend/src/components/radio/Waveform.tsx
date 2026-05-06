/**
 * Waveform — seekable audio progress bar visualized as waveform bars.
 * Shows a deterministic pseudo-waveform seeded from the track ID so
 * the shape is consistent across renders/loads.
 * Played portion: emerald. Unplayed: gray/faded.
 * Click anywhere to seek to that position in the track.
 */
import { useRef, useEffect, useCallback } from 'react';

interface WaveformProps {
  trackId: string;
  elapsed: number;       // seconds already played
  duration: number;      // total duration in seconds (0 = unknown)
  onSeek?: (time: number) => void;
  height?: number;       // canvas height in px
  bars?: number;         // number of vertical bars
  playedColor?: string;
  unplayedColor?: string;
  className?: string;
}

/** Deterministic pseudo-waveform from a seed string */
function pseudoWave(seed: string, n: number): number[] {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  }
  return Array.from({ length: n }, (_, i) => {
    const a = Math.imul(h ^ (i * 2654435761), 0x45d9f3b) >>> 0;
    const b = Math.abs(Math.sin(i * 0.37 + (Math.abs(h) % 100) * 0.02));
    const raw = (a >>> 0) / 0xffffffff * 0.7 + b * 0.3;
    // Smooth bump pattern — louder in the middle
    const envelope = 0.3 + 0.7 * Math.sin((i / n) * Math.PI);
    return Math.max(0.08, Math.min(1, raw * envelope));
  });
}

export default function Waveform({
  trackId,
  elapsed,
  duration,
  onSeek,
  height = 32,
  bars = 80,
  playedColor = '#10b981',   // emerald-500
  unplayedColor = 'rgba(255,255,255,0.2)',
  className = '',
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveData = useRef<number[]>([]);

  // Regenerate waveform when track changes
  useEffect(() => {
    waveData.current = pseudoWave(trackId || 'default', bars);
  }, [trackId, bars]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const wave = waveData.current;
    if (!wave.length) return;

    ctx.clearRect(0, 0, w, h);

    const barW   = Math.max(1, w / bars - 1);
    const gap    = w / bars;
    const pct    = duration > 0 ? Math.min(1, elapsed / duration) : 0;
    const pivotX = w * pct;

    wave.forEach((amp, i) => {
      const x = i * gap;
      const barH = amp * h;
      const y = (h - barH) / 2;

      ctx.fillStyle = x < pivotX ? playedColor : unplayedColor;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, barW / 2);
      ctx.fill();
    });
  }, [bars, elapsed, duration, playedColor, unplayedColor]);

  // Redraw when state changes
  useEffect(() => { draw(); }, [draw]);

  // Handle window resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth  * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(duration, ratio * duration)));
  };

  return (
    <canvas
      ref={canvasRef}
      height={height * devicePixelRatio}
      style={{ height, cursor: onSeek && duration > 0 ? 'pointer' : 'default' }}
      className={`w-full block ${className}`}
      onClick={handleClick}
      title={duration > 0 ? `Click to seek — ${Math.round(elapsed)}s / ${Math.round(duration)}s` : undefined}
    />
  );
}
