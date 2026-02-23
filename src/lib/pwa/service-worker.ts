/**
 * PWA Service Worker Registration
 * Handles SW registration, updates, and communication
 */

const SW_PATH = '/sw.js';

export interface SWRegistrationResult {
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<SWRegistrationResult> {
  if (!('serviceWorker' in navigator)) {
    return { registration: null, error: new Error('Service Worker not supported') };
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
      updateViaCache: 'imports',
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          console.log('[PWA] New version available');
          window.dispatchEvent(new CustomEvent('sw-update', { detail: { registration } }));
        }
      });
    });

    return { registration, error: null };
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return { registration: null, error: error as Error };
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('[PWA] Service Worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('[PWA] Service Worker unregister failed:', error);
    return false;
  }
}

/**
 * Update the service worker
 */
export async function updateServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.log('[PWA] Service Worker update check completed');
    return true;
  } catch (error) {
    console.error('[PWA] Service Worker update failed:', error);
    return false;
  }
}

/**
 * Skip waiting and activate new service worker
 */
export async function skipWaiting(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage('SKIP_WAITING');
  }
}

/**
 * Cache specific URLs
 */
export async function cacheUrls(urls: string[]): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'CACHE_URLS',
        urls,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Cache URLs failed:', error);
    return false;
  }
}

/**
 * Check if app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

/**
 * Check online status
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}
