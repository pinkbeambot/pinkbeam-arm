/**
 * Performance Utilities
 * 
 * Centralized performance optimization utilities.
 */

// Render monitoring
export {
  useRenderMonitor,
  withRenderMonitor,
  RenderPerformancePanel,
  getRenderMetrics,
  getSlowRenders,
  clearRenderMetrics,
} from './render-monitor';

// Prefetching
export {
  setPrefetchQueryClient,
  getPrefetchQueryClient,
  queuePrefetch,
  prefetchOnHover,
  prefetchCriticalData,
  addResourceHints,
  PREFETCH_KEYS,
  PREFETCH_PRIORITY,
} from './prefetch';

// Configuration
export {
  lazyLoadingConfig,
  cacheConfig,
  intersectionObserverConfig,
  imageConfig,
  bundleConfig,
  performanceBudgets,
} from './config';
