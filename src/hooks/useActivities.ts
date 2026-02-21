/* eslint-disable react-hooks/immutability */
/**
 * useActivities Hook
 *
 * Custom hook for activity data fetching using React Query for caching.
 * Provides real-time updates via Supabase Realtime and supports pagination
 * with infinite scroll and filtering.
 *
 * Features:
 * - React Query for server state management and caching
 * - Real-time updates via Supabase Realtime
 * - Infinite scroll pagination with cursor-based loading
 * - Filtering support (entity_type, action_type, agent_id, time_range)
 * - Automatic background refetching
 *
 * @example
 * ```tsx
 * function ActivityFeed() {
 *   const {
 *     activities,
 *     isLoading,
 *     isFetching,
 *     hasNextPage,
 *     fetchNextPage,
 *     isRealtimeConnected,
 *   } = useActivities({
 *     entityType: 'tasks',
 *     timeRange: '24h',
 *   });
 * 
 *   return (
 *     <div>
 *       {activities.map(activity => (
 *         <ActivityItem key={activity.id} activity={activity} />
 *       ))}
 *       {hasNextPage && <button onClick={() => fetchNextPage()}>Load more</button>}
 *     </div>
 *   );
 * }
 * ```
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useInfiniteQuery,
  useQueryClient,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Activity } from '@/types';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'all' | 'tasks' | 'decisions' | 'escalations' | 'agents' | 'system';
export type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all';
export type ActionType = 
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
  | 'message.sent'
  | 'message.received'
  | 'system.error'
  | 'system.config_changed';

export interface ActivityFilters {
  /** Filter by entity type category */
  entityType?: EntityType;
  /** Filter by specific action type */
  actionType?: ActionType;
  /** Filter by specific agent ID */
  agentId?: string;
  /** Time range shortcut */
  timeRange?: TimeRange;
  /** Search in title and description */
  search?: string;
  /** Explicit date from (ISO 8601) */
  dateFrom?: string;
  /** Explicit date to (ISO 8601) */
  dateTo?: string;
}

export interface UseActivitiesOptions extends ActivityFilters {
  /** Number of items per page (default: 50) */
  limit?: number;
  /** Enable real-time updates (default: true) */
  realtime?: boolean;
  /** Maximum number of activities to keep in cache */
  maxCacheSize?: number;
  /** Callback when new activity is received via realtime */
  onNewActivity?: (activity: Activity) => void;
}

export interface ActivitiesApiResponse {
  data: Activity[];
  pagination: {
    has_more: boolean;
    next_cursor: string | null;
  };
}

export interface UseActivitiesReturn {
  /** Flattened list of all activities */
  activities: Activity[];
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Whether fetching more data (pagination) */
  isFetching: boolean;
  /** Whether fetching next page */
  isFetchingNextPage: boolean;
  /** Error if any occurred during fetching */
  error: Error | null;
  /** Whether there's a next page available */
  hasNextPage: boolean;
  /** Fetch the next page */
  fetchNextPage: () => void;
  /** Refetch all data */
  refetch: () => void;
  /** Whether realtime connection is active */
  isRealtimeConnected: boolean;
  /** Whether realtime is reconnecting */
  isRealtimeReconnecting: boolean;
  /** Realtime connection error if any */
  realtimeError: Error | null;
  /** Manually retry realtime connection */
  retryRealtime: () => void;
  /** Total count of activities (if available) */
  totalCount?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

const getActivitiesQueryKey = (filters: ActivityFilters) => {
  return ['activities', filters];
};

// ============================================================================
// Fetch Function
// ============================================================================

async function fetchActivities(
  filters: ActivityFilters,
  cursor: string | undefined,
  limit: number,
  accessToken: string | undefined
): Promise<ActivitiesApiResponse> {
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const params = new URLSearchParams();
  
  if (filters.entityType && filters.entityType !== 'all') {
    params.append('entity_type', filters.entityType);
  }
  if (filters.actionType) {
    params.append('action_type', filters.actionType);
  }
  if (filters.agentId) {
    params.append('agent_id', filters.agentId);
  }
  if (filters.timeRange && filters.timeRange !== 'all') {
    params.append('time_range', filters.timeRange);
  }
  if (filters.dateFrom) {
    params.append('date_from', filters.dateFrom);
  }
  if (filters.dateTo) {
    params.append('date_to', filters.dateTo);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }
  if (cursor) {
    params.append('cursor', cursor);
  }
  params.append('limit', String(limit));

  const response = await fetch(`/api/activities?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch activities: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Hook
// ============================================================================

export function useActivities(options: UseActivitiesOptions = {}): UseActivitiesReturn {
  const {
    entityType = 'all',
    actionType,
    agentId,
    timeRange = '24h',
    search,
    dateFrom,
    dateTo,
    limit = 50,
    realtime = true,
    maxCacheSize = 500,
    onNewActivity,
  } = options;

  const { session } = useAuth();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const accessToken = session?.access_token;

  // Build filters object for query key
  const filters = useMemo<ActivityFilters>(
    () => ({
      entityType,
      actionType,
      agentId,
      timeRange,
      search,
      dateFrom,
      dateTo,
    }),
    [entityType, actionType, agentId, timeRange, search, dateFrom, dateTo]
  );

  // Realtime connection state
  const [isRealtimeConnected, setIsRealtimeConnected] = React.useState(false);
  const [isRealtimeReconnecting, setIsRealtimeReconnecting] = React.useState(false);
  const [realtimeError, setRealtimeError] = React.useState<Error | null>(null);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const setupRealtimeSubscriptionRef = useRef<(() => void) | null>(null);

  // ============================================================================
  // React Query Infinite Query
  // ============================================================================

  const queryKey = getActivitiesQueryKey(filters);

  const infiniteQuery = useInfiniteQuery<
    ActivitiesApiResponse,
    Error,
    ActivitiesApiResponse,
    ReturnType<typeof getActivitiesQueryKey>,
    string | undefined
  >({
    queryKey,
    queryFn: ({ pageParam }) => fetchActivities(filters, pageParam, limit, accessToken),
    getNextPageParam: (lastPage) => lastPage.pagination.next_cursor ?? undefined,
    initialPageParam: undefined,
    enabled: !!accessToken,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    maxPages: Math.ceil(maxCacheSize / limit),
  });

  // Flatten all pages into a single array
  const activities = useMemo(() => {
    const pages = (infiniteQuery.data as { pages?: ActivitiesApiResponse[] } | undefined)?.pages;
    return pages?.flatMap((page) => page.data) ?? [];
  }, [infiniteQuery.data]);

  // ============================================================================
  // Realtime Subscription
  // ============================================================================

  const setupRealtimeSubscription = useCallback(() => {
    if (!realtime || !accessToken) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsRealtimeReconnecting(true);
    setRealtimeError(null);

    // Build filter string for the subscription
    const tenantId = session?.user?.user_metadata?.tenant_id;
    const filterParts: string[] = [];
    if (tenantId) filterParts.push(`tenant_id=eq.${tenantId}`);
    if (agentId) filterParts.push(`agent_id=eq.${agentId}`);
    
    const filter = filterParts.length > 0 ? filterParts.join(',') : undefined;

    // Create channel name
    const channelName = `activities:${tenantId || 'all'}:${agentId || 'all'}`;

    const channel = supabase
      .channel(channelName)
      .on<RealtimePostgresInsertPayload<Activity>>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter,
        },
        (payload) => {
          const newActivity = payload.new as unknown as Activity;
          
          // Apply client-side filters
          if (entityType && entityType !== 'all') {
            const categoryMap: Record<string, string> = {
              'agent.spawned': 'agents',
              'agent.status_changed': 'agents',
              'agent.terminated': 'agents',
              'task.created': 'tasks',
              'task.assigned': 'tasks',
              'task.started': 'tasks',
              'task.progress': 'tasks',
              'task.completed': 'tasks',
              'task.failed': 'tasks',
              'decision.proposed': 'decisions',
              'decision.made': 'decisions',
              'decision.overridden': 'decisions',
              'escalation.created': 'escalations',
              'escalation.resolved': 'escalations',
              'system.error': 'system',
              'system.config_changed': 'system',
            };
            if (categoryMap[newActivity.type] !== entityType) {
              return;
            }
          }

          if (actionType && newActivity.type !== actionType) {
            return;
          }

          // Add new activity to the query cache
          queryClient.setQueryData<{ pages: ActivitiesApiResponse[]; pageParams: (string | undefined)[] }>(
            queryKey,
            (old) => {
              if (!old) return old;
              
              const newActivityData: Activity = {
                ...newActivity,
                // Ensure created_at is present
                created_at: newActivity.created_at || new Date().toISOString(),
              };

              // Add to first page
              const firstPage = old.pages[0];
              if (firstPage) {
                return {
                  ...old,
                  pages: [
                    {
                      ...firstPage,
                      data: [newActivityData, ...firstPage.data],
                    },
                    ...old.pages.slice(1),
                  ],
                };
              }
              return old;
            }
          );

          // Notify callback
          onNewActivity?.(newActivity);
        }
      )
      .subscribe((status) => {
        switch (status) {
          case 'SUBSCRIBED':
            setIsRealtimeConnected(true);
            setIsRealtimeReconnecting(false);
            setRealtimeError(null);
            reconnectAttemptsRef.current = 0;
            break;
          case 'CLOSED':
            setIsRealtimeConnected(false);
            break;
          case 'CHANNEL_ERROR':
            setIsRealtimeConnected(false);
            setRealtimeError(new Error('Realtime channel error'));
            
            // Attempt reconnection with exponential backoff
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              reconnectAttemptsRef.current++;
              const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
              setTimeout(() => {
                setupRealtimeSubscriptionRef.current?.();
              }, delay);
            }
            break;
        }
      });

    channelRef.current = channel;
  }, [realtime, accessToken, session, agentId, entityType, actionType, supabase, queryClient, queryKey, onNewActivity]);

  const retryRealtime = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setupRealtimeSubscriptionRef.current?.();
  }, []);

  // Store the setup function in a ref to avoid temporal dead zone issues
  useEffect(() => {
    setupRealtimeSubscriptionRef.current = setupRealtimeSubscription;
  }, [setupRealtimeSubscription]);

  // Setup/cleanup realtime subscription
  useEffect(() => {
    setupRealtimeSubscriptionRef.current?.();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupRealtimeSubscription, supabase]);

  // ============================================================================
  // Refetch on filter change (handled by query key change)
  // ============================================================================

  useEffect(() => {
    // When filters change, the query key changes automatically
    // This triggers a refetch
  }, [filters]);

  return {
    activities,
    isLoading: infiniteQuery.isLoading,
    isFetching: infiniteQuery.isFetching,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    error: infiniteQuery.error,
    hasNextPage: infiniteQuery.hasNextPage ?? false,
    fetchNextPage: infiniteQuery.fetchNextPage,
    refetch: infiniteQuery.refetch,
    isRealtimeConnected,
    isRealtimeReconnecting,
    realtimeError,
    retryRealtime,
    totalCount: (infiniteQuery.data as { pages?: ActivitiesApiResponse[] } | undefined)?.pages?.[0]?.pagination?.has_more
      ? undefined
      : activities.length,
  };
}

export default useActivities;

// Need to import React for useState
import * as React from 'react';
