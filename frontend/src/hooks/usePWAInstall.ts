/**
 * usePWAInstall — captures the browser's beforeinstallprompt event
 * and exposes an install() trigger + state flags.
 *
 * Usage:
 *   const { isInstallable, isInstalled, install } = usePWAInstall();
 *
 * Notes:
 * - isInstallable = true only when the browser decides the PWA criteria are met
 *   (manifest, SW, HTTPS) AND the user hasn't already installed it.
 * - isInstalled = true when running in standalone mode (already on home screen)
 *   or after the user accepts the install prompt in the current session.
 */
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Keep the deferred prompt in module scope so it survives re-renders.
let _deferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState<boolean>(() => !!_deferredPrompt);
  const [isInstalled,   setIsInstalled]   = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    // Already in standalone → treat as installed, hide prompt
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      _deferredPrompt = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      _deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async (): Promise<void> => {
    if (!_deferredPrompt) return;
    await _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
      _deferredPrompt = null;
    }
  };

  return { isInstallable, isInstalled, install };
}

export default usePWAInstall;
