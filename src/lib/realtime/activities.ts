/**
 * Realtime Activity Subscription Handler
 * 
 * This module provides utilities for handling Supabase Realtime subscriptions
 * for the activity feed. It's designed to be used on both client and server.
 * 
 * @module lib/realtime/activities
 */

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Activity } from '@/types';

// ============================================================================
// Types
// ============================================================================

export type ActivityChangeEvent = 
  | { eventType: 'INSERT'; new: Activity; old: null }
  | { eventType: 'UPDATE'; new: Activity; old: Activity }
  | { eventType: 'DELETE'; new: null; old: Activity };

export interface ActivitySubscriptionConfig {
  /** Tenant ID for filtering */
  tenantId: string;
  
  /** Optional agent ID filter */
  agentId?: string;
  
  /** Optional category filter */
  category?: 'agent' | 'task' | 'decision' | 'escalation' | 'system';
  
  /** Event types to listen for (default: ['INSERT']) */
  events?: Array<'INSERT' | 'UPDATE' | 'DELETE'>;
}

export interface ActivitySubscriptionCallbacks {
  onInsert?: (activity: Activity) => void;
  onUpdate?: (activity: Activity, oldActivity: Activity) => void;
  onDelete?: (activity: Activity) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR') => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Channel name prefix for activity subscriptions */
export const ACTIVITY_CHANNEL_PREFIX = 'activities';

/** Default events to subscribe to */
export const DEFAULT_ACTIVITY_EVENTS: Array<'INSERT' | 'UPDATE' | 'DELETE'> = ['INSERT'];

// ============================================================================
// Channel Name Generator
// ============================================================================

/**
 * Generate a unique channel name for an activity subscription
 */
export function getActivityChannelName(config: ActivitySubscriptionConfig): string {
  const parts = [ACTIVITY_CHANNEL_PREFIX, config.tenantId];
  
  if (config.agentId) {
    parts.push('agent', config.agentId);
  }
  
  if (config.category) {
    parts.push('category', config.category);
  }
  
  return parts.join(':');
}

// ============================================================================
// Subscription Factory
// ============================================================================

/**
 * Create a realtime subscription for activities
 * 
 * @param supabase - Supabase client instance
 * @param config - Subscription configuration
 * @param callbacks - Event callbacks
 * @returns Subscription channel
 * 
 * @example
 * ```typescript
 * const channel = subscribeToActivities(supabase, {
 *   tenantId: 'tenant-uuid',
 *   category: 'task'
 * }, {
 *   onInsert: (activity) => console.log('New activity:', activity),
 *   onError: (err) => console.error('Subscription error:', err)
 * });
 * ```
 */
export function subscribeToActivities(
  supabase: SupabaseClient,
  config: ActivitySubscriptionConfig,
  callbacks: ActivitySubscriptionCallbacks
): RealtimeChannel {
  const channelName = getActivityChannelName(config);
  const events = config.events ?? DEFAULT_ACTIVITY_EVENTS;
  
  // Build filter if needed
  const filter: Record<string, string> = {};
  if (config.agentId) {
    filter.agent_id = config.agentId;
  }
  
  let channel = supabase.channel(channelName);
  
  // Subscribe to each event type
  for (const event of events) {
    channel = channel.on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table: 'activities',
        filter: Object.keys(filter).length > 0 
          ? Object.entries(filter).map(([k, v]) => `${k}=eq.${v}`).join(',')
          : undefined,
      },
      (payload) => {
        try {
          switch (payload.eventType) {
            case 'INSERT':
              callbacks.onInsert?.(payload.new as Activity);
              break;
            case 'UPDATE':
              callbacks.onUpdate?.(
                payload.new as Activity,
                payload.old as Activity
              );
              break;
            case 'DELETE':
              callbacks.onDelete?.(payload.old as Activity);
              break;
          }
        } catch (error) {
          callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      }
    );
  }
  
  // Subscribe with status callback
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      callbacks.onStatusChange?.('SUBSCRIBED');
    } else if (status === 'CLOSED') {
      callbacks.onStatusChange?.('CLOSED');
    } else if (status === 'CHANNEL_ERROR') {
      callbacks.onStatusChange?.('CHANNEL_ERROR');
    }
  });
  
  return channel;
}

// ============================================================================
// Multi-Tenant Subscription Manager
// ============================================================================

export class ActivitySubscriptionManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private supabase: SupabaseClient;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  
  /**
   * Subscribe to activities for a tenant
   */
  subscribe(
    config: ActivitySubscriptionConfig,
    callbacks: ActivitySubscriptionCallbacks
  ): string {
    const channelName = getActivityChannelName(config);
    
    // Unsubscribe existing if present
    this.unsubscribe(channelName);
    
    const channel = subscribeToActivities(this.supabase, config, callbacks);
    this.channels.set(channelName, channel);
    
    return channelName;
  }
  
  /**
   * Unsubscribe from a specific channel
   */
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }
  
  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    for (const [, channel] of this.channels) {
      channel.unsubscribe();
    }
    this.channels.clear();
  }
  
  /**
   * Check if a channel is active
   */
  isSubscribed(channelName: string): boolean {
    return this.channels.has(channelName);
  }
  
  /**
   * Get all active channel names
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }
}

// ============================================================================
// Server-Side Helpers
// ============================================================================

/**
 * Broadcast a custom activity event via Supabase Realtime
 * This can be used from Edge Functions or server-side code
 * 
 * Note: This requires the supabase service role key
 */
export async function broadcastActivityEvent(
  supabase: SupabaseClient,
  tenantId: string,
  activity: Partial<Activity>
): Promise<void> {
  // Trigger a broadcast on the tenant's activity channel
  const channel = supabase.channel(`tenant:${tenantId}:activities`);
  
  await channel.send({
    type: 'broadcast',
    event: 'activity',
    payload: activity,
  });
}

// ============================================================================
// Client-Side Hook Helpers
// ============================================================================

/**
 * Default retry configuration for realtime connections
 */
export const REALTIME_RETRY_CONFIG = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config = REALTIME_RETRY_CONFIG
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}
