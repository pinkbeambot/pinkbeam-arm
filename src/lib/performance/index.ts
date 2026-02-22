/**
 * Performance Utilities
 * 
 * Centralized exports for all performance-related utilities.
 */

// Configuration
export { 
  lazyLoadingConfig, 
  cacheConfig, 
  intersectionObserverConfig,
  imageConfig,
  bundleConfig,
  performanceBudgets 
} from './config';

// Lazy-loaded components
export {
  ChatPanelLazy,
  ChatInterfaceLazy,
  RealtimeMetricsDashboardLazy,
  LiveLineChartLazy,
  AgentMetricsCardLazy,
  AgentConfigFormLazy,
  SwaggerUILazy,
  ReactFlowLazy,
  HeroLazy,
} from './lazy-components';

// Hooks
export {
  useInView,
  useLazyRender,
  useVirtualList,
  useDebouncedCallback,
  useThrottledCallback,
  usePerformanceMarker,
} from './hooks';

// Storage utilities
export {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  useStorage,
  useUserPreferences,
  useChatPreferences,
  getRecentItems,
  addRecentItem,
  clearRecentItems,
} from './storage';

// Query provider
export { QueryProvider } from './query-provider';
