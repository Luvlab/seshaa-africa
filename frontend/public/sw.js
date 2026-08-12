/**
 * Seshaa Service Worker — v4
 * Cache-first for static assets; network-first for pages; skip API calls.
 * Update flow: waits for explicit SKIP_WAITING message (no auto-takeover).
 */
const CACHE = 'seshaa-v4';
const PRECACHE = ['/', '/index.html', '/favicon.svg', '/manifest.json', '/og-image.svg'];

// ── Install: pre-cache shell assets. Do NOT call skipWaiting() here —
// the page will send SKIP_WAITING when the user clicks the update banner.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
});

// ── Activate: remove old caches then claim existing clients ───────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Message: page sends SKIP_WAITING to trigger the update ───────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
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
