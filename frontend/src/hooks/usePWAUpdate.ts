import { useState, useEffect, useRef } from 'react';

export function usePWAUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const setup = (reg: ServiceWorkerRegistration) => {
      // New SW already waiting (e.g. page reloaded mid-install)
      if (reg.waiting && navigator.serviceWorker.controller) {
        regRef.current = reg;
        setUpdateReady(true);
        return;
      }
      // Watch for a new SW being installed
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          // 'installed' = SW is ready but waiting. Only show banner when
          // there was already an active controller (i.e. this is an UPDATE,
          // not the very first install).
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            regRef.current = reg;
            setUpdateReady(true);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration('/').then(reg => {
      if (reg) setup(reg);
    }).catch(() => {});
  }, []);

  const applyUpdate = async () => {
    const reg = regRef.current ?? await navigator.serviceWorker.getRegistration('/').catch(() => undefined);
    if (reg?.waiting) {
      // Tell the waiting SW to skip the wait and take over
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // When the controller changes (new SW took over), reload once
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });
  };

  return {
    updateReady,
    applyUpdate,
    dismiss: () => setUpdateReady(false),
  };
}
