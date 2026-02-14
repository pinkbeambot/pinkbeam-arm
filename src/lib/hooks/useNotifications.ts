'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Notification, NotificationType, NotificationFilters } from '@/types';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

interface UseNotificationsOptions {
  tenantId?: string;
  userId?: string;
  filters?: NotificationFilters;
  enableRealtime?: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<number>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useNotifications({
  tenantId = DEMO_TENANT_ID, userId = DEMO_USER_ID, filters = {}, enableRealtime = true,
}: UseNotificationsOptions = {}): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const calculateUnreadCount = useCallback((notifs: Notification[]) => notifs.filter(n => !n.is_read).length, []);

  const fetchNotifications = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('notifications').select('*').eq('tenant_id', tenantId)
        .or(`user_id.eq.${userId},user_id.is.null`).order('created_at', { ascending: false });
      if (filters.is_read !== undefined) query = query.eq('is_read', filters.is_read);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.entity_type) query = query.eq('related_entity_type', filters.entity_type);
      if (filters.limit) query = query.limit(filters.limit);
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      const notifs = (data || []) as Notification[];
      setNotifications(notifs);
      setUnreadCount(calculateUnreadCount(notifs));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, filters, supabase, calculateUnreadCount]);

  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      setNotifications(current => current.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
      setUnreadCount(current => Math.max(0, current - 1));
      const { data, error: rpcError } = await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
      if (rpcError) { await fetchNotifications(); throw rpcError; }
      return data || false;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark notification as read'));
      return false;
    }
  }, [supabase, fetchNotifications]);

  const markAllAsRead = useCallback(async (): Promise<number> => {
    try {
      const previouslyUnread = notifications.filter(n => !n.is_read).length;
      setNotifications(current => current.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      const { data, error: rpcError } = await supabase.rpc('mark_all_notifications_read');
      if (rpcError) { await fetchNotifications(); throw rpcError; }
      return data || previouslyUnread;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark all notifications as read'));
      return 0;
    }
  }, [supabase, notifications, fetchNotifications]);

  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(current => current.filter(n => n.id !== notificationId));
      if (notification && !notification.is_read) setUnreadCount(current => Math.max(0, current - 1));
      const { error: deleteError } = await supabase.from('notifications').delete().eq('id', notificationId).eq('tenant_id', tenantId);
      if (deleteError) { await fetchNotifications(); throw deleteError; }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete notification'));
      return false;
    }
  }, [supabase, notifications, tenantId, fetchNotifications]);

  useEffect(() => {
    if (!tenantId || !enableRealtime) return;
    fetchNotifications();
    const channel = supabase.channel(`notifications:${tenantId}:${userId}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'notifications', filter: `tenant_id=eq.${tenantId}` },
        (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Notification | null; old: Notification | null }) => {
          setNotifications(current => {
            if (payload.eventType === 'INSERT' && payload.new) {
              if (!payload.new.user_id || payload.new.user_id === userId) {
                const updated = [payload.new, ...current];
                setUnreadCount(calculateUnreadCount(updated));
                return updated;
              }
              return current;
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = current.map(n => n.id === payload.new?.id ? payload.new : n);
              setUnreadCount(calculateUnreadCount(updated));
              return updated;
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const updated = current.filter(n => n.id !== payload.old?.id);
              setUnreadCount(calculateUnreadCount(updated));
              return updated;
            }
            return current;
          });
        }
      ).subscribe();
    channelRef.current = channel;
    return () => { if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; } };
  }, [tenantId, userId, enableRealtime, supabase, fetchNotifications, calculateUnreadCount]);

  return { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, deleteNotification, refetch: fetchNotifications };
}

export function useUnreadNotificationCount(tenantId: string = DEMO_TENANT_ID, userId: string = DEMO_USER_ID) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!tenantId) return;
    const fetchCount = async () => {
      try {
        const { data, error } = await supabase.rpc('get_unread_notification_count', { p_user_id: userId });
        if (error) throw error;
        setCount(data || 0);
      } catch (err) { console.error('Failed to fetch notification count:', err); }
      finally { setLoading(false); }
    };
    fetchCount();
    const channel = supabase.channel(`notifications-count:${tenantId}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'notifications', filter: `tenant_id=eq.${tenantId}` }, fetchCount)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, userId, supabase]);

  return { count, loading };
}

export function useCreateNotification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const createNotification = useCallback(async (notification: {
    tenant_id: string; user_id?: string; type: NotificationType; title: string; message: string;
    action_url?: string; action_label?: string; related_entity_type?: string; related_entity_id?: string; metadata?: Record<string, unknown>;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: createError } = await supabase.from('notifications').insert(notification).select().single();
      if (createError) throw createError;
      return data as Notification;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create notification');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { createNotification, loading, error };
}
