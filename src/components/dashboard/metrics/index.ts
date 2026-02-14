/**
 * Real-time Metrics Dashboard Components
 * 
 * Exports all components, hooks, and types for the real-time metrics dashboard.
 */

// Types
export type {
  MetricTimeRange,
  LiveMetricPoint,
  AgentLiveMetrics,
  SystemHealthMetrics,
  AggregatedMetrics,
  TimeSeriesData,
  LiveChartData,
  AgentPerformanceChartData,
  MetricsMessage,
  MetricsMessageType,
  AgentMetricsUpdate,
  SystemMetricsUpdate,
  AggregatedMetricsUpdate,
  UseRealtimeMetricsOptions,
  UseRealtimeMetricsReturn,
  UseSystemHealthOptions,
  UseSystemHealthReturn,
  LiveLineChartProps,
  AgentMetricsCardProps,
  SystemHealthIndicatorProps,
  HealthStatusBadgeProps,
  MetricsGridProps,
  RealtimeMetricsDashboardProps,
} from './types';

// Hooks
export { useRealtimeMetrics } from './useRealtimeMetrics';

// Components
export { LiveLineChart, LiveSparkline } from './LiveLineChart';
export { AgentMetricsCard, AgentMetricsCompact } from './AgentMetricsCard';
export { 
  SystemHealthIndicator, 
  SystemHealthCompact,
  HealthStatusBadge,
} from './SystemHealthIndicator';
export { MetricsGrid, MetricsSummary } from './MetricsGrid';
export { 
  RealtimeMetricsDashboard,
  default,
} from './RealtimeMetricsDashboard';
