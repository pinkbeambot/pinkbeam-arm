/**
 * PWA Utility Functions
 * General utilities for PWA functionality
 */

import { isStandalone, isOnline } from './service-worker';
import { checkIOS, checkAndroid, checkMobile } from './install';

export interface PWAStatus {
  isStandalone: boolean;
  isOnline: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  serviceWorkerSupported: boolean;
  pushSupported: boolean;
  notificationsSupported: boolean;
  backgroundSyncSupported: boolean;
}

/**
 * Check if service workers are supported
 */
export function browserSupportsServiceWorker(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Check if push notifications are supported
 */
export function browserSupportsWebPush(): boolean {
  return 'PushManager' in window && 'serviceWorker' in navigator;
}

/**
 * Check if notifications are supported
 */
export function browserSupportsNotifications(): boolean {
  return 'Notification' in window;
}

/**
 * Check if background sync is supported
 */
export function browserSupportsBackgroundSync(): boolean {
  return 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype;
}

/**
 * Check if the browser supports all PWA features
 */
export function browserSupportsPWA(): boolean {
  return browserSupportsServiceWorker() && browserSupportsNotifications();
}

/**
 * Get comprehensive PWA status
 */
export function getPWAStatus(): PWAStatus {
  return {
    isStandalone: isStandalone(),
    isOnline: isOnline(),
    isIOS: checkIOS(),
    isAndroid: checkAndroid(),
    isMobile: checkMobile(),
    serviceWorkerSupported: browserSupportsServiceWorker(),
    pushSupported: browserSupportsWebPush(),
    notificationsSupported: browserSupportsNotifications(),
    backgroundSyncSupported: browserSupportsBackgroundSync(),
  };
}

/**
 * Register for background sync
 */
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  if (!browserSupportsBackgroundSync()) {
    console.warn('[PWA] Background sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } };
    if (!registration.sync) {
      console.warn('[PWA] Sync API not available');
      return false;
    }
    await registration.sync.register(tag);
    console.log('[PWA] Background sync registered:', tag);
    return true;
  } catch (error) {
    console.error('[PWA] Background sync registration failed:', error);
    return false;
  }
}

/**
 * Cache an API response for offline use
 */
export async function cacheAPIResponse(
  url: string, 
  data: unknown
): Promise<boolean> {
  if (!browserSupportsServiceWorker()) {
    return false;
  }

  try {
    const cache = await caches.open('arm-api-cache');
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(url, response);
    return true;
  } catch (error) {
    console.error('[PWA] Cache API response failed:', error);
    return false;
  }
}

/**
 * Get cached API response
 */
export async function getCachedAPIResponse<T>(url: string): Promise<T | null> {
  if (!browserSupportsServiceWorker()) {
    return null;
  }

  try {
    const cache = await caches.open('arm-api-cache');
    const response = await cache.match(url);
    
    if (response) {
      return await response.json() as T;
    }
    
    return null;
  } catch (error) {
    console.error('[PWA] Get cached API response failed:', error);
    return null;
  }
}

/**
 * Share content using Web Share API
 */
export async function shareContent(shareData: ShareData): Promise<boolean> {
  if (!navigator.share) {
    console.warn('[PWA] Web Share API not supported');
    return false;
  }

  try {
    await navigator.share(shareData);
    return true;
  } catch (error) {
    // User cancelled or error
    if ((error as Error).name !== 'AbortError') {
      console.error('[PWA] Share failed:', error);
    }
    return false;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      document.body.removeChild(textArea);
      return false;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('[PWA] Copy to clipboard failed:', error);
    return false;
  }
}

/**
 * Track PWA metrics
 */
export function trackPWAMetric(
  name: string, 
  value: number | string, 
  category = 'PWA'
): void {
  // Send to analytics if available
  if (typeof window !== 'undefined' && (window as Window & { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag!('event', name, {
      event_category: category,
      event_label: String(value),
    });
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get storage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    
    return {
      usage,
      quota,
      percentage: quota > 0 ? (usage / quota) * 100 : 0,
    };
  } catch (error) {
    console.error('[PWA] Storage estimate failed:', error);
    return null;
  }
}
