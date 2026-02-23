/**
 * usePWA Hook
 * React hook for PWA functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { getPWAStatus, PWAStatus, browserSupportsServiceWorker } from '@/lib/pwa/utils';
import { registerServiceWorker, unregisterServiceWorker } from '@/lib/pwa/service-worker';

export interface UsePWAReturn {
  status: PWAStatus;
  isReady: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => void;
}

export function usePWA(): UsePWAReturn {
  const [status, setStatus] = useState<PWAStatus>(getPWAStatus());
  const [isReady, setIsReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Update status on mount and when online/offline changes
  useEffect(() => {
    const updateStatus = () => {
      setStatus(getPWAStatus());
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = () => updateStatus();
    mediaQuery.addEventListener('change', handleDisplayChange);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      mediaQuery.removeEventListener('change', handleDisplayChange);
    };
  }, []);

  // Register service worker
  const register = useCallback(async () => {
    if (!browserSupportsServiceWorker()) {
      console.warn('[usePWA] Service Worker not supported');
      return;
    }

    const result = await registerServiceWorker();
    if (result.registration) {
      setRegistration(result.registration);
      setIsReady(true);
    }
  }, []);

  // Unregister service worker
  const unregister = useCallback(async () => {
    const success = await unregisterServiceWorker();
    if (success) {
      setRegistration(null);
      setIsReady(false);
    }
  }, []);

  // Check for updates
  const update = useCallback(async () => {
    if (!registration) return;
    await registration.update();
  }, [registration]);

  // Skip waiting for update
  const skipWaiting = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage('SKIP_WAITING');
    }
  }, [registration]);

  // Listen for service worker updates
  useEffect(() => {
    const handleUpdate = (event: Event) => {
      setUpdateAvailable(true);
    };

    window.addEventListener('sw-update', handleUpdate);

    return () => {
      window.removeEventListener('sw-update', handleUpdate);
    };
  }, []);

  // Auto-register on mount
  useEffect(() => {
    register();
  }, [register]);

  return {
    status,
    isReady,
    registration,
    updateAvailable,
    register,
    unregister,
    update,
    skipWaiting,
  };
}
