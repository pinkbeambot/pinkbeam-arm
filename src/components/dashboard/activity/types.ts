/**
 * Activity Feed Types
 * 
 * Type definitions specific to the Activity Feed component.
 */

import type { Activity, ActivityType, Agent, Task, Decision, Escalation } from '@/types';

// ============================================================================
// Activity Feed Specific Types
// ============================================================================

export type ActivityEventType = 
  | 'task_created'
  | 'task_completed'
  | 'decision_made'
  | 'escalation_created'
  | 'agent_spawned'
  | 'agent_terminated'
  | 'task_started'
  | 'task_failed'
  | 'escalation_resolved';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: string;
  actor: {
    id: string;
    type: 'agent' | 'user' | 'system';
    name: string;
    avatarUrl?: string;
  };
  target?: {
    id: string;
    type: 'task' | 'decision' | 'escalation' | 'agent';
    name: string;
  };
  metadata: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    [key: string]: unknown;
  };
}

export type ActivityFilterType = 
  | 'all'
  | 'tasks'
  | 'decisions'
  | 'escalations'
  | 'agents'
  | 'system';

export interface ActivityFilter {
  type?: ActivityFilterType;
  agentId?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d' | 'all';
  search?: string;
}

export interface ActivityFeedState {
  events: ActivityEvent[];
  isLoading: boolean;
  isRealtime: boolean;
  hasMore: boolean;
  cursor?: string;
  unreadCount: number;
}

// ============================================================================
// Props Interfaces
// ============================================================================

export interface ActivityFeedProps {
  className?: string;
  initialFilter?: ActivityFilter;
  showFilters?: boolean;
  maxHeight?: string;
  onEventClick?: (event: ActivityEvent) => void;
  realtime?: boolean;
  /** Enable auto-scroll to newest activity (default: true) */
  autoScroll?: boolean;
}

export interface ActivityItemProps {
  event: ActivityEvent;
  isExpanded?: boolean;
  onExpand?: () => void;
  onClick?: () => void;
  isNew?: boolean;
}

export interface ActivityIconProps {
  type: ActivityEventType;
  size?: 'sm' | 'md' | 'lg';
}

export interface ActivityFilterBarProps {
  filter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  agentOptions?: { id: string; name: string }[];
}

// ============================================================================
// Realtime Types
// ============================================================================

export interface RealtimeActivityUpdate {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'activities';
  record: Activity;
  old_record?: Activity;
}

export interface UseRealtimeActivitiesOptions {
  enabled?: boolean;
  filter?: ActivityFilter;
  onNewActivity?: (activity: Activity) => void;
}

// Alias types for useActivityFeed hook
export type UseActivityFeedOptions = UseRealtimeActivitiesOptions;

export interface UseActivityFeedReturn {
  events: ActivityEvent[];
  isLoading: boolean;
  isRealtime: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ActivitiesApiResponse {
  activities: Activity[];
  agents: Agent[];
  tasks?: Task[];
  decisions?: Decision[];
  escalations?: Escalation[];
  meta: {
    total: number;
    cursor?: string;
    hasMore: boolean;
  };
}
