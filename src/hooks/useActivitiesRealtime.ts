/* eslint-disable react-hooks/immutability */
/**
 * useActivitiesRealtime Hook
 *
 * Provides real-time subscription to activities via Supabase Realtime.
 * Automatically updates the activity feed when new activities are created.
 *
 * Usage:
 * ```tsx
 * const { activities, isConnected, error } = useActivitiesRealtime({
 *   tenantId: 'tenant-uuid',
 *   agentId: 'agent-uuid', // optional
 *   category: 'task', // optional
 * });
 * ```
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Activity } from '@/types';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

export interface UseActivitiesRealtimeOptions {
  /** Tenant ID for the subscription */
  tenantId: string;
  /** Optional: Filter by agent ID */
  agentId?: string;
  /** Optional: Filter by category */
  category?: 'agent' | 'task' | 'decision' | 'escalation' | 'system' | 'message';
  /** Optional: Filter by activity type */
  type?: string;
  /** Maximum number of activities to keep in memory */
  maxActivities?: number;
  /** Enable reconnection on disconnect */
  enableReconnection?: boolean;
  /** Initial activities to populate the list */
  initialActivities?: Activity[];
}

export interface UseActivitiesRealtimeReturn {
  /** Current list of activities (newest first) */
  activities: Activity[];
  /** Whether the realtime connection is active */
  isConnected: boolean;
  /** Whether currently reconnecting */
  isReconnecting: boolean;
  /** Connection error if any */
  error: Error | null;
  /** Manually refresh the connection */
  reconnect: () => void;
  /** Clear all activities */
  clear: () => void;
}

/**
 * Subscribe to real-time activity updates
 */
export function useActivitiesRealtime({
  tenantId,
  agentId,
  category,
  type,
  maxActivities = 100,
  enableReconnection = true,
  initialActivities = [],
}: UseActivitiesRealtimeOptions): UseActivitiesRealtimeReturn {
  const supabase = useMemo(() => createClient(), []);
  
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const setupSubscriptionRef = useRef<(() => void) | null>(null);

  const clear = useCallback(() => {
    setActivities([]);
  }, []);

  const setupSubscription = useCallback(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsReconnecting(true);
    setError(null);

    // Build filter string for the subscription
    const filters: string[] = [`tenant_id=eq.${tenantId}`];
    if (agentId) filters.push(`agent_id=eq.${agentId}`);
    if (category) filters.push(`category=eq.${category}`);
    if (type) filters.push(`type=eq.${type}`);

    // Create channel name based on filters
    const channelName = [
      'activities',
      tenantId,
      agentId || 'all',
      category || 'all',
      type || 'all',
    ].join(':');

    const channel = supabase
      .channel(channelName)
      .on<RealtimePostgresInsertPayload<Activity>>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: filters.join(','),
        },
        (payload) => {
          // Add new activity to the beginning of the list
          setActivities((prev) => {
            const newActivity = payload.new as unknown as Activity;
            // Prevent duplicates
            if (prev.some((a) => a.id === newActivity.id)) {
              return prev;
            }
            const updated = [newActivity, ...prev];
            // Keep only maxActivities
            return updated.slice(0, maxActivities);
          });
        }
      )
      .subscribe((status) => {
        switch (status) {
          case 'SUBSCRIBED':
            setIsConnected(true);
            setIsReconnecting(false);
            setError(null);
            reconnectAttemptsRef.current = 0;
            break;
          case 'CLOSED':
            setIsConnected(false);
            break;
          case 'CHANNEL_ERROR':
            setIsConnected(false);
            setError(new Error('Realtime channel error'));
            
            // Attempt reconnection
            if (enableReconnection && reconnectAttemptsRef.current < maxReconnectAttempts) {
              reconnectAttemptsRef.current++;
              const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
              setTimeout(() => {
                setupSubscriptionRef.current?.();
              }, delay);
            }
            break;
        }
      });

    channelRef.current = channel;
  }, [supabase, tenantId, agentId, category, type, maxActivities, enableReconnection]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setupSubscriptionRef.current?.();
  }, []);

  // Store the setup function in a ref to avoid temporal dead zone issues
  useEffect(() => {
    setupSubscriptionRef.current = setupSubscription;
  }, [setupSubscription]);

  useEffect(() => {
    setupSubscriptionRef.current?.();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupSubscription, supabase]);

  return {
    activities,
    isConnected,
    isReconnecting,
    error,
    reconnect,
    clear,
  };
}

export default useActivitiesRealtime;
