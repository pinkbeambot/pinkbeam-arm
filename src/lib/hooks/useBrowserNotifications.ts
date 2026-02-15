'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { REALTIME_LISTEN_TYPES, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from '@supabase/supabase-js';
import type { Notification as AppNotification } from '@/types/notification';

// ============================================================================
// Types
// ============================================================================

type BrowserPermission = 'default' | 'granted' | 'denied' | 'unsupported';

interface BrowserNotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
    timezone: string;
  };
}

interface UseBrowserNotificationsOptions {
  tenantId?: string;
  userId?: string;
}

interface UseBrowserNotificationsReturn {
  permission: BrowserPermission;
  requestPermission: () => Promise<BrowserPermission>;
  settings: BrowserNotificationSettings;
  updateSettings: (settings: Partial<BrowserNotificationSettings>) => void;
  unreadCount: number;
  isSupported: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const STORAGE_KEY = 'arm-browser-notification-settings';
const DEFAULT_APP_TITLE = 'Pink Beam ARM';

const DEFAULT_SETTINGS: BrowserNotificationSettings = {
  enabled: true,
  soundEnabled: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
};

// Notification types that should trigger browser notifications
const BROWSER_NOTIFICATION_TYPES = new Set([
  'escalation_received',
  'decision_required',
  'system_alert',
  'error',
  'warning',
]);

// ============================================================================
// Sound utility
// ============================================================================

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Create a pleasant two-tone notification chime
    const frequencies = [880, 1108.73]; // A5, C#6 - a major third

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(now + i * 0.12);
      oscillator.stop(now + i * 0.12 + 0.5);
    });

    // Close context after sound completes
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Silently fail if audio is not available
  }
}

// ============================================================================
// Quiet hours check
// ============================================================================

function isInQuietHours(quietHours: BrowserNotificationSettings['quietHours']): boolean {
  if (!quietHours.enabled) return false;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: quietHours.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const currentTime = formatter.format(now);

    const [currentH, currentM] = currentTime.split(':').map(Number);
    const [startH, startM] = quietHours.start.split(':').map(Number);
    const [endH, endM] = quietHours.end.split(':').map(Number);

    const currentMinutes = currentH * 60 + currentM;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight spans (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

// ============================================================================
// Get notification icon/body from type
// ============================================================================

function getNotificationDetails(notification: AppNotification): { body: string; tag: string } {
  return {
    body: notification.message || notification.title,
    tag: `arm-${notification.id}`,
  };
}

// ============================================================================
// Hook: useBrowserNotifications
// ============================================================================

export function useBrowserNotifications({
  tenantId = DEMO_TENANT_ID,
  userId = DEMO_USER_ID,
}: UseBrowserNotificationsOptions = {}): UseBrowserNotificationsReturn {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  const [permission, setPermission] = useState<BrowserPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission as BrowserPermission;
  });

  const [settings, setSettings] = useState<BrowserNotificationSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch { /* use defaults */ }
    return DEFAULT_SETTINGS;
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const previousUnreadRef = useRef(0);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* localStorage may be unavailable */ }
  }, [settings]);

  // Request browser notification permission
  const requestPermission = useCallback(async (): Promise<BrowserPermission> => {
    if (!isSupported) return 'unsupported';

    try {
      const result = await window.Notification.requestPermission();
      const perm = result as BrowserPermission;
      setPermission(perm);
      return perm;
    } catch {
      return 'denied';
    }
  }, [isSupported]);

  // Update settings
  const updateSettings = useCallback((partial: Partial<BrowserNotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  // Send a browser notification
  const sendBrowserNotification = useCallback((notification: AppNotification) => {
    if (!isSupported || permission !== 'granted' || !settings.enabled) return;
    if (isInQuietHours(settings.quietHours)) return;
    if (!BROWSER_NOTIFICATION_TYPES.has(notification.type)) return;

    try {
      const { body, tag } = getNotificationDetails(notification);
      const browserNotification = new window.Notification(notification.title, {
        body,
        tag,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        requireInteraction: notification.type === 'escalation_received' || notification.type === 'error',
      });

      // Navigate to action URL on click
      if (notification.action_url) {
        browserNotification.onclick = () => {
          window.focus();
          window.location.href = notification.action_url!;
          browserNotification.close();
        };
      }

      // Play sound
      if (settings.soundEnabled) {
        playNotificationSound();
      }
    } catch {
      // Silently fail
    }
  }, [isSupported, permission, settings]);

  // Update tab title with unread count
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (unreadCount > 0) {
      document.title = `(${unreadCount > 99 ? '99+' : unreadCount}) ${DEFAULT_APP_TITLE}`;
    } else {
      document.title = DEFAULT_APP_TITLE;
    }

    return () => {
      document.title = DEFAULT_APP_TITLE;
    };
  }, [unreadCount]);

  // Subscribe to realtime notifications for browser delivery + unread count
  useEffect(() => {
    if (!tenantId) return;

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('is_read', false)
          .or(`user_id.eq.${userId},user_id.is.null`);

        if (!error && count !== null) {
          setUnreadCount(count);
          previousUnreadRef.current = count;
        }
      } catch {
        // Silently fail
      }
    };

    fetchUnreadCount();

    // Subscribe to notification changes
    const channel = supabase
      .channel(`browser-notifications:${tenantId}:${userId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: {
          eventType: 'INSERT' | 'UPDATE' | 'DELETE';
          new: AppNotification | null;
          old: AppNotification | null;
        }) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            // Only handle notifications for this user or global
            if (!payload.new.user_id || payload.new.user_id === userId) {
              setUnreadCount(prev => prev + 1);
              sendBrowserNotification(payload.new);
            }
          } else if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            // Handle read/unread status changes
            if (payload.old.is_read === false && payload.new.is_read === true) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else if (payload.old.is_read === true && payload.new.is_read === false) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            if (!payload.old.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, userId, supabase, sendBrowserNotification]);

  return {
    permission,
    requestPermission,
    settings,
    updateSettings,
    unreadCount,
    isSupported,
  };
}

// ============================================================================
// Hook: useTabTitleNotification (lightweight - just unread count in tab title)
// ============================================================================

export function useTabTitleNotification(unreadCount: number) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (unreadCount > 0) {
      document.title = `(${unreadCount > 99 ? '99+' : unreadCount}) ${DEFAULT_APP_TITLE}`;
    } else {
      document.title = DEFAULT_APP_TITLE;
    }

    return () => {
      document.title = DEFAULT_APP_TITLE;
    };
  }, [unreadCount]);
}
