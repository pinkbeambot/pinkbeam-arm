/**
 * Performance Components
 * 
 * Components and utilities for performance optimization:
 * - Performance monitoring
 * - Lazy loading wrappers
 * - Optimized image component
 */

export { PerformanceMonitor, usePerformanceMonitor } from './PerformanceMonitor';
export { 
  PerformanceTabLazy, 
  AgentAnalyticsLazy,
  LiveLineChartLazy,
  TaskStageChartLazy,
  LazyChartWrapper 
} from './lazy-analytics';
export { OptimizedImage, OptimizedAvatar } from './OptimizedImage';
