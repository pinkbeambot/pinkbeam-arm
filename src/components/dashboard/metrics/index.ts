/**
 * Real-time Metrics Dashboard Components
 * 
 * Exports all components, hooks, and types for the real-time metrics dashboard.
 * 
 * @example
 * ```tsx
 * import { 
 *   RealtimeMetricsDashboard,
 *   useRealtimeMetrics,
 *   SystemHealthIndicator,
 *   MetricsGrid,
 * } from '@/components/dashboard/metrics';
 * ```
 */

// Hooks
export { useRealtimeMetrics } from './useRealtimeMetrics';

// Components
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
