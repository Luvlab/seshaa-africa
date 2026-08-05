import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SeshaaTitle from '../brand/SeshaaTitle';
import { useThemeStore } from '../../store/theme';

// ── Font-size persistence helpers ────────────────────────────────────────────
const FS_KEY   = 'seshaa-font-size';
const FS_MIN   = 13;
const FS_MAX   = 22;
const FS_DEF   = 16;

function readFontSize(): number {
  const stored = parseInt(localStorage.getItem(FS_KEY) ?? '', 10);
  return isNaN(stored) ? FS_DEF : Math.min(FS_MAX, Math.max(FS_MIN, stored));
}
function applyFontSize(px: number) {
  document.documentElement.style.fontSize = px + 'px';
  localStorage.setItem(FS_KEY, String(px));
}

export function initFontSize() {
  applyFontSize(readFontSize());
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Footer() {
  const { t } = useTranslation();
  const { countryCode } = useThemeStore();
  const [fontSize, setFontSize] = useState(readFontSize);

  // Sync on mount (in case App.tsx already applied it; keep state in sync)
  useEffect(() => { setFontSize(readFontSize()); }, []);

  const handleFontSize = (val: number) => {
    setFontSize(val);
    applyFontSize(val);
  };

  return (
    <footer className="w-full bg-gray-900 text-gray-300">

      {/* ── Main link columns ─────────────────────────────────────────── */}
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-10 pb-6
                      grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">

        {/* Brand */}
        <div className="col-span-2 sm:col-span-1">
          <div className="mb-3">
            <SeshaaTitle countryCode={countryCode} size="md" />
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">{t('app.tagline')}</p>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            <span className="text-gray-300 font-medium italic">"seshaa"</span> means{' '}
            <span className="text-gray-300 font-medium">"to search"</span> in{' '}
            <span className="text-gray-300 font-medium">Zulu</span> — one of the 11 official
            languages of South Africa.&nbsp;🇿🇦
          </p>
        </div>

        {/* Directory */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">{t('nav.search')}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/search?type=BUSINESS"  className="hover:text-white transition-colors">{t('listing.business')}</Link></li>
            <li><Link to="/search?type=PERSONAL"  className="hover:text-white transition-colors">{t('listing.personal')}</Link></li>
            <li><Link to="/search?type=GOVERNMENT"className="hover:text-white transition-colors">{t('listing.government')}</Link></li>
            <li><Link to="/search?type=NGO"       className="hover:text-white transition-colors">{t('listing.ngo')}</Link></li>
            <li><Link to="/add-listing"           className="hover:text-white transition-colors">{t('listing.addNew')}</Link></li>
          </ul>
        </div>

        {/* Partners */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Partners</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/advertise"  className="hover:text-white transition-colors">{t('nav.advertise')}</Link></li>
            <li><Link to="/salesrep"   className="hover:text-white transition-colors">{t('salesrep.title')}</Link></li>
            <li><Link to="/diaspora"   className="hover:text-white transition-colors">seshaa.diaspora</Link></li>
            <li><Link to="/pro"        className="hover:text-white transition-colors">Listings Pro</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about"   className="hover:text-white transition-colors">{t('footer.about')}</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">{t('footer.privacy')}</Link></li>
            <li><Link to="/terms"   className="hover:text-white transition-colors">{t('footer.terms')}</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">{t('footer.contact')}</Link></li>
          </ul>
        </div>
      </div>

      {/* ── Accessibility: font-size slider ──────────────────────────── */}
      <div className="w-full border-t border-gray-800">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-4
                        flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">

          {/* Label */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-gray-500 text-xs" aria-hidden="true">A</span>
            <span className="text-gray-300 text-base font-semibold" aria-hidden="true">A</span>
            <span className="text-xs text-gray-500 ml-1 hidden sm:inline">Text Size</span>
          </div>

          {/* Slider */}
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <input
              id="font-size-slider"
              type="range"
              min={FS_MIN}
              max={FS_MAX}
              step={1}
              value={fontSize}
              onChange={e => handleFontSize(Number(e.target.value))}
              aria-label="Adjust text size for accessibility"
              className="flex-1 h-1.5 cursor-pointer"
              style={{ accentColor: 'var(--cp)', minWidth: 80, maxWidth: 220 }}
            />
            <span className="text-xs text-gray-500 tabular-nums w-10 shrink-0">
              {fontSize}px
            </span>
            {fontSize !== FS_DEF && (
              <button
                onClick={() => handleFontSize(FS_DEF)}
                className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors shrink-0"
                aria-label="Reset text size to default"
              >
                Reset
              </button>
            )}
          </div>

          {/* Hint */}
          <span className="text-xs text-gray-600 hidden md:block shrink-0">
            Visually impaired? Adjust text size above.
          </span>
        </div>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────────── */}
      <div className="w-full border-t border-gray-800">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-4
                        flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 overflow-hidden">
          <span className="text-center sm:text-left">{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          <span className="flex flex-wrap justify-center gap-x-1 gap-y-1 text-base leading-none max-w-full">
            🇳🇬 🇰🇪 🇿🇦 🇬🇭 🇪🇹 🇹🇿 🇸🇳 🇨🇮 🇨🇲 🇲🇱 🇬🇳 🇷🇼 🇺🇬 🇩🇿 🇲🇦 🇪🇬
          </span>
        </div>
      </div>
    </footer>
  );
}
