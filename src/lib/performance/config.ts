/**
 * Performance Configuration
 * 
 * Centralized performance settings for the ARM portal.
 * Includes lazy loading, caching, and optimization configurations.
 */

// Lazy loading options for heavy components
export const lazyLoadingConfig = {
  // Chat components (heavy due to TipTap editor, realtime subscriptions)
  chat: {
    suspense: true,
    loadingDelay: 200, // ms before showing loading state
  },
  // Metrics/analytics (heavy due to Recharts)
  metrics: {
    suspense: true,
    ssr: false, // Disable SSR for charts
  },
  // Agent configuration (heavy forms)
  agentConfig: {
    suspense: true,
  },
  // Shared settings
  shared: {
    // Delay before showing fallback UI (prevents flash)
    delayFallbackMs: 200,
  },
};

// Cache configuration for data fetching
export const cacheConfig = {
  // React Query / SWR defaults
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (cacheTime in v4)
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  // Real-time data (shorter cache)
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
  },
  // User preferences (longer cache)
  preferences: {
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Intersection Observer configuration for lazy loading below-fold content
export const intersectionObserverConfig = {
  root: null,
  rootMargin: '100px', // Start loading 100px before entering viewport
  threshold: 0,
};

// Image optimization settings
export const imageConfig = {
  // Default sizes for responsive images
  sizes: {
    avatar: { width: 40, height: 40 },
    avatarLarge: { width: 80, height: 80 },
    thumbnail: { width: 150, height: 150 },
    card: { width: 400, height: 300 },
    hero: { width: 1200, height: 600 },
  },
  // Quality settings
  quality: 80,
  // Format priority
  formats: ['image/webp', 'image/jpeg'],
};

// Bundle optimization
export const bundleConfig = {
  // Components to always split
  dynamicImports: [
    'recharts',
    'framer-motion',
    '@tiptap/react',
    'swagger-ui-react',
    '@xyflow/react',
    'date-fns/locale',
  ],
  // Modules to preload
  preloadModules: [
    '@/components/ui/button',
    '@/components/ui/card',
    '@/components/ui/avatar',
  ],
};

// Performance budgets
export const performanceBudgets = {
  // Max bundle sizes in KB
  maxBundleSize: {
    initial: 200, // Initial JS loaded
    async: 500,   // Async chunks
    css: 50,      // CSS
  },
  // Timing budgets (ms)
  timing: {
    fcp: 1500,  // First Contentful Paint
    lcp: 2500,  // Largest Contentful Paint
    tti: 3000,  // Time to Interactive
    cls: 0.1,   // Cumulative Layout Shift
  },
};
