/**
 * Seshaa Service Worker — v2
 * Cache-first for static assets; network-first for pages; skip API calls.
 */
const CACHE = 'seshaa-v2';
const PRECACHE = ['/', '/index.html', '/favicon.svg', '/manifest.json', '/og-image.svg'];

// ── Install: pre-cache shell assets ───────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: strategy per request type ─────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Skip: API calls, cross-origin (YouTube, CDNs, etc.)
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) return;

  // Static assets (JS, CSS, images, fonts): cache-first
  const isStatic = /\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf|ico)(\?|$)/i.test(url.pathname);
  if (isStatic) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // HTML navigation: network-first, fall back to cached /index.html for SPA
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      })
      .catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
  );
});
