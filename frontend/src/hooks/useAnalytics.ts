/**
 * useAnalytics.ts — client-side behaviour tracking
 *
 * Tracks for ALL users (fire-and-forget, never blocks UI):
 *   pageview, search, click, scroll (25/50/75/100%), session_start/end
 *
 * Tracks for ADMIN users in addition:
 *   keystroke_wpm  — rolling WPM sampled every 10 s (no key content, only count)
 *   admin_action   — any notable admin button click
 *
 * Usage:
 *   const { trackClick, trackSearch, trackAdminAction } = useAnalytics();
 *
 * Automatic:
 *   - Call usePageview() in each page/tab component — fires once on mount.
 *   - useAnalytics() at app root wires up scroll + session tracking.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import api from '../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem('seshaa-session-id');
  if (!sid) {
    sid = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('seshaa-session-id', sid);
  }
  return sid;
}

function getDevice(): string {
  const w = window.innerWidth;
  if (w < 640)  return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getCountry(): string | undefined {
  try {
    const stored = localStorage.getItem('seshaa-theme');
    if (stored) {
      const { state } = JSON.parse(stored);
      return state?.countryCode ?? undefined;
    }
  } catch {}
  return undefined;
}

async function postEvent(eventType: string, fields?: Record<string, unknown>) {
  try {
    await api.post('/analytics/event', {
      eventType,
      sessionId: getOrCreateSessionId(),
      device:    getDevice(),
      country:   getCountry(),
      ...fields,
    });
  } catch {
    // fire-and-forget — never throw
  }
}

// Batch queue: collected events sent every 5 seconds to reduce requests
let _queue: Record<string, unknown>[] = [];
let _queueTimer: ReturnType<typeof setTimeout> | null = null;

function enqueue(eventType: string, fields?: Record<string, unknown>) {
  _queue.push({
    eventType,
    sessionId: getOrCreateSessionId(),
    device:    getDevice(),
    country:   getCountry(),
    ...(fields ?? {}),
  });
  if (!_queueTimer) {
    _queueTimer = setTimeout(() => {
      const batch = _queue.splice(0);
      _queueTimer = null;
      if (batch.length) {
        api.post('/analytics/batch', { events: batch }).catch(() => {});
      }
    }, 5000);
  }
}

// ── Pageview hook (call once per route component) ─────────────────────────────
export function usePageview() {
  const { pathname } = useLocation();
  useEffect(() => {
    enqueue('pageview', { path: pathname });
  }, [pathname]);
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useAnalytics() {
  const { user } = useAuthStore();
  const isAdmin   = user?.role === 'ADMIN';
  const { pathname } = useLocation();

  // ── Scroll depth tracking ─────────────────────────────────────────────────
  const scrollMilestones = useRef<Set<number>>(new Set());
  useEffect(() => {
    scrollMilestones.current = new Set(); // reset on route change
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      const el   = document.documentElement;
      const pct  = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
      [25, 50, 75, 100].forEach(m => {
        if (pct >= m && !scrollMilestones.current.has(m)) {
          scrollMilestones.current.add(m);
          enqueue('scroll', { path: pathname, value: String(m) });
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  // ── Session start / end ───────────────────────────────────────────────────
  useEffect(() => {
    const sid = getOrCreateSessionId();
    if (!sessionStorage.getItem('seshaa-session-started')) {
      sessionStorage.setItem('seshaa-session-started', Date.now().toString());
      postEvent('session_start', { path: pathname });
    }
    const onUnload = () => {
      const start = sessionStorage.getItem('seshaa-session-started');
      const dur   = start ? Math.round((Date.now() - parseInt(start)) / 1000) : 0;
      void sid;
      // Use sendBeacon if available for reliable unload posting
      const payload = JSON.stringify({
        events: [{
          eventType: 'session_end',
          sessionId: getOrCreateSessionId(),
          device:    getDevice(),
          value:     String(dur),
        }],
      });
      if (navigator.sendBeacon) {
        const base = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
        navigator.sendBeacon(`${base}/analytics/batch`, new Blob([payload], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Admin keystroke WPM tracker ───────────────────────────────────────────
  const keystrokeCount = useRef(0);
  const wpmTimer       = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const onKey = () => { keystrokeCount.current += 1; };
    window.addEventListener('keydown', onKey);

    wpmTimer.current = setInterval(() => {
      if (keystrokeCount.current > 0) {
        // Rough WPM: avg 5 chars/word, sampled over 10 s = *6 to get per-minute
        const wpm = Math.round((keystrokeCount.current / 5) * 6);
        keystrokeCount.current = 0;
        enqueue('keystroke_wpm', { path: pathname, value: String(wpm) });
      }
    }, 10_000);

    return () => {
      window.removeEventListener('keydown', onKey);
      if (wpmTimer.current) clearInterval(wpmTimer.current);
    };
  }, [isAdmin, pathname]);

  // ── Admin click counter ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    let clickCount = 0;
    const onClick = () => { clickCount += 1; };
    window.addEventListener('click', onClick);

    const clickFlush = setInterval(() => {
      if (clickCount > 0) {
        enqueue('admin_action', { path: pathname, target: 'click', value: String(clickCount) });
        clickCount = 0;
      }
    }, 30_000);

    return () => {
      window.removeEventListener('click', onClick);
      clearInterval(clickFlush);
    };
  }, [isAdmin, pathname]);

  // ── Public API ────────────────────────────────────────────────────────────
  const trackClick = useCallback((target: string, metadata?: unknown) => {
    enqueue('click', { path: pathname, target, metadata });
  }, [pathname]);

  const trackSearch = useCallback((query: string) => {
    enqueue('search', { path: pathname, value: query });
  }, [pathname]);

  const trackAdminAction = useCallback((target: string, metadata?: unknown) => {
    if (!isAdmin) return;
    postEvent('admin_action', { path: pathname, target, metadata });
  }, [isAdmin, pathname]);

  return { trackClick, trackSearch, trackAdminAction };
}

export default useAnalytics;
