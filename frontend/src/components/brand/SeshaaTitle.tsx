/**
 * SeshaaTitle — animated "seshaa.[country]" title.
 *
 * Startup: fast slot-machine through all 54 African countries,
 * slows down, lands on the active country (or "africa" if none).
 * When country changes later: crossfades to the new country name.
 *
 * Colors follow the active country's flag:
 *   "seshaa" fill  → --cs (flag secondary, e.g. yellow/white)
 *   "seshaa" stroke → --ca (flag accent, e.g. red)
 *   ".country" fill → --ca
 *
 * Admin panel can override stroke thickness via --logo-stroke.
 * Admin panel can override font sizes via --logo-main-size / --logo-dot-size.
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// ── English slugs — used for slot machine + settled display ─────────────────
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

// ── Local-language slugs — future use ───────────────────────────────────────
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
  sm: { main: '1.28rem', dot: '1.28rem' },
  md: { main: 'clamp(1.26rem, 3.9vw, 1.95rem)', dot: 'clamp(1.26rem, 3.9vw, 1.95rem)' },
  lg: { main: '2.4rem',  dot: '2.4rem'  },
};

/** Return the display slug for a country code, or "africa" for '' / unknown */
function slugFor(code: string | undefined): string {
  if (!code) return 'africa';
  return ENGLISH_SLUGS[code] ?? 'africa';
}

export default function SeshaaTitle({ countryCode, size = 'sm', className = '', staticSuffix }: Props) {
  useTranslation(); // keep for future language-aware extensions

  const isStatic = staticSuffix !== undefined;

  const [suffix, setSuffix]   = useState(isStatic ? staticSuffix : SLOT_LIST[0]);
  const [fading, setFading]   = useState(false);
  const [settled, setSettled] = useState(isStatic);

  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ivRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const idxRef        = useRef(0);
  const prevCode      = useRef(countryCode);
  const prevStatic    = useRef(staticSuffix);

  // CSS-var overrides let the Admin branding panel adjust sizes live
  const fallback = SIZE[size] ?? SIZE.sm;
  const main = size === 'md' ? `var(--logo-main-size, ${fallback.main})` : fallback.main;
  // Keep suffix exactly the same size as "seshaa" in the header title.
  const dot = main;

  // ── Slot-machine on mount (skipped in static mode) ──────────────────────
  useEffect(() => {
    if (isStatic) return;

    const FAST_TICKS = 36;  // more ticks, faster feel
    const SLOW_TICKS = 10;  // quick deceleration at the end
    let ticks = 0;

    const run = (delay: number) => {
      ivRef.current = setInterval(() => {
        ticks++;
        idxRef.current = (idxRef.current + 1) % SLOT_LIST.length;
        setSuffix(SLOT_LIST[idxRef.current]);
        clearInterval(ivRef.current!);

        if (ticks < FAST_TICKS) {
          run(30);  // faster: 30ms per tick (was 55ms)
        } else if (ticks < FAST_TICKS + SLOW_TICKS) {
          // Decelerate: 60ms → 360ms over 10 ticks
          run(60 + (ticks - FAST_TICKS) * 30);
        } else {
          // ① Land on "africa" immediately
          setFading(true);
          timerRef.current = setTimeout(() => {
            setSuffix('africa');
            setFading(false);

            // ② Hold "africa" for 3 seconds, then go to actual country
            timerRef.current = setTimeout(() => {
              const target = slugFor(countryCode);
              if (target !== 'africa') {
                setFading(true);
                timerRef.current = setTimeout(() => {
                  setSuffix(target);
                  setFading(false);
                  setSettled(true);
                }, 260);
              } else {
                setSettled(true);
              }
            }, 3000);
          }, 260);
        }
      }, delay);
    };

    run(30);
    return () => {
      clearInterval(ivRef.current!);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── React to staticSuffix changes (e.g. Navbar page-aware title) ───────────
  useEffect(() => {
    if (prevStatic.current === staticSuffix) return; // no change on mount
    prevStatic.current = staticSuffix;

    const target = staticSuffix !== undefined ? staticSuffix : slugFor(countryCode);
    setFading(true);
    timerRef.current = setTimeout(() => {
      setSuffix(target);
      setFading(false);
      setSettled(true);
    }, 220);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [staticSuffix]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to country changes after settling ──────────────────────────────
  useEffect(() => {
    if (!settled || staticSuffix !== undefined) return; // skip if page suffix active
    if (countryCode === prevCode.current) return;
    prevCode.current = countryCode;

    const target = slugFor(countryCode);
    if (suffix === target) return;

    setFading(true);
    timerRef.current = setTimeout(() => {
      setSuffix(target);
      setFading(false);
    }, 220);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [countryCode, settled, staticSuffix]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`flex items-center gap-0 select-none leading-none ${className}`}>

      {/* "seshaa" — secondary (flag) fill, accent (flag) outline */}
      <span
        style={{
          fontSize: main,
          fontWeight: 900,
          fontStyle: 'italic',
          fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif',
          color: 'var(--cs, white)',
          WebkitTextStroke: '0px transparent',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        seshaa
      </span>

      {/* ".[country]" — accent (flag) color, fades on transitions */}
      <span
        style={{
          fontSize: dot,
          fontWeight: 700,
          fontStyle: 'italic',
          fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif',
          color: 'var(--ca, #FCD116)',
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.22s ease',
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
