# Performance Optimization Guide

## Overview

This document outlines the performance optimizations implemented for the Pink Beam ARM portal.

## Implemented Optimizations

### 1. Bundle Optimization

#### Code Splitting
- Heavy components are dynamically imported using Next.js `dynamic()`
- Separate chunks for Recharts, Framer Motion, and UI components
- Webpack splitChunks configuration for optimal caching

#### Lazy-Loaded Components
| Component | Reason |
|-----------|--------|
| `ChatPanelLazy` | Heavy TipTap editor + realtime subscriptions |
| `RealtimeMetricsDashboardLazy` | Heavy Recharts library |
| `AgentConfigFormLazy` | Large form with many fields |
| `SwaggerUILazy` | Very heavy documentation library |
| `ReactFlowLazy` | Heavy canvas workflow editor |

### 2. Caching Strategy

#### React Query Configuration
```typescript
- staleTime: 5 minutes (default)
- gcTime: 10 minutes (cache time)
- refetchOnWindowFocus: false
```

#### Local Storage
- User preferences (sidebar, theme, dashboard view)
- Chat preferences (font size, timestamps)
- Recent items (searches, agents)

### 3. Image Optimization

- Next.js Image component with WebP format
- Lazy loading with blur placeholder
- Responsive sizes for different viewports
- 30-day cache TTL

### 4. Intersection Observer

- Lazy rendering of below-fold content
- Virtual scrolling for long lists
- Configurable rootMargin for early loading

### 5. CSS Optimization

- Tailwind CSS 4 with automatic purging
- Critical CSS extraction
- Font display: swap for faster initial paint

### 6. Performance Monitoring

#### Web Vitals Tracking
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Time to First Byte (TTFB)

#### Lighthouse CI
Configuration in `lighthouserc.json` with budgets:
- Performance: 90+
- FCP: < 1500ms
- LCP: < 2500ms
- TTI: < 3000ms
- CLS: < 0.1

## Usage

### Lazy Loading Components

```tsx
import { ChatPanelLazy } from '@/lib/performance/lazy-components';

// Use like normal component
<ChatPanelLazy
  chatId={selectedChatId}
  open={chatOpen}
  onOpenChange={setChatOpen}
/>
```

### Using Intersection Observer

```tsx
import { useInView } from '@/lib/performance/hooks';

function MyComponent() {
  const { ref, isInView } = useInView({ triggerOnce: true });
  
  return (
    <div ref={ref}>
      {isInView && <ExpensiveContent />}
    </div>
  );
}
```

### User Preferences

```tsx
import { useUserPreferences } from '@/lib/performance/storage';

function MyComponent() {
  const [preferences, setPreferences] = useUserPreferences();
  
  return (
    <button onClick={() => setPreferences(p => ({ ...p, sidebarCollapsed: true }))}>
      Collapse Sidebar
    </button>
  );
}
```

## Testing

Run performance tests:
```bash
npm run test -- src/__tests__/performance/
```

Run bundle analysis:
```bash
npm run analyze
```

Run Lighthouse CI:
```bash
npm run lighthouse
```

## Performance Budgets

| Metric | Budget |
|--------|--------|
| Initial JS | 200 KB |
| Async Chunks | 500 KB |
| CSS | 50 KB |
| FCP | < 1500ms |
| LCP | < 2500ms |
| TTI | < 3000ms |
| CLS | < 0.1 |

## Future Improvements

1. Service Worker for offline support
2. Resource hints (preconnect, prefetch)
3. HTTP/3 when available
4. Edge caching configuration
5. Real user monitoring (RUM)
