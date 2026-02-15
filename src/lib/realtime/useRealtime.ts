'use client';

/**
 * Core Realtime Hook
 * 
 * A robust, reusable hook for Supabase Realtime subscriptions with:
 * - Tenant-scoped channels
 * - Connection state management
 * - Exponential backoff retry
 * - Automatic cleanup
 * - Error handling
 * 
 * @example
 * ```tsx
 * const { data, error, connectionState, retry } = useRealtime<Activity>({
 *   table: 'activities',
 *   filter: `tenant_id=eq.${tenantId}`,
 *   onInsert: (activity) => console.log('New:', activity),
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type ConnectionState = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'error';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface UseRealtimeOptions {
  /** Table name to subscribe to */
  table: string;
  
  /** Optional filter expression (e.g., "tenant_id=eq.123") */
  filter?: string;
  
  /** Event types to listen for */
  events?: RealtimeEventType[];
  
  /** Schema name (default: 'public') */
  schema?: string;
  
  /** Called when a new record is inserted */
  onInsert?: (record: object) => void;
  
  /** Called when a record is updated */
  onUpdate?: (record: object, oldRecord: object) => void;
  
  /** Called when a record is deleted */
  onDelete?: (record: object) => void;
  
  /** Called when any event occurs */
  onChange?: (event: { eventType: RealtimeEventType; new: object | null; old: object | null }) => void;
  
  /** Called when connection state changes */
  onConnectionChange?: (state: ConnectionState) => void;
  
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  
  /** Enable the subscription (default: true) */
  enabled?: boolean;
  
  /** Tenant ID for channel scoping */
  tenantId?: string;
  
  /** Custom channel name (auto-generated if not provided) */
  channelName?: string;
  
  /** Retry configuration */
  retryConfig?: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
}

export interface UseRealtimeReturn {
  /** Current connection state */
  connectionState: ConnectionState;

  /** Last connection error */
  error: Error | null;

  /** Number of reconnection attempts */
  retryCount: number;

  /** Whether currently connected */
  isConnected: boolean;

  /** Whether connection is in progress */
  isConnecting: boolean;

  /** Manually retry connection */
  retry: () => void;

  /** Manually disconnect */
  disconnect: () => void;

  /** Manually connect */
  connect: () => void;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// Calculate retry delay with exponential backoff
function calculateRetryDelay(
  attempt: number,
  config = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

// Generate unique channel name
function generateChannelName(
  table: string,
  tenantId: string | undefined,
  customName: string | undefined
): string {
  if (customName) return customName;
  
  const parts = ['realtime', table];
  if (tenantId) {
    parts.push('tenant', tenantId.slice(0, 8));
  }
  parts.push(Date.now().toString(36));
  
  return parts.join(':');
}

export function useRealtime(
  options: UseRealtimeOptions
): UseRealtimeReturn {
  const {
    table,
    filter,
    events = ['*'],
    schema = 'public',
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    onConnectionChange,
    onError,
    enabled = true,
    tenantId,
    channelName: customChannelName,
    retryConfig = DEFAULT_RETRY_CONFIG,
  } = options;

  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDestroyedRef = useRef(false);

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Memoize channel name
  const channelName = generateChannelName(table, tenantId, customChannelName);

  // Set connection state with callback
  const setState = useCallback((newState: ConnectionState) => {
    setConnectionState(newState);
    onConnectionChange?.(newState);
  }, [onConnectionChange]);

  // Handle errors
  const handleError = useCallback((err: Error) => {
    setError(err);
    onError?.(err);
    setState('error');
  }, [onError, setState]);

  // Attempt reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (isDestroyedRef.current || !enabled) return;
    
    if (retryCount >= retryConfig.maxRetries) {
      handleError(new Error('Max reconnection attempts reached'));
      return;
    }

    setState('reconnecting');
    const delay = calculateRetryDelay(retryCount, retryConfig);
    
    setRetryCount(prev => prev + 1);
    
    retryTimerRef.current = setTimeout(() => {
      if (!isDestroyedRef.current) {
        connect();
      }
    }, delay);
  }, [retryCount, retryConfig, enabled, handleError, setState]);

  // Disconnect and cleanup
  const disconnect = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setState('disconnected');
  }, [supabase, setState]);

  // Connect and subscribe
  const connect = useCallback(() => {
    if (!enabled || isDestroyedRef.current) return;

    // Clean up existing connection
    disconnect();

    setError(null);
    setState('connecting');

    try {
      let channel = supabase.channel(channelName);

      // Subscribe to each event type
      const eventTypes = events.includes('*') 
        ? ['INSERT', 'UPDATE', 'DELETE'] 
        : events.filter(e => e !== '*');

      for (const event of eventTypes) {
        const postgresChangesFilter: Record<string, string> = {
          event,
          schema,
          table,
        };

        if (filter) {
          postgresChangesFilter.filter = filter;
        }

        channel = channel.on(
          'postgres_changes' as any,
          postgresChangesFilter,
          (payload: { eventType: RealtimeEventType; new: object | null; old: object | null }) => {
            try {
              // Call specific handler
              switch (payload.eventType) {
                case 'INSERT':
                  if (payload.new && onInsert) onInsert(payload.new);
                  break;
                case 'UPDATE':
                  if (payload.new && payload.old && onUpdate) {
                    onUpdate(payload.new, payload.old);
                  }
                  break;
                case 'DELETE':
                  if (payload.old && onDelete) onDelete(payload.old);
                  break;
              }

              // Call generic handler
              onChange?.({ eventType: payload.eventType, new: payload.new, old: payload.old });
            } catch (err) {
              handleError(err instanceof Error ? err : new Error(String(err)));
            }
          }
        );
      }

      // Subscribe with status handling
      channel.subscribe((status) => {
        if (isDestroyedRef.current) return;

        switch (status) {
          case 'SUBSCRIBED':
            setRetryCount(0);
            setState('connected');
            break;
          case 'CLOSED':
            setState('disconnected');
            break;
          case 'CHANNEL_ERROR':
            handleError(new Error(`Channel error on ${channelName}`));
            attemptReconnect();
            break;
          case 'TIMED_OUT':
            handleError(new Error(`Connection timed out on ${channelName}`));
            attemptReconnect();
            break;
        }
      });

      channelRef.current = channel;
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)));
      attemptReconnect();
    }
  }, [
    enabled,
    channelName,
    supabase,
    events,
    schema,
    table,
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    disconnect,
    handleError,
    attemptReconnect,
    setState,
  ]);

  // Manual retry
  const retry = useCallback(() => {
    setRetryCount(0);
    connect();
  }, [connect]);

  // Setup connection
  useEffect(() => {
    isDestroyedRef.current = false;

    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      isDestroyedRef.current = true;
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connectionState,
    error,
    retryCount,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting' || connectionState === 'reconnecting',
    retry,
    disconnect,
    connect,
  };
}

// ============================================================================
// Specialized hooks for common tables
// ============================================================================

export interface UseRealtimeActivitiesOptions {
  tenantId?: string;
  agentId?: string;
  category?: string;
  enabled?: boolean;
  onInsert?: (activity: Record<string, unknown>) => void;
}

export function useRealtimeActivities(options: UseRealtimeActivitiesOptions) {
  const { tenantId, agentId, category, enabled = true, onInsert } = options;

  // Build filter
  const filters: string[] = [];
  if (tenantId) filters.push(`tenant_id=eq.${tenantId}`);
  if (agentId) filters.push(`agent_id=eq.${agentId}`);
  if (category) filters.push(`category=eq.${category}`);

  return useRealtime({
    table: 'activities',
    filter: filters.length > 0 ? filters.join(',') : undefined,
    events: ['INSERT'],
    enabled,
    tenantId,
    onInsert,
  });
}

export interface UseRealtimeAgentsOptions {
  tenantId?: string;
  enabled?: boolean;
  onChange?: (event: { eventType: RealtimeEventType; new: object | null; old: object | null }) => void;
}

export function useRealtimeAgents(options: UseRealtimeAgentsOptions) {
  const { tenantId, enabled = true, onChange } = options;

  return useRealtime({
    table: 'agents',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    events: ['UPDATE'],
    enabled,
    tenantId,
    onChange,
  });
}

export interface UseRealtimeTasksOptions {
  tenantId?: string;
  agentId?: string;
  enabled?: boolean;
  onChange?: (event: { eventType: RealtimeEventType; new: object | null; old: object | null }) => void;
}

export function useRealtimeTasks(options: UseRealtimeTasksOptions) {
  const { tenantId, agentId, enabled = true, onChange } = options;

  const filters: string[] = [];
  if (tenantId) filters.push(`tenant_id=eq.${tenantId}`);
  if (agentId) filters.push(`assignee_id=eq.${agentId}`);

  return useRealtime({
    table: 'tasks',
    filter: filters.length > 0 ? filters.join(',') : undefined,
    events: ['INSERT', 'UPDATE'],
    enabled,
    tenantId,
    onChange,
  });
}

export interface UseRealtimeDecisionsOptions {
  tenantId?: string;
  agentId?: string;
  enabled?: boolean;
  onChange?: (event: { eventType: RealtimeEventType; new: object | null; old: object | null }) => void;
}

export function useRealtimeDecisions(options: UseRealtimeDecisionsOptions) {
  const { tenantId, agentId, enabled = true, onChange } = options;

  const filters: string[] = [];
  if (tenantId) filters.push(`tenant_id=eq.${tenantId}`);
  if (agentId) filters.push(`agent_id=eq.${agentId}`);

  return useRealtime({
    table: 'decisions',
    filter: filters.length > 0 ? filters.join(',') : undefined,
    events: ['INSERT', 'UPDATE'],
    enabled,
    tenantId,
    onChange,
  });
}

export interface UseRealtimeEscalationsOptions {
  tenantId?: string;
  agentId?: string;
  enabled?: boolean;
  onChange?: (event: { eventType: RealtimeEventType; new: object | null; old: object | null }) => void;
}

export function useRealtimeEscalations(options: UseRealtimeEscalationsOptions) {
  const { tenantId, agentId, enabled = true, onChange } = options;

  const filters: string[] = [];
  if (tenantId) filters.push(`tenant_id=eq.${tenantId}`);
  if (agentId) filters.push(`agent_id=eq.${agentId}`);

  return useRealtime({
    table: 'escalations',
    filter: filters.length > 0 ? filters.join(',') : undefined,
    events: ['INSERT', 'UPDATE'],
    enabled,
    tenantId,
    onChange,
  });
}

export default useRealtime;
