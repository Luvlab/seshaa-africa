/**
 * SeshaaTitle — animated "seshaa.[country]" title.
 *
 * Startup: fast slot-machine through all 54 African countries in English,
 * slows down, ALWAYS lands on "seshaa.africa".
 * After 1.5 s: if a country is active, crossfades to that country's name
 * in the current UI language (English → "nigeria", French → "sénégal", etc.)
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// ── English slugs — used for slot machine + settled display when lang = en ──
export const ENGLISH_SLUGS: Record<string, string> = {
  DZ: 'algeria',      AO: 'angola',        BJ: 'benin',
  BW: 'botswana',     BF: 'burkina-faso',  BI: 'burundi',
  CV: 'cabo-verde',   CM: 'cameroon',      CF: 'central-africa',
  TD: 'chad',         KM: 'comoros',       CD: 'dr-congo',
  CG: 'congo',        CI: 'ivory-coast',   DJ: 'djibouti',
  EG: 'egypt',        GQ: 'eq-guinea',     ER: 'eritrea',
  ET: 'ethiopia',     GA: 'gabon',         GM: 'gambia',
  GH: 'ghana',        GN: 'guinea',        GW: 'guinea-bissau',
  KE: 'kenya',        LS: 'lesotho',       LR: 'liberia',
  LY: 'libya',        MG: 'madagascar',    MW: 'malawi',
  ML: 'mali',         MR: 'mauritania',    MU: 'mauritius',
  MA: 'morocco',      MZ: 'mozambique',    NA: 'namibia',
  NE: 'niger',        NG: 'nigeria',       RW: 'rwanda',
  ST: 'sao-tome',     SN: 'senegal',       SL: 'sierra-leone',
  SO: 'somalia',      ZA: 'south-africa',  SS: 'south-sudan',
  SD: 'sudan',        SZ: 'eswatini',      TZ: 'tanzania',
  TG: 'togo',         TN: 'tunisia',       UG: 'uganda',
  ZM: 'zambia',       ZW: 'zimbabwe',
};

// ── Local-language slugs — shown when UI is NOT English ─────────────────────
export const LOCAL_SLUGS: Record<string, string> = {
  DZ: 'al-jazāʾir',   AO: 'angola',        BJ: 'bénin',
  BW: 'botswana',     BF: 'burkina-faso',  BI: 'burundi',
  CV: 'cabo-verde',   CM: 'kamerun',       CF: 'ködörösêse',
  TD: 'tchad',        KM: 'komori',        CD: 'kongo',
  CG: 'kongo',        CI: "côte-d'ivoire", DJ: 'jabuuti',
  EG: 'miṣr',         GQ: 'guinea',        ER: 'eritrea',
  ET: "ityop̣p̣əya",   GA: 'gabon',         GM: 'gambia',
  GH: 'ghana',        GN: 'gine',          GW: 'guiné-bissau',
  KE: 'kenya',        LS: 'lesotho',       LR: 'liberia',
  LY: 'lībīyā',       MG: 'madagasikara',  MW: 'malawi',
  ML: 'mali',         MR: 'mūrītāniyā',    MU: 'moris',
  MA: 'al-maġrib',    MZ: 'moçambique',    NA: 'namibia',
  NE: 'nizhèr',       NG: 'naìjíríà',      RW: 'u-rwanda',
  ST: 'são-tomé',     SN: 'sénégal',       SL: 'sierra-leone',
  SO: 'soomaaliya',   ZA: 'mzansi',        SS: 'south-sudan',
  SD: 'as-sūdān',     SZ: 'eswatini',      TZ: 'tanzania',
  TG: 'togo',         TN: 'tūnis',         UG: 'yuganda',
  ZM: 'zambia',       ZW: 'zimbabwe',
};

// Slot-machine list always uses English (readable at speed)
const SLOT_LIST = Object.values(ENGLISH_SLUGS);

interface Props {
  countryCode?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Skip animation and show this suffix immediately (e.g. "diaspora") */
  staticSuffix?: string;
}

const SIZE: Record<string, { main: string; dot: string }> = {
  sm: { main: '1.28rem', dot: '1.1rem'  },
  md: { main: '1.75rem', dot: '1.5rem'  },
  lg: { main: '2.4rem',  dot: '2.05rem' },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function SeshaaTitle({ countryCode: _cc, size = 'sm', className = '', staticSuffix }: Props) {
  useTranslation(); // keep for future language-aware extensions

  const [suffix, setSuffix] = useState(staticSuffix ?? SLOT_LIST[0]);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ivRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const idxRef   = useRef(0);

  const { main, dot } = SIZE[size] ?? SIZE.sm;

  // ── Slot-machine animation on mount (skipped when staticSuffix is set) ──
  useEffect(() => {
    if (staticSuffix !== undefined) return; // static mode — no animation

    const FAST_TICKS = 30;
    const SLOW_TICKS = 14;
    let ticks = 0;

    const run = (delay: number) => {
      ivRef.current = setInterval(() => {
        ticks++;
        idxRef.current = (idxRef.current + 1) % SLOT_LIST.length;
        setSuffix(SLOT_LIST[idxRef.current]);

        clearInterval(ivRef.current!);

        if (ticks < FAST_TICKS) {
          run(55);
        } else if (ticks < FAST_TICKS + SLOW_TICKS) {
          const extra = (ticks - FAST_TICKS + 1) * 35;
          run(55 + extra);            // 90 ms → 545 ms
        } else {
          // Land on "africa" — stays here permanently
          setFading(true);
          timerRef.current = setTimeout(() => {
            setSuffix('africa');
            setFading(false);
          }, 260);
        }
      }, delay);
    };

    run(55);
    return () => {
      clearInterval(ivRef.current!);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── After settle, always show "africa" — no country transition ──────────

  return (
    <div className={`flex items-center gap-0 select-none leading-none ${className}`}>
      {/* "seshaa" — green fill, white stroke */}
      <span
        style={{
          fontSize: main,
          fontWeight: 900,
          fontStyle: 'italic',
          fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif',
          color: '#008751',
          WebkitTextStroke: '1.5px white',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        seshaa
      </span>

      {/* ".[country]" — white, fades on transitions */}
      <span
        style={{
          fontSize: dot,
          fontWeight: 700,
          fontStyle: 'italic',
          fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif',
          color: 'white',
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.26s ease',
          lineHeight: 1,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        .{suffix}
      </span>
    </div>
  );
}
