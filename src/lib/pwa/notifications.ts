/**
 * PWA Push Notification Utilities
 * Handles notification permissions, subscriptions, and display
 */

import { browserSupportsWebPush } from './utils';

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  const permission = await Notification.requestPermission();
  console.log('[PWA] Notification permission:', permission);
  return permission;
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (!('Notification' in window)) {
    return null;
  }
  return Notification.permission;
}

/**
 * Check if notifications are supported and permitted
 */
export function canShowNotifications(): boolean {
  return getNotificationPermission() === 'granted';
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  applicationServerKey: string
): Promise<PushSubscription | null> {
  if (!browserSupportsWebPush()) {
    throw new Error('Push notifications not supported');
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey) as BufferSource,
      });
      console.log('[PWA] Push subscription created');
    } else {
      console.log('[PWA] Push subscription already exists');
    }

    return subscription;
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!browserSupportsWebPush()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      const result = await subscription.unsubscribe();
      console.log('[PWA] Push unsubscribed:', result);
      return result;
    }
    
    return true;
  } catch (error) {
    console.error('[PWA] Push unsubscribe failed:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!browserSupportsWebPush()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('[PWA] Get subscription failed:', error);
    return null;
  }
}

/**
 * Show a local notification
 */
export function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!canShowNotifications()) {
    console.warn('[PWA] Cannot show notification: permission not granted');
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options,
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error('[PWA] Show notification failed:', error);
    return null;
  }
}

/**
 * Show a notification via service worker
 */
export async function showServiceWorkerNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    // Fallback to local notification
    showLocalNotification(title, options);
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options,
    });
  } catch (error) {
    console.error('[PWA] Service worker notification failed:', error);
    showLocalNotification(title, options);
  }
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Convert push subscription to JSON for server
 */
export function subscriptionToJSON(subscription: PushSubscription): PushSubscriptionData {
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      p256dh: btoa(
        String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))
      ),
      auth: btoa(
        String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))
      ),
    },
  };
}
