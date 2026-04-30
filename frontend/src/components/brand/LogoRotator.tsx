/**
 * LogoRotator — cycles through 6 Seshaa logo variants every 9 seconds.
 * Admin can enable/disable individual variants via AdminPortal → Branding tab.
 * Enabled list stored in localStorage as JSON array under 'seshaa-logo-rotation'.
 */
import { useState, useEffect, useRef } from 'react';

// ── Brand palette ────────────────────────────────────────────────────────────
const G  = '#008751';   // Seshaa green fill
const G2 = '#006640';   // Darker green (taglines)
const W  = 'white';     // White outline

// ── Six logo SVGs — all: italic · white outline · green fill ─────────────────

/** 1 · Arial Black italic — thick white outline, tight */
function LogoItalicOutline() {
  return (
    <svg viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg">
      <text
        x="175" y="41" textAnchor="end"
        fontSize="42" fontWeight="900" fontStyle="italic"
        fontFamily='"Arial Black","Arial Bold",Arial,sans-serif'
        stroke={W} strokeWidth="7" strokeLinejoin="round"
        fill={G} paintOrder="stroke fill"
      >seshaa.</text>
    </svg>
  );
}

/** 2 · Georgia serif italic — white outline, elegant feel */
function LogoBoldSolid() {
  return (
    <svg viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg">
      <text
        x="175" y="42" textAnchor="end"
        fontSize="43" fontWeight="900" fontStyle="italic"
        fontFamily='Georgia,"Times New Roman",serif'
        stroke={W} strokeWidth="6" strokeLinejoin="round"
        fill={G} paintOrder="stroke fill"
      >seshaa.</text>
    </svg>
  );
}

/** 3 · Extra heavy outline — sticker / neon sign effect */
function LogoHandmark() {
  return (
    <svg viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg">
      <text
        x="175" y="41" textAnchor="end"
        fontSize="40" fontWeight="900" fontStyle="italic"
        fontFamily='"Arial Black","Arial Bold",Arial,sans-serif'
        stroke={W} strokeWidth="10" strokeLinejoin="round"
        fill={G} paintOrder="stroke fill"
      >seshaa.</text>
    </svg>
  );
}

/** 4 · With tagline — italic + "and you will find." */
function LogoBubble() {
  return (
    <svg viewBox="0 0 180 54" xmlns="http://www.w3.org/2000/svg">
      <text
        x="175" y="38" textAnchor="end"
        fontSize="38" fontWeight="900" fontStyle="italic"
        fontFamily='"Arial Black","Arial Bold",Arial,sans-serif'
        stroke={W} strokeWidth="6" strokeLinejoin="round"
        fill={G} paintOrder="stroke fill"
      >seshaa.</text>
      <text
        x="175" y="51" textAnchor="end"
        fontSize="9.5" fontWeight="700" fontStyle="italic"
        fontFamily='Arial,sans-serif'
        fill={G2} letterSpacing="0.3"
      >and you will find.</text>
    </svg>
  );
}

/** 5 · Condensed / letter-spaced — italic, white outline */
function LogoRetroCaps() {
  return (
    <svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
      <text
        x="196" y="40" textAnchor="end"
        fontSize="37" fontWeight="900" fontStyle="italic"
        fontFamily='"Arial Black","Arial Bold",Arial,sans-serif'
        stroke={W} strokeWidth="6" strokeLinejoin="round"
        fill={G} paintOrder="stroke fill"
        letterSpacing="2"
      >seshaa.</text>
    </svg>
  );
}

/** 6 · Narrow stroke serif italic — fine white outline */
function LogoScriptHand() {
  return (
    <svg viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg">
      <text
        x="175" y="42" textAnchor="end"
        fontSize="43" fontWeight="900" fontStyle="italic"
        fontFamily='"Palatino Linotype",Palatino,Georgia,serif'
        stroke={W} strokeWidth="5" strokeLinejoin="round"
        fill={G} paintOrder="stroke fill"
      >seshaa.</text>
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
