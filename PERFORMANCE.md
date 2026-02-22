# Performance Optimization Summary

## Branch: `eng-infra/performance`

This document summarizes the performance optimizations implemented for the ARM platform.

---

## 1. Bundle Optimization

### Code Splitting (next.config.ts)
- **Recharts** - Separate chunk for chart library (heavy dependency)
- **Framer Motion** - Separate chunk for animations
- **TipTap Editor** - Separate chunk for rich text editor
- **Swagger UI** - Separate chunk for API documentation
- **React Flow** - Separate chunk for diagram components
- **Dashboard Components** - Separate chunk for dashboard UI
- **Analytics Components** - Separate chunk for analytics widgets (uses recharts)
- **Performance Components** - Separate chunk for monitoring utilities

### Tree Shaking
- Configured webpack to use `concatenateModules` and `sideEffects: false`
- Optimized package imports for:
  - `lucide-react`
  - `recharts`
  - `framer-motion`
  - `@radix-ui/*` packages
  - `date-fns`

### Lazy Loading Components
Created lazy-loaded wrappers for heavy components:
- `PerformanceTabLazy` - Agent performance analytics
- `AgentAnalyticsLazy` - Agent detail analytics
- `LiveLineChartLazy` - Real-time metrics charts
- `TaskStageChartLazy` - Pipeline visualization

### Dynamic Imports
- Agent configuration form uses `next/dynamic` with SSR disabled
- Analytics widgets are loaded on-demand when tab is activated

---

## 2. Image Optimization

### OptimizedImage Component
- **WebP/AVIF format support** - Automatic format selection
- **Blur placeholders** - Smooth loading experience, better LCP
- **Lazy loading** - Intersection Observer-based loading
- **Size optimization** - Responsive sizes for different viewports
- **Priority loading** - Critical images loaded immediately

### OptimizedAvatar Component
- Specialized for avatar images
- Fallback initials when image fails
- Size variants (sm, md, lg, xl)

### Next.js Image Configuration
```typescript
images: {
  formats: ['image/webp', 'image/avif'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  imageSizes: [16, 32, 48, 64, 96, 128, 256],
  minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
}
```

---

## 3. API Optimization

### React Query Integration (useActivities)
- **Caching** - 30 second stale time, 5 minute garbage collection
- **Infinite scroll pagination** - Cursor-based for efficient loading
- **Background refetching** - Data stays fresh without blocking UI
- **Optimistic updates** - Realtime activities immediately appear
- **Deduplication** - Prevents duplicate in-flight requests

### Optimized Query Hooks (use-optimized-queries.ts)
- `useOptimizedQuery` - Configurable cache presets (static, dynamic, realtime)
- `useOptimisticMutation` - Automatic rollback on errors
- `useDebouncedQuery` - Reduces API calls for search inputs
- `useDeduplicatedRequest` - Prevents duplicate requests
- `useBackgroundRefresh` - Refreshes data when tab is visible

### Cache Presets
- **Static** - 5 min stale, 30 min GC (reference data)
- **Dynamic** - 30 sec stale, 5 min GC (frequently changing)
- **Realtime** - 10 sec stale, 1 min GC (live data)
- **Preferences** - Infinite stale, 24 hr GC (user settings)

---

## 4. Core Web Vitals

### Performance Monitor Component
Tracks and reports:
- **LCP** (Largest Contentful Paint) - Target: < 2.5s
- **FID** (First Input Delay) - Target: < 100ms
- **CLS** (Cumulative Layout Shift) - Target: < 0.1
- **FCP** (First Contentful Paint) - Target: < 1.8s
- **TTFB** (Time to First Byte) - Target: < 800ms
- **INP** (Interaction to Next Paint) - Target: < 200ms

### Web Vitals API Endpoint
`POST /api/analytics/vitals`
- Receives metrics from client
- Stores in memory (production: integrate with analytics service)
- Supports retrieval for performance dashboard

### Performance Dashboard
`/portal/performance`
- Real-time Core Web Vitals display
- Percentile breakdowns (p50, p75, p90, p95, p99)
- Performance guidelines and thresholds
- Links to bundle analyzer and lighthouse

### Font Optimization
- `display: swap` for Geist fonts (prevents FOIT)
- Font preloading in layout

### Resource Hints
- Preconnect to Supabase
- DNS prefetch for external origins

---

## 5. Monitoring

### Render Performance Monitor
- Tracks component render times
- Identifies slow renders (> 16ms threshold)
- Logs warnings in development
- HOC for wrapping components: `withRenderMonitor`

### Prefetch Utilities
- `prefetchOnHover` - Load data on link hover
- `prefetchCriticalData` - Load essential data on app start
- Priority-based queue (critical, high, medium, low)
- Idle callback integration for non-critical prefetches

### Performance Budgets (config.ts)
```typescript
maxBundleSize: {
  initial: 200,    // Initial JS loaded (KB)
  async: 500,      // Async chunks (KB)
  css: 50,         // CSS (KB)
},
timing: {
  fcp: 1500,       // First Contentful Paint
  lcp: 2500,       // Largest Contentful Paint
  tti: 3000,       // Time to Interactive
  cls: 0.1,        // Cumulative Layout Shift
}
```

---

## 6. Additional Optimizations

### CSS Optimization
- `experimental.optimizeCss: true` - CSS optimization enabled
- Critical CSS extraction for above-the-fold content

### Scroll Restoration
- `experimental.scrollRestoration: true` - Better UX on navigation

### Compression
- Gzip/Brotli compression enabled
- Static asset caching headers

### Security Headers
All configured in next.config.ts:
- Content Security Policy
- X-Frame-Options: DENY
- Strict-Transport-Security
- X-Content-Type-Options: nosniff
- Referrer-Policy

---

## Usage Examples

### Using OptimizedImage
```tsx
import { OptimizedImage } from '@/components/performance';

<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  width={400}
  height={300}
  placeholder="blur"
  priority={false}
/>
```

### Using Optimized Query
```tsx
import { useOptimizedQuery, cachePresets } from '@/lib/hooks';

const { data, isLoading } = useOptimizedQuery({
  cacheKey: 'agents-list',
  fetchFn: () => fetchAgents(),
  cachePreset: 'dynamic',
});
```

### Using Optimistic Mutation
```tsx
import { useOptimisticMutation } from '@/lib/hooks';

const mutation = useOptimisticMutation({
  mutationFn: updateAgent,
  cacheKey: 'agents-list',
  onOptimisticUpdate: (oldData, newData) => ({
    ...oldData,
    ...newData,
  }),
});
```

### Lazy Loading Charts
```tsx
import { PerformanceTabLazy, LazyChartWrapper } from '@/components/performance';

<Suspense fallback={<ChartSkeleton />}>
  <LazyChartWrapper height={300}>
    <PerformanceTabLazy data={data} />
  </LazyChartWrapper>
</Suspense>
```

---

## Files Added/Modified

### New Files
- `src/components/performance/lazy-analytics.tsx` - Lazy loading wrappers
- `src/components/performance/OptimizedImage.tsx` - Image optimization
- `src/components/performance/index.ts` - Barrel exports
- `src/app/api/analytics/vitals/route.ts` - Web vitals API
- `src/app/(portal)/portal/performance/page.tsx` - Performance dashboard
- `src/lib/hooks/use-optimized-queries.ts` - Optimized React Query hooks
- `src/lib/performance/render-monitor.tsx` - Render performance tracking
- `src/lib/performance/prefetch.ts` - Data prefetching utilities
- `src/lib/performance/index.ts` - Performance utilities exports

### Modified Files
- `next.config.ts` - Enhanced webpack config, code splitting
- `src/components/dashboard/agents/AgentDetailPanel.tsx` - Lazy load PerformanceTab
- `src/lib/hooks/index.ts` - Export optimized query hooks

---

## Metrics to Monitor

After deployment, monitor these metrics:

1. **Bundle Size** - Run `npm run analyze` to check chunk sizes
2. **Core Web Vitals** - Check `/portal/performance` dashboard
3. **Lighthouse Score** - Run `npm run lighthouse`
4. **API Response Times** - Monitor React Query devtools
5. **Render Performance** - Check console for slow render warnings (dev)

---

## Future Improvements

1. **Service Worker** - Add offline support and asset caching
2. **Edge Caching** - Configure Vercel Edge Network caching
3. **Analytics Integration** - Connect to Vercel Analytics or Datadog
4. **Image CDN** - Consider Cloudinary or Imgix for image optimization
5. **Streaming** - Implement React 18 streaming SSR
