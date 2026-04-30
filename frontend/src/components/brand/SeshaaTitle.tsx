/**
 * SeshaaTitle — animated "seshaa.[country]" title.
 *
 * On mount: slot-machines fast through all African countries,
 * slows down, lands on "seshaa.africa".
 * Then transitions to the user's active country code in local spelling.
 *
 * Used in Navbar (compact) and AuthPage (larger).
 */
import { useState, useEffect, useRef } from 'react';

// ── Country suffixes in local / official language ─────────────────────────────
export const COUNTRY_SLUGS: Record<string, string> = {
  DZ: 'al-jazāʾir',   // Arabic
  AO: 'angola',
  BJ: 'bénin',
  BW: 'botswana',
  BF: 'burkina-faso',
  BI: 'burundi',
  CV: 'cabo-verde',
  CM: 'kamerun',      // French/Fulfulde
  CF: 'ködörösêse',
  TD: 'tchad',
  KM: 'komori',
  CD: 'kongo',
  CG: 'kongo',
  CI: "côte-d'ivoire",
  DJ: 'jabuuti',
  EG: 'miṣr',         // Arabic
  GQ: 'guinea',
  ER: 'eritrea',
  ET: 'ityop̣p̣əya',   // Amharic
  GA: 'gabon',
  GM: 'gambia',
  GH: 'ghana',
  GN: 'gine',
  GW: 'guiné-bissau',
  KE: 'kenya',
  LS: 'lesotho',
  LR: 'liberia',
  LY: 'lībīyā',       // Arabic
  MG: 'madagasikara',
  MW: 'malawi',
  ML: 'mali',
  MR: 'mūrītāniyā',
  MU: 'moris',        // Creole
  MA: 'al-maġrib',    // Arabic
  MZ: 'moçambique',
  NA: 'namibia',
  NE: 'nizhèr',       // Hausa
  NG: 'naìjíríà',     // Yoruba
  RW: 'u-rwanda',
  ST: 'são-tomé',
  SN: 'sénégal',
  SL: 'sierra-leone',
  SO: 'soomaaliya',
  ZA: 'mzansi',       // Zulu
  SS: 'south-sudan',
  SD: 'as-sūdān',     // Arabic
  SZ: 'eswatini',
  TZ: 'tanzania',
  TG: 'togo',
  TN: 'tūnis',        // Arabic
  UG: 'yuganda',      // Luganda
  ZM: 'zambia',
  ZW: 'zimbabwe',
};

// Flat array for the slot machine (shuffled feel)
const SLOT_LIST = Object.values(COUNTRY_SLUGS);

interface Props {
  /** country ISO-2 from theme store — null before selection */
  countryCode?: string;
  /** visual size */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_STYLES = {
  sm: { main: '1.05rem', dot: '0.95rem', height: 32 },
  md: { main: '1.5rem',  dot: '1.3rem',  height: 44 },
  lg: { main: '2.2rem',  dot: '2rem',    height: 64 },
};

export default function SeshaaTitle({ countryCode, size = 'sm', className = '' }: Props) {
  const [suffix, setSuffix]     = useState(SLOT_LIST[0]);
  const [fading, setFading]     = useState(false);
  const [settled, setSettled]   = useState(false);
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const idxRef                  = useRef(0);

  const { main, dot, height } = SIZE_STYLES[size];

  // Final suffix: prefer user's country; fallback to "africa"
  const finalSuffix = countryCode
    ? (COUNTRY_SLUGS[countryCode.toUpperCase()] ?? countryCode.toLowerCase())
    : 'africa';

  // ── Slot machine on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let speed = 60;           // ms per tick — starts fast
    let ticks = 0;
    const totalFast = 28;     // how many fast ticks before slowing
    const totalSlow = 12;     // slow ticks before landing

    const tick = () => {
      ticks++;

      if (ticks <= totalFast) {
        // Fast phase: cycle through list
        idxRef.current = (idxRef.current + 1) % SLOT_LIST.length;
        setSuffix(SLOT_LIST[idxRef.current]);
        speed = 60;
      } else if (ticks <= totalFast + totalSlow) {
        // Slow-down phase
        idxRef.current = (idxRef.current + 1) % SLOT_LIST.length;
        setSuffix(SLOT_LIST[idxRef.current]);
        speed = 60 + (ticks - totalFast) * 30; // 90ms → 420ms
      } else {
        // Land
        clearInterval(intervalRef.current!);
        setFading(true);
        setTimeout(() => {
          setSuffix(finalSuffix);
          setFading(false);
          setSettled(true);
        }, 250);
        return;
      }

      // Restart with new speed
      clearInterval(intervalRef.current!);
      intervalRef.current = setInterval(tick, speed);
    };

    intervalRef.current = setInterval(tick, speed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── When country changes after settled — smooth crossfade ─────────────────
  useEffect(() => {
    if (!settled) return;
    setFading(true);
    const t = setTimeout(() => {
      setSuffix(finalSuffix);
      setFading(false);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalSuffix, settled]);

  return (
    <div
      className={`flex items-baseline gap-0 select-none ${className}`}
      style={{ height, lineHeight: 1 }}
    >
      {/* "seshaa" — always visible, bold italic white-outlined green */}
      <span
        style={{
          fontSize: main,
          fontWeight: 900,
          fontStyle: 'italic',
          fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif',
          color: '#008751',
          WebkitTextStroke: '1.5px white',
          paintOrder: 'stroke fill',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        seshaa
      </span>

      {/* ".[country]" — fades during transitions */}
      <span
        style={{
          fontSize: dot,
          fontWeight: 700,
          fontStyle: 'italic',
          fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif',
          color: 'white',
          opacity: fading ? 0 : 0.9,
          transition: 'opacity 0.25s ease',
          lineHeight: 1,
          letterSpacing: '-0.01em',
        }}
      >
        .{suffix}
      </span>
    </div>
  );
}
