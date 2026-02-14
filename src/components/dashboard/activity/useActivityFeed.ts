'use client';

/**
 * useActivityFeed Hook
 * 
 * Real-time activity feed subscription hook.
 * This is the main hook for consuming the activity feed with Supabase Realtime.
 * 
 * Features:
 * - Subscribe to activities table via Supabase Realtime
 * - Real-time updates when new activities are inserted
 * - Filter by activity type, agent, time range
 * - Cursor-based pagination with loadMore
 * - Auto-scroll to newest activity support
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { 
 *     events, 
 *     isLoading, 
 *     isRealtime, 
 *     hasMore, 
 *     loadMore,
 *     refetch 
 *   } = useActivityFeed({
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

export { useRealtimeActivities as useActivityFeed } from './useRealtimeActivities';

// Types are exported from types.ts
