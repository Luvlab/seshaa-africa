import { useState, useEffect } from 'react';

// Module-level flag: was there already an active SW when the page first loaded?
// null = not yet checked (before the effect runs)
let _initialController: boolean | null = null;

export function usePWAUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Snapshot whether there was already a controller (= returning user with existing SW).
    // If there was no controller, this is a fresh install — don't show "new update" yet.
    if (_initialController === null) {
      _initialController = !!navigator.serviceWorker.controller;
    }

    const handleControllerChange = () => {
      if (_initialController) {
        // An existing SW was replaced → real update available
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
    applyUpdate: () => window.location.reload(),
    dismiss: () => setUpdateReady(false),
  };
}
