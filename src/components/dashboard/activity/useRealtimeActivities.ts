'use client';

/**
 * useRealtimeActivities Hook
 * 
 * Real-time activity feed subscription hook with Supabase Realtime.
 * 
 * Features:
 * - Subscribe to activities table via Supabase Realtime
 * - Real-time updates when new activities are inserted
 * - Filter by activity type, agent, time range
 * - Cursor-based pagination with loadMore
 * - Proper tenant scoping for multi-tenancy
 * - Connection error handling with exponential backoff retry
 * - Smooth connection status indicator support
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { 
 *     events, 
 *     isLoading, 
 *     isRealtime, 
 *     connectionError,
 *     connectionState,
 *     hasMore, 
 *     loadMore,
 *     retryConnection,
 *     refetch 
 *   } = useRealtimeActivities({
 *     filter: { type: 'tasks', timeRange: '24h' },
 *     onNewActivity: (activity) => {
 *       console.log('New activity:', activity);
 *     },
 *   });
 * 
 *   return <ActivityFeed events={events} isLoading={isLoading} />;
 * }
 * ```
 */

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRealtime, type ConnectionState } from '@/lib/realtime/useRealtime';
import type { Activity } from '@/types';
import type { ActivityEvent, UseRealtimeActivitiesOptions } from './types';

// ============================================================================
// Helper: Transform Activity to ActivityEvent
// ============================================================================

function transformActivity(activity: Activity): ActivityEvent {
  // Map database activity type to UI event type
  const typeMap: Record<string, ActivityEvent['type']> = {
    'agent.spawned': 'agent_spawned',
    'agent.status_changed': 'agent_spawned',
    'agent.terminated': 'agent_terminated',
    'task.created': 'task_created',
    'task.assigned': 'task_created',
    'task.started': 'task_started',
    'task.progress': 'task_started',
    'task.completed': 'task_completed',
    'task.failed': 'task_failed',
    'decision.proposed': 'decision_made',
    'decision.made': 'decision_made',
    'decision.overridden': 'decision_made',
    'escalation.created': 'escalation_created',
    'escalation.resolved': 'escalation_resolved',
    'message.sent': 'task_created',
    'message.received': 'task_created',
    'system.error': 'task_failed',
    'system.config_changed': 'agent_spawned',
    // Also support the simpler type format from types/index.ts
    'task_started': 'task_started',
    'task_completed': 'task_completed',
    'task_failed': 'task_failed',
    'decision_made': 'decision_made',
    'escalation_raised': 'escalation_created',
    'escalation_resolved': 'escalation_resolved',
    'handoff': 'task_started',
    'error': 'task_failed',
    'agent_spawned': 'agent_spawned',
    'agent_status_changed': 'agent_spawned',
    'message': 'task_created',
  };

  return {
    id: activity.id,
    type: typeMap[activity.type] || 'task_created',
    timestamp: activity.created_at,
    actor: {
      id: activity.agent_id,
      type: ((activity.metadata?.actor_type as string) || 'agent') as 'agent' | 'user' | 'system',
      name: (activity.metadata?.actor_name as string) || activity.agent?.name || activity.agent_id,
      avatarUrl: activity.metadata?.actor_avatar as string,
    },
    target: activity.related_task_id || activity.related_decision_id || activity.related_escalation_id ? {
      id: activity.related_task_id || activity.related_decision_id || activity.related_escalation_id || '',
      type: activity.related_task_id ? 'task' : activity.related_decision_id ? 'decision' : 'escalation',
      name: (activity.metadata?.target_name as string) || '',
    } : undefined,
    metadata: {
      title: activity.title,
      description: activity.description,
      ...activity.metadata,
    },
  };
}

// ============================================================================
// Category Filter Helper
// ============================================================================

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

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseRealtimeActivitiesReturn {
  /** Activity events for display */
  events: ActivityEvent[];
  
  /** Whether initial data is loading */
  isLoading: boolean;
  
  /** Whether Realtime subscription is active */
  isRealtime: boolean;
  
  /** Current connection state */
  connectionState: ConnectionState;
  
  /** Connection/realtime error if any */
  connectionError: Error | null;
  
  /** Number of reconnection attempts */
  retryCount: number;
  
  /** Fetch error if any */
  error: Error | null;
  
  /** Whether more data is available */
  hasMore: boolean;
  
  /** Load more paginated data */
  loadMore: () => void;
  
  /** Refetch initial data */
  refetch: () => void;
  
  /** Manually retry realtime connection */
  retryConnection: () => void;
}

// ============================================================================
// useRealtimeActivities Hook
// ============================================================================

export function useRealtimeActivities(
  options: UseRealtimeActivitiesOptions = {}
): UseRealtimeActivitiesReturn {
  const { enabled = true, filter, onNewActivity } = options;
  const { session, user } = useAuth();

  const [events, setEvents] = React.useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [cursor, setCursor] = React.useState<string | undefined>();

  const supabase = React.useMemo(() => createClient(), []);
  const accessToken = session?.access_token;
  
  // Extract tenant ID from user metadata or use default
  const tenantId = user?.user_metadata?.tenant_id as string | undefined;

  // Refs for values used in callbacks
  const filterRef = React.useRef(filter);
  filterRef.current = filter;
  const onNewActivityRef = React.useRef(onNewActivity);
  onNewActivityRef.current = onNewActivity;

  // ============================================================================
  // Data Fetching (Initial + Pagination)
  // ============================================================================

  const fetchActivities = React.useCallback(async (cursorParam?: string) => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const currentFilter = filterRef.current;

      // Build query params
      const params = new URLSearchParams();
      if (currentFilter?.type && currentFilter.type !== 'all') {
        params.append('category', currentFilter.type);
      }
      if (currentFilter?.agentId) {
        params.append('agent_id', currentFilter.agentId);
      }
      if (currentFilter?.timeRange && currentFilter.timeRange !== 'all') {
        params.append('time_range', currentFilter.timeRange);
      }
      if (currentFilter?.search) {
        params.append('search', currentFilter.search);
      }
      if (cursorParam) {
        params.append('cursor', cursorParam);
      }
      params.append('limit', '50');

      // Fetch from API with auth header
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`);
      }

      const data = await response.json();

      const newEvents = (data.activities || []).map(transformActivity);

      if (cursorParam) {
        setEvents(prev => [...prev, ...newEvents]);
      } else {
        setEvents(newEvents);
      }

      setHasMore(data.meta?.hasMore || false);
      setCursor(data.meta?.cursor);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Initial fetch + refetch when filter changes
  React.useEffect(() => {
    if (enabled) {
      fetchActivities();
    }
  }, [enabled, fetchActivities, filter]);

  // ============================================================================
  // Realtime Subscription (using new core hook)
  // ============================================================================

  const handleRealtimeInsert = React.useCallback((newActivity: Activity) => {
    const newEvent = transformActivity(newActivity);
    const currentFilter = filterRef.current;

    // Apply client-side filters
    if (currentFilter?.type && currentFilter.type !== 'all') {
      if (categoryMap[newActivity.type] !== currentFilter.type) {
        return;
      }
    }

    if (currentFilter?.agentId && newActivity.agent_id !== currentFilter.agentId) {
      return;
    }

    // Add to events
    setEvents(prev => [newEvent, ...prev]);

    // Notify callback
    onNewActivityRef.current?.(newActivity);
  }, []);

  // Build filter for realtime subscription
  const realtimeFilter = React.useMemo(() => {
    const filters: string[] = [];
    if (tenantId) filters.push(`tenant_id=eq.${tenantId}`);
    if (filter?.agentId) filters.push(`agent_id=eq.${filter.agentId}`);
    return filters.length > 0 ? filters.join(',') : undefined;
  }, [tenantId, filter?.agentId]);

  // Use the core realtime hook
  const {
    connectionState,
    error: connectionError,
    retryCount,
    isConnected,
    retry: retryConnection,
  } = useRealtime<Activity>({
    table: 'activities',
    filter: realtimeFilter,
    events: ['INSERT'],
    enabled,
    tenantId,
    onInsert: handleRealtimeInsert,
  });

  // ============================================================================
  // Actions
  // ============================================================================

  const loadMore = React.useCallback(() => {
    if (hasMore && cursor && !isLoading) {
      fetchActivities(cursor);
    }
  }, [hasMore, cursor, isLoading, fetchActivities]);

  const refetch = React.useCallback(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    events,
    isLoading,
    isRealtime: isConnected,
    connectionState,
    connectionError,
    retryCount,
    error,
    hasMore,
    loadMore,
    refetch,
    retryConnection,
  };
}

export default useRealtimeActivities;
