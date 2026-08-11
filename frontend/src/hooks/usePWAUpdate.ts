import { useState, useEffect } from 'react';

// Persists across reload (same tab) so we don't re-show the banner
// after the user already clicked Update and the page reloaded.
const RELOADED_KEY = 'seshaa-sw-reloaded';

let _initialController: boolean | null = null;

export function usePWAUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // We just reloaded for an update — the SW's clients.claim() will fire
    // controllerchange again on this fresh page. Ignore it this time.
    if (sessionStorage.getItem(RELOADED_KEY)) {
      sessionStorage.removeItem(RELOADED_KEY);
      _initialController = !!navigator.serviceWorker.controller;
      return;
    }

    if (_initialController === null) {
      _initialController = !!navigator.serviceWorker.controller;
    }

    const handleControllerChange = () => {
      if (_initialController) {
        setUpdateReady(true);
      }
      _initialController = true;
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return {
    updateReady,
    // Set flag before reload so the reloaded page knows to skip the next controllerchange
    applyUpdate: () => { sessionStorage.setItem(RELOADED_KEY, '1'); window.location.reload(); },
    dismiss: () => setUpdateReady(false),
  };
}
