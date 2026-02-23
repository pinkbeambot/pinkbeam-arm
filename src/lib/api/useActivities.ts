'use client';

/**
 * useActivities Hook
 * 
 * React Query-style hook for fetching and managing activities data.
 * Connects to /api/activities endpoint with real-time updates.
 * 
 * Features:
 * - Fetch activities with filtering and pagination
 * - Loading skeletons and error states with retry
 * - Real-time updates via Supabase Realtime
 * - Cursor-based pagination support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTenant } from '@/lib/hooks';
import { apiFetch } from './fetch';
import type { Activity } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface ActivitiesApiResponse {
  data: Activity[];
  count: number;
  limit: number;
  offset: number;
}

export type ActivityType = 
  | 'agent.spawned'
  | 'agent.status_changed'
  | 'agent.terminated'
  | 'task.created'
  | 'task.assigned'
  | 'task.started'
  | 'task.progress'
  | 'task.completed'
  | 'task.failed'
  | 'decision.proposed'
  | 'decision.made'
  | 'decision.overridden'
  | 'escalation.created'
  | 'escalation.resolved'
  | 'system.error'
  | 'system.config_changed';

export interface UseActivitiesOptions {
  type?: ActivityType;
  agent_id?: string;
  from?: string; // ISO date string
  to?: string; // ISO date string
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export interface UseActivitiesReturn {
  activities: Activity[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  count: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  retry: () => void;
}

// ============================================================================
// Helper: Fetch Activities
// ============================================================================

async function fetchActivities(
  options: UseActivitiesOptions = {}
): Promise<ActivitiesApiResponse> {
  const params = new URLSearchParams();
  
  if (options.type) params.set('type', options.type);
  if (options.agent_id) params.set('agent_id', options.agent_id);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset !== undefined) params.set('offset', options.offset.toString());

  const response = await apiFetch(`/api/activities?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch activities: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// useActivities Hook
// ============================================================================

export function useActivities(options: UseActivitiesOptions = {}): UseActivitiesReturn {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const supabase = createClient();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [count, setCount] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const limit = options.limit || 20;

  // Fetch activities
  const fetchData = useCallback(async (offset = 0, append = false) => {
    if (!tenantId || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      if (append) {
        setIsFetching(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const result = await fetchActivities({
        ...options,
        limit,
        offset,
      });

      if (append) {
        setActivities((prev) => [...prev, ...result.data]);
      } else {
        setActivities(result.data);
      }
      setCount(result.count);
      setCurrentOffset(offset);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch activities'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [tenantId, user?.id, options.type, options.agent_id, options.from, options.to, limit]);

  // Initial fetch
  useEffect(() => {
    if (options.enabled !== false) {
      fetchData(0, false);
    }
  }, [fetchData, options.enabled, retryCount]);

  // Real-time subscription
  useEffect(() => {
    if (!tenantId || !user?.id || options.enabled === false) return;

    const channel = supabase
      .channel(`activities:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newActivity = payload.new as Activity;
          
          // Apply client-side filters
          if (options.type && newActivity.type !== options.type) return;
          if (options.agent_id && newActivity.agent_id !== options.agent_id) return;
          
          setActivities((prev) => [newActivity, ...prev]);
          setCount((c) => c + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [tenantId, user?.id, supabase, options.enabled, options.type, options.agent_id]);

  const refetch = useCallback(async () => {
    await fetchData(0, false);
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    const nextOffset = currentOffset + limit;
    if (nextOffset < count) {
      await fetchData(nextOffset, true);
    }
  }, [currentOffset, limit, count, fetchData]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  const hasMore = currentOffset + activities.length < count;

  return {
    activities,
    isLoading,
    isFetching,
    error,
    count,
    hasMore,
    refetch,
    loadMore,
    retry,
  };
}

// ============================================================================
// useLatestActivities Hook (Convenience for dashboard)
// ============================================================================

export function useLatestActivities(limit = 10) {
  return useActivities({
    limit,
    enabled: true,
  });
}

export default useActivities;
