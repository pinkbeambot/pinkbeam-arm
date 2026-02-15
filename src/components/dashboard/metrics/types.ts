/**
 * Real-time Metrics Types
 * Live performance metrics and system health data structures
 */

import type { AgentStatus, TaskStatus } from '@/types';

// ============================================================================
// Real-time Metric Data Types
// ============================================================================

export type MetricTimeRange = 'live' | '1h' | '24h' | '7d';

export interface LiveMetricPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface AgentLiveMetrics {
  agentId: string;
  agentName: string;
  status: AgentStatus;
  tasksPerMinute: number;
  successRate: number; // 0-100
  currentLoad: number; // 0-100 (tasks in progress / max capacity)
  avgResponseTime: number; // in seconds (avg task duration)
  errorRate: number; // 0-100
  lastActivityAt: string;
  tasksCompleted: number;
  tasksFailed: number;
  tasksInProgress: number;
}

export interface SystemHealthMetrics {
  // Overall system health
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  uptime: number; // in seconds
  
  // Database health
  database: {
    status: 'healthy' | 'degraded' | 'critical' | 'unknown';
    responseTime: number; // in ms
    connectionPool: {
      used: number;
      total: number;
      utilization: number; // 0-100
    };
    queryLatency: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  
  // Realtime/WebSocket health
  realtime: {
    status: 'healthy' | 'degraded' | 'critical' | 'unknown';
    connections: number;
    messagesPerSecond: number;
    latency: number; // in ms
  };
  
  // Agent runtime health
  agentRuntime: {
    status: 'healthy' | 'degraded' | 'critical' | 'unknown';
    activeAgents: number;
    queuedTasks: number;
    processingTasks: number;
    avgTaskWaitTime: number; // in seconds
  };
  
  // Business metrics
  resources: {
    throughput: {
      tasksPerHour: number;
      capacity: number; // estimated based on active agents
      utilization: number; // 0-100
    };
    agentUtilization: {
      active: number;
      total: number;
      utilization: number; // 0-100
    };
    taskQueue: {
      queued: number;
      processing: number;
      utilization: number; // 0-100 (processing / (processing + queued))
    };
  };
}

export interface AggregatedMetrics {
  // Task metrics
  tasks: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    queued: number;
    completionRate: number; // tasks per minute
    successRate: number; // 0-100
    avgDuration: number; // in seconds
  };
  
  // Agent metrics
  agents: {
    total: number;
    active: number;
    idle: number;
    error: number;
    avgTasksPerMinute: number;
    avgSuccessRate: number;
  };
  
  // Decision metrics
  decisions: {
    total: number;
    approved: number;
    rejected: number;
    avgConfidence: number;
  };
  
  // Escalation metrics
  escalations: {
    total: number;
    open: number;
    resolved: number;
    avgResolutionTime: number; // in minutes
  };
}

// ============================================================================
// Chart Data Types
// ============================================================================

export interface TimeSeriesData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface LiveChartData {
  points: LiveMetricPoint[];
  maxPoints?: number; // Maximum number of points to keep (for rolling window)
}

export interface AgentPerformanceChartData {
  agentId: string;
  agentName: string;
  tasksPerMinute: LiveChartData;
  successRate: LiveChartData;
  responseTime: LiveChartData;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type MetricsMessageType = 
  | 'metrics.agent.update'
  | 'metrics.system.update'
  | 'metrics.aggregated.update'
  | 'metrics.snapshot'
  | 'metrics.subscribe'
  | 'metrics.unsubscribe';

export interface MetricsMessage<T = unknown> {
  type: MetricsMessageType;
  payload: T;
  timestamp: number;
  tenantId?: string;
}

export interface AgentMetricsUpdate {
  agentId: string;
  metrics: Partial<AgentLiveMetrics>;
  timestamp: number;
}

export interface SystemMetricsUpdate {
  metrics: SystemHealthMetrics;
  timestamp: number;
}

export interface AggregatedMetricsUpdate {
  metrics: AggregatedMetrics;
  timestamp: number;
}

// ============================================================================
// Hook Options & Return Types
// ============================================================================

export interface UseRealtimeMetricsOptions {
  enabled?: boolean;
  refreshInterval?: number; // in ms, for fallback polling
  maxDataPoints?: number; // for rolling charts
  agentIds?: string[]; // filter by specific agents
}

export interface UseRealtimeMetricsReturn {
  // Live agent metrics
  agentMetrics: AgentLiveMetrics[];
  selectedAgent: AgentLiveMetrics | null;
  setSelectedAgent: (agent: AgentLiveMetrics | null) => void;
  
  // System health
  systemHealth: SystemHealthMetrics | null;
  
  // Aggregated metrics
  aggregated: AggregatedMetrics | null;
  
  // Chart data (time series)
  tasksPerMinuteHistory: LiveMetricPoint[];
  successRateHistory: LiveMetricPoint[];
  agentLoadHistory: LiveMetricPoint[];
  
  // Connection state
  isConnected: boolean;
  isRealtime: boolean;
  lastUpdateAt: Date | null;
  
  // Error state
  error: Error | null;
  isLoading: boolean;
  
  // Actions
  refresh: () => void;
  subscribeToAgent: (agentId: string) => void;
  unsubscribeFromAgent: (agentId: string) => void;
}

export interface UseSystemHealthOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseSystemHealthReturn {
  health: SystemHealthMetrics | null;
  isLoading: boolean;
  isRealtime: boolean;
  error: Error | null;
  refresh: () => void;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface LiveLineChartProps {
  data: LiveMetricPoint[];
  title: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  yAxisMin?: number;
  yAxisMax?: number;
  showArea?: boolean;
  className?: string;
  height?: number;
}

export interface AgentMetricsCardProps {
  agent: AgentLiveMetrics;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface SystemHealthIndicatorProps {
  health: SystemHealthMetrics;
  showDetails?: boolean;
  className?: string;
}

export interface HealthStatusBadgeProps {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  label?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface MetricsGridProps {
  metrics: AggregatedMetrics;
  className?: string;
}

export interface RealtimeMetricsDashboardProps {
  className?: string;
  defaultTimeRange?: MetricTimeRange;
  showSystemHealth?: boolean;
  showAgentList?: boolean;
}
