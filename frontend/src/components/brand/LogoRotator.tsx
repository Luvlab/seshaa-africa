/**
 * LogoRotator — cycles through 6 Seshaa logo variants every 9 seconds.
 * Admin can enable/disable individual variants via AdminPortal → Branding tab.
 * Enabled list stored in localStorage as JSON array under 'seshaa-logo-rotation'.
 */
import { useState, useEffect, useRef } from 'react';

// ── Brand palette ────────────────────────────────────────────────────────────
const G  = '#008751';   // Seshaa dark green
const G2 = '#006640';   // Darker green for depth
const L  = '#90EE30';   // Lime / outline green

// ── Open-hand SVG path (simplified) ─────────────────────────────────────────
function Hand({ x = 0, y = 0, scale = 1, color = G }: { x?: number; y?: number; scale?: number; color?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      {/* Palm */}
      <ellipse cx="20" cy="28" rx="15" ry="12" fill={color} />
      {/* Fingers */}
      <rect x="7"  y="10" width="5" height="20" rx="2.5" fill={color} />
      <rect x="13" y="6"  width="5" height="24" rx="2.5" fill={color} />
      <rect x="19" y="5"  width="5" height="25" rx="2.5" fill={color} />
      <rect x="25" y="7"  width="5" height="23" rx="2.5" fill={color} />
      {/* Thumb */}
      <ellipse cx="5" cy="26" rx="4" ry="7" fill={color} transform="rotate(-15 5 26)" />
    </g>
  );
}

// ── Six logo SVGs ─────────────────────────────────────────────────────────────

/** 1 · Italic outline — bold italic with thick lime stroke */
function LogoItalicOutline() {
  return (
    <svg viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg">
      <text
        x="174" y="41" textAnchor="end"
        fontSize="42" fontWeight="900" fontStyle="italic"
        fontFamily='"Arial Black","Arial Bold",Arial,sans-serif'
        stroke={L} strokeWidth="6" strokeLinejoin="round"
        fill={G} paintOrder="stroke fill"
      >seshaa.</text>
    </svg>
  );
}

/** 2 · Bold solid — heavy black weight, no outline */
function LogoBoldSolid() {
  return (
    <svg viewBox="0 0 180 48" xmlns="http://www.w3.org/2000/svg">
      <text
        x="176" y="40" textAnchor="end"
        fontSize="40" fontWeight="900"
        fontFamily='"Arial Black","Arial Bold",Arial,sans-serif'
        fill={G} letterSpacing="-1"
      >seshaa.</text>
    </svg>
  );
}

/** 3 · Handmark — wordmark with open hand beside it */
function LogoHandmark() {
  return (
    <svg viewBox="0 0 220 52" xmlns="http://www.w3.org/2000/svg">
      {/* Lime outline hand (left side) */}
      <Hand x={1} y={6} scale={0.85} color={L} />
      <Hand x={3} y={8} scale={0.82} color={G} />
      {/* Wordmark right-aligned */}
      <text
        x="216" y="40" textAnchor="end"
        fontSize="36" fontWeight="900" fontStyle="italic"
        fontFamily='"Arial Black","Arial Bold",Arial,sans-serif'
        stroke={L} strokeWidth="5" strokeLinejoin="round"
        fill={G} paintOrder="stroke fill"
      >seshaa.</text>
    </svg>
  );
}

/** 4 · Bubble sticker — rounded bubbly white-outlined style */
function LogoBubble() {
  return (
    <svg viewBox="0 0 180 52" xmlns="http://www.w3.org/2000/svg">
      <text
        x="176" y="40" textAnchor="end"
        fontSize="40" fontWeight="900" fontStyle="italic"
        fontFamily='"Arial Rounded MT Bold","Arial Black",Arial,sans-serif'
        stroke="white" strokeWidth="6" strokeLinejoin="round"
        fill={G} paintOrder="stroke fill"
      >seshaa.</text>
      {/* Tagline */}
      <text
        x="176" y="50" textAnchor="end"
        fontSize="9" fontWeight="700"
        fontFamily='Arial,sans-serif'
        fill={G2} letterSpacing="0.5"
      >and you will find.</text>
    </svg>
  );
}

/** 5 · Retro caps — all caps, chunky, dual-tone */
function LogoRetroCaps() {
  return (
    <svg viewBox="0 0 200 52" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow layer */}
      <text
        x="198" y="42" textAnchor="end"
        fontSize="38" fontWeight="900"
        fontFamily='"Arial Black","Arial Bold",Arial,sans-serif'
        fill={G2} letterSpacing="3"
      >SESHAA.</text>
      {/* Main layer */}
      <text
        x="196" y="40" textAnchor="end"
        fontSize="38" fontWeight="900"
        fontFamily='"Arial Black","Arial Bold",Arial,sans-serif'
        stroke={L} strokeWidth="4" strokeLinejoin="miter"
        fill={G} paintOrder="stroke fill"
        letterSpacing="3"
      >SESHAA.</text>
    </svg>
  );
}

/** 6 · Script hand — script-style italic with hand underneath */
function LogoScriptHand() {
  return (
    <svg viewBox="0 0 200 56" xmlns="http://www.w3.org/2000/svg">
      {/* Main word right-aligned */}
      <text
        x="196" y="36" textAnchor="end"
        fontSize="38" fontWeight="900" fontStyle="italic"
        fontFamily='Georgia,"Times New Roman",serif'
        stroke={L} strokeWidth="5" strokeLinejoin="round"
        fill={G} paintOrder="stroke fill"
      >seshaa.</text>
      {/* Tagline */}
      <text
        x="196" y="50" textAnchor="end"
        fontSize="9" fontWeight="600" fontStyle="italic"
        fontFamily='Georgia,serif'
        fill={G2}
      >and you will find.</text>
    </svg>
  );
}

// ── Logo registry ─────────────────────────────────────────────────────────────
export type LogoId = 'italic-outline' | 'bold-solid' | 'handmark' | 'bubble' | 'retro-caps' | 'script-hand';

export interface LogoDef {
  id: LogoId;
  label: string;
  node: React.ReactNode;
}

export const ALL_LOGOS: LogoDef[] = [
  { id: 'italic-outline', label: 'Italic Outline',  node: <LogoItalicOutline /> },
  { id: 'bold-solid',     label: 'Bold Solid',      node: <LogoBoldSolid /> },
  { id: 'handmark',       label: 'Handmark',         node: <LogoHandmark /> },
  { id: 'bubble',         label: 'Bubble Sticker',   node: <LogoBubble /> },
  { id: 'retro-caps',     label: 'Retro Caps',       node: <LogoRetroCaps /> },
  { id: 'script-hand',    label: 'Script + Hand',    node: <LogoScriptHand /> },
];

const STORAGE_KEY = 'seshaa-logo-rotation';
const DEFAULT_ENABLED: LogoId[] = ALL_LOGOS.map(l => l.id);

function loadEnabled(): LogoId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ENABLED;
    const parsed = JSON.parse(raw) as LogoId[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_ENABLED;
    return parsed;
  } catch {
    return DEFAULT_ENABLED;
  }
}

export function saveEnabled(ids: LogoId[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  /** Extra class on the outer div */
  className?: string;
  /**
   * Fixed pixel width. If omitted the component fills 100% of its container,
   * so the parent controls sizing (use Tailwind responsive classes on the parent).
   */
  width?: number;
}

export default function LogoRotator({ className = '', width }: Props) {
  const [enabled, setEnabled] = useState<LogoId[]>(loadEnabled);
  const [idx, setIdx]         = useState(0);
  const [fade, setFade]       = useState(true);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-read when localStorage changes (admin toggle fires a storage event)
  useEffect(() => {
    const onStorage = () => setEnabled(loadEnabled());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 9-second rotation with fade transition
  useEffect(() => {
    if (enabled.length <= 1) return;

    const tick = () => {
      setFade(false);
      timerRef.current = setTimeout(() => {
        setIdx(i => (i + 1) % enabled.length);
        setFade(true);
      }, 350); // fade-out duration
    };

    const interval = setInterval(tick, 9000);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled]);

  // When enabled list changes, clamp index
  useEffect(() => {
    setIdx(i => Math.min(i, Math.max(enabled.length - 1, 0)));
  }, [enabled]);

  const activeId = enabled[idx] ?? enabled[0] ?? 'italic-outline';
  const logo = ALL_LOGOS.find(l => l.id === activeId) ?? ALL_LOGOS[0];

  return (
    <div
      className={className}
      style={{
        width: width != null ? width : '100%',
        transition: 'opacity 0.35s ease',
        opacity: fade ? 1 : 0,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {logo.node}
    </div>
  );
}
