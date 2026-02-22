/**
 * useInstallPrompt Hook
 * React hook for handling PWA install prompt
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BeforeInstallPromptEvent,
  InstallPromptState,
  checkStandalone,
  checkIOS,
  triggerInstall,
  dismissInstallPrompt,
  trackInstallEvent,
  getIOSInstallInstructions,
  getAndroidInstallInstructions,
} from '@/lib/pwa/install';

export interface UseInstallPromptReturn extends InstallPromptState {
  showPrompt: () => Promise<void>;
  dismissPrompt: () => void;
  instructions: string[];
}

export function useInstallPrompt(): UseInstallPromptReturn {
  const [state, setState] = useState<InstallPromptState>({
    canInstall: false,
    isInstalled: checkStandalone(),
    isIOS: checkIOS(),
    isStandalone: checkStandalone(),
    deferredPrompt: null,
  });

  const [instructions, setInstructions] = useState<string[]>([]);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the default prompt
      event.preventDefault();

      // Store the event for later use
      const deferredPrompt = event as BeforeInstallPromptEvent;
      window.deferredInstallPrompt = deferredPrompt;

      setState((prev) => ({
        ...prev,
        canInstall: true,
        deferredPrompt,
      }));
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log('[useInstallPrompt] App installed');
      
      setState((prev) => ({
        ...prev,
        canInstall: false,
        isInstalled: true,
        isStandalone: true,
        deferredPrompt: null,
      }));

      // Clear the deferred prompt
      dismissInstallPrompt();

      // Track installation
      trackInstallEvent('accepted');
    };

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (event: MediaQueryListEvent) => {
      setState((prev) => ({
        ...prev,
        isStandalone: event.matches,
        isInstalled: event.matches,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener('change', handleDisplayChange);

    // Set initial instructions
    if (checkIOS()) {
      setInstructions(getIOSInstallInstructions());
    } else if (!state.canInstall && !checkStandalone()) {
      setInstructions(getAndroidInstallInstructions());
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayChange);
    };
  }, [state.canInstall]);

  // Show the install prompt
  const showPrompt = useCallback(async () => {
    if (!state.deferredPrompt) {
      console.warn('[useInstallPrompt] No deferred prompt available');
      return;
    }

    try {
      const result = await triggerInstall(state.deferredPrompt);
      trackInstallEvent(result.outcome);

      if (result.outcome === 'accepted') {
        setState((prev) => ({
          ...prev,
          canInstall: false,
          deferredPrompt: null,
        }));
        dismissInstallPrompt();
      }
    } catch (error) {
      console.error('[useInstallPrompt] Install prompt failed:', error);
    }
  }, [state.deferredPrompt]);

  // Dismiss the install prompt
  const dismissPrompt = useCallback(() => {
    dismissInstallPrompt();
    setState((prev) => ({
      ...prev,
      canInstall: false,
      deferredPrompt: null,
    }));
    trackInstallEvent('dismissed');
  }, []);

  return {
    ...state,
    showPrompt,
    dismissPrompt,
    instructions,
  };
}
