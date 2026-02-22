/**
 * usePushNotifications Hook
 * React hook for managing push notifications
 */

import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  getNotificationPermission,
  canShowNotifications,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
  showLocalNotification,
  showServiceWorkerNotification,
  PushSubscriptionData,
  subscriptionToJSON,
} from '@/lib/pwa/notifications';
import { browserSupportsWebPush } from '@/lib/pwa/utils';

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | null;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  subscriptionData: PushSubscriptionData | null;
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: (applicationServerKey: string) => Promise<void>;
  unsubscribe: () => Promise<void>;
  showNotification: (title: string, options?: NotificationOptions) => void;
  showServiceNotification: (title: string, options?: NotificationOptions) => Promise<void>;
}

export function usePushNotifications(
  applicationServerKey?: string
): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<PushSubscriptionData | null>(null);

  // Check support and initial state
  useEffect(() => {
    const supported = browserSupportsWebPush();
    setIsSupported(supported);

    if (supported) {
      setPermission(getNotificationPermission());
      checkSubscription();
    }
  }, []);

  // Check existing subscription
  const checkSubscription = useCallback(async () => {
    if (!browserSupportsWebPush()) return;

    try {
      const sub = await getPushSubscription();
      setSubscription(sub);
      setIsSubscribed(!!sub);
      
      if (sub) {
        setSubscriptionData(subscriptionToJSON(sub));
      }
    } catch (error) {
      console.error('[usePushNotifications] Check subscription failed:', error);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      return newPermission;
    } catch (error) {
      console.error('[usePushNotifications] Request permission failed:', error);
      return 'denied' as NotificationPermission;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (key: string) => {
    if (!browserSupportsWebPush()) {
      throw new Error('Push notifications not supported');
    }

    // Request permission first
    if (permission !== 'granted') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    try {
      const sub = await subscribeToPush(key);
      setSubscription(sub);
      setIsSubscribed(!!sub);
      
      if (sub) {
        setSubscriptionData(subscriptionToJSON(sub));
      }
    } catch (error) {
      console.error('[usePushNotifications] Subscribe failed:', error);
      throw error;
    }
  }, [permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!browserSupportsWebPush()) return;

    try {
      await unsubscribeFromPush();
      setSubscription(null);
      setSubscriptionData(null);
      setIsSubscribed(false);
    } catch (error) {
      console.error('[usePushNotifications] Unsubscribe failed:', error);
      throw error;
    }
  }, []);

  // Show a local notification
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    showLocalNotification(title, options);
  }, []);

  // Show a service worker notification
  const showServiceNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      await showServiceWorkerNotification(title, options);
    },
    []
  );

  // Auto-subscribe if applicationServerKey is provided and permission is granted
  useEffect(() => {
    if (applicationServerKey && permission === 'granted' && !isSubscribed) {
      subscribe(applicationServerKey).catch((error) => {
        console.error('[usePushNotifications] Auto-subscribe failed:', error);
      });
    }
  }, [applicationServerKey, permission, isSubscribed, subscribe]);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    subscriptionData,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    showServiceNotification,
  };
}
