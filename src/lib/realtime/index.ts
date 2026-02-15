/**
 * Supabase Realtime Integration
 * 
 * This module provides comprehensive utilities for Supabase Realtime:
 * - Core useRealtime hook with connection management
 * - Specialized hooks for activities, agents, tasks, decisions, escalations
 * - RealtimeProvider for app-wide connection state
 * - WebSocketManager for advanced use cases
 * 
 * @example
 * ```tsx
 * // Basic activity subscription
 * const { isConnected } = useRealtimeActivities({
 *   tenantId: 'tenant-uuid',
 *   onInsert: (activity) => console.log(activity),
 * });
 * 
 * // Generic subscription
 * const { connectionState } = useRealtime<Task>({
 *   table: 'tasks',
 *   filter: `tenant_id=eq.${tenantId}`,
 *   onInsert: (task) => console.log(task),
 * });
 * ```
 */

// Core hook
export { 
  useRealtime,
  useRealtimeActivities,
  useRealtimeAgents,
  useRealtimeTasks,
  useRealtimeDecisions,
  useRealtimeEscalations,
} from './useRealtime';

export type { 
  ConnectionState,
  RealtimeEventType,
  UseRealtimeOptions,
  UseRealtimeReturn,
  UseRealtimeActivitiesOptions,
  UseRealtimeAgentsOptions,
  UseRealtimeTasksOptions,
  UseRealtimeDecisionsOptions,
  UseRealtimeEscalationsOptions,
} from './useRealtime';

// Provider
export { RealtimeProvider, useRealtimeContext } from './RealtimeProvider';
export type { RealtimeContextValue, RealtimeProviderProps } from './RealtimeProvider';

// Legacy activity subscription utilities
export {
  subscribeToActivities,
  ActivitySubscriptionManager,
  broadcastActivityEvent,
  getActivityChannelName,
  REALTIME_RETRY_CONFIG,
  calculateRetryDelay,
  ACTIVITY_CHANNEL_PREFIX,
  DEFAULT_ACTIVITY_EVENTS,
} from './activities';

export type {
  ActivityChangeEvent,
  ActivitySubscriptionConfig,
  ActivitySubscriptionCallbacks,
} from './activities';

// WebSocket manager
export {
  WebSocketManager,
  createWebSocket,
  getGlobalWebSocket,
  resetGlobalWebSocket,
} from './websocket';

export type {
  ConnectionState as WSConnectionState,
  WSMessage,
  WebSocketConfig,
  MessageHandler,
  StateChangeHandler,
  ErrorHandler,
} from './websocket';
