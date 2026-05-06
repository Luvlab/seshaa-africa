/**
 * NewsArticlePage — Seshaa internal article reader.
 * Shows article preview (title, image, summary, source) and gives a
 * prominent "Read on [Source]" CTA rather than sending users directly
 * to the external link from the news feed.
 *
 * URL params (all URLEncoded):
 *   link        — original article URL
 *   title       — article headline
 *   source      — outlet name
 *   country     — source country
 *   summary     — article excerpt
 *   image       — cover image URL
 *   publishedAt — ISO date string
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, ArrowLeft, Clock, Globe, Newspaper } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m  = Math.floor(ms / 60000);
  if (m < 2)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NewsArticlePage() {
  const { t } = useTranslation();
  const [params]      = useSearchParams();
  const link          = params.get('link')        || '';
  const title         = params.get('title')       || '';
  const source        = params.get('source')      || '';
  const country       = params.get('country')     || '';
  const summary       = params.get('summary')     || '';
  const image         = params.get('image')       || '';
  const publishedAt   = params.get('publishedAt') || '';

  const [imgError, setImgError] = useState(false);

  if (!link && !title) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <Newspaper size={56} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">{t('news.articleNotFound')}</h2>
        <p className="text-sm text-gray-500 mb-6">{t('news.articleExpired')}</p>
        <a href="/news" className="px-5 py-2.5 rounded-full text-white font-semibold text-sm"
          style={{ backgroundColor: 'var(--cp,#008751)' }}>
          ← {t('news.backToNews')}
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky top bar ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/news"
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors shrink-0">
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">{t('news.backToNews')}</span>
          </a>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--cp,#008751)' }}>
              {source}{country ? ` · ${country}` : ''}
            </p>
          </div>

          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-white shrink-0 transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--cp,#008751)' }}>
              <Globe size={12} /> {t('news.readOriginal')} <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* ── Article body ─────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Hero image */}
        {image && !imgError && (
          <div className="mb-6 rounded-xl overflow-hidden bg-gray-200 aspect-video">
            <img src={image} alt={title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)} />
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
          {source && (
            <span className="text-sm font-black uppercase tracking-widest px-2.5 py-0.5 rounded text-white"
              style={{ backgroundColor: 'var(--cp,#008751)' }}>
              {source}
            </span>
          )}
          {country && (
            <span className="text-sm text-gray-500 font-medium">{country}</span>
          )}
          {publishedAt && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} /> {timeAgo(publishedAt)}
              <span className="ml-1 opacity-60">
                · {new Date(publishedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </span>
          )}
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight mb-5">
          {title}
        </h1>

        {/* Summary / excerpt */}
        {summary ? (
          <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-8 border-l-4 pl-4"
            style={{ borderColor: 'var(--ca,#FCD116)' }}>
            {summary}
          </p>
        ) : (
          <p className="text-gray-400 italic text-sm mb-8">{t('news.noPreview')}</p>
        )}

        {/* ── Read full article CTA ────────────────────────────────────────── */}
        {link && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
            <div className="text-3xl mb-3">📰</div>
            <p className="text-gray-600 text-sm mb-1">{t('news.previewText')}</p>
            <p className="font-black text-lg mb-5" style={{ color: 'var(--cp,#008751)' }}>
              {source || new URL(link).hostname}
            </p>
            <a href={link} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-white font-bold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--cp,#008751)' }}>
              <Globe size={16} />
              {t('news.openOn', { source: source || 'original site' })}
              <ExternalLink size={14} />
            </a>
            <p className="text-xs text-gray-400 mt-4">
              {t('news.openInNewTab', { source })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
