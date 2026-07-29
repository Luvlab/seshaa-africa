/**
 * SeoHead — manages all <head> meta tags for social sharing & SEO.
 *
 * Render at two levels:
 *   1. Root level in App.tsx with no props → picks up global defaults from useSeoStore.
 *   2. Per-page, e.g. <SeoHead title="Listings in Lagos" /> → overrides just those fields.
 *
 * Works without react-helmet: directly mutates document.head elements via useEffect.
 * Only the fields provided as props override the global store defaults — omitted props
 * fall through to the store value.
 */
import { useEffect } from 'react';
import { useSeoStore, SEO_DEFAULTS } from '../store/seo';

export interface SeoProps {
  title?:        string;
  description?:  string;
  image?:        string;   // full URL to OG image
  url?:          string;   // canonical page URL
  type?:         'website' | 'article' | 'profile'; // og:type
  keywords?:     string;
  author?:       string;
  robots?:       string;
  twitterCard?:  'summary' | 'summary_large_image';
  noIndex?:      boolean;  // shorthand for robots=noindex,nofollow
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setMeta(selector: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    const attr = selector.includes('[name=') ? 'name' : 'property';
    const val  = selector.match(/\["?([^"'\]]+)"?\]/)?.[1] ?? '';
    el.setAttribute(attr, val);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
}

function injectJsonLd(raw: string) {
  let el = document.getElementById('seshaa-jsonld') as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id   = 'seshaa-jsonld';
    document.head.appendChild(el);
  }
  el.textContent = raw;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SeoHead(props: SeoProps) {
  const { config } = useSeoStore();

  useEffect(() => {
    // Merge: explicit prop → store value → hardcoded default
    const title       = props.title       ?? config.title       ?? SEO_DEFAULTS.title;
    const description = props.description ?? config.description ?? SEO_DEFAULTS.description;
    const image       = props.image       ?? config.thumbnailUrl ?? SEO_DEFAULTS.thumbnailUrl;
    const url         = props.url         ?? config.url          ?? SEO_DEFAULTS.url;
    const type        = props.type        ?? 'website';
    const keywords    = props.keywords    ?? config.keywords     ?? SEO_DEFAULTS.keywords;
    const author      = props.author      ?? config.author       ?? SEO_DEFAULTS.author;
    const twitterCard = props.twitterCard ?? config.twitterCard  ?? SEO_DEFAULTS.twitterCard;
    const twitterHdl  = config.twitterHandle ?? SEO_DEFAULTS.twitterHandle;
    const robots      = props.noIndex ? 'noindex,nofollow' : (props.robots ?? config.robots ?? SEO_DEFAULTS.robots);

    // ── Title ──
    document.title = title;
    setMeta('[property="og:title"]',       title);
    setMeta('[name="twitter:title"]',      title);

    // ── Description ──
    setMeta('[name="description"]',           description);
    setMeta('[property="og:description"]',    description);
    setMeta('[name="twitter:description"]',   description);

    // ── Image ──
    setMeta('[property="og:image"]',          image);
    setMeta('[name="twitter:image"]',         image);
    setMeta('[property="og:image:alt"]',      title);

    // ── URL / canonical ──
    setMeta('[property="og:url"]', url);
    setLink('canonical', url);

    // ── Type ──
    setMeta('[property="og:type"]', type);

    // ── Keywords ──
    setMeta('[name="keywords"]', keywords);

    // ── Author ──
    setMeta('[name="author"]', author);

    // ── Robots ──
    setMeta('[name="robots"]', robots);

    // ── Twitter card ──
    setMeta('[name="twitter:card"]', twitterCard);
    setMeta('[name="twitter:site"]', twitterHdl);

    // ── Theme colour (keep in sync with primary) ──
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--cp').trim() || '#008751';
    setMeta('[name="theme-color"]', primaryColor || '#008751');

    // ── JSON-LD ──
    if (config.jsonLd) injectJsonLd(config.jsonLd);

  }, [props, config]);

  return null;
}
