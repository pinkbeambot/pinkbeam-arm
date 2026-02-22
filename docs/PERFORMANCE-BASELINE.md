# Performance Baseline

**Project:** Pink Beam ARM  
**Purpose:** Performance budgets, monitoring setup, and optimization targets  
**Last Updated:** 2026-02-21  

---

## Table of Contents

1. [Performance Budgets](#performance-budgets)
2. [Core Web Vitals Targets](#core-web-vitals-targets)
3. [Lighthouse Configuration](#lighthouse-configuration)
4. [Real User Monitoring (RUM)](#real-user-monitoring-rum)
5. [Application Performance Monitoring (APM)](#application-performance-monitoring-apm)
6. [Bundle Analysis](#bundle-analysis)
7. [Optimization Checklist](#optimization-checklist)

---

## Performance Budgets

### Page Budgets

| Page | Max FCP | Max LCP | Max TTI | Max TBT | Max CLS | Bundle Size |
|------|---------|---------|---------|---------|---------|-------------|
| `/` (Home) | 1.5s | 2.5s | 3.0s | 200ms | 0.1 | 200KB |
| `/login` | 1.0s | 1.5s | 2.0s | 100ms | 0.0 | 150KB |
| `/portal` | 2.0s | 3.0s | 4.0s | 300ms | 0.1 | 500KB |
| `/portal/agents` | 2.0s | 3.0s | 4.0s | 300ms | 0.1 | 400KB |
| `/portal/tasks` | 2.0s | 3.0s | 4.0s | 300ms | 0.1 | 400KB |
| `/portal/chat` | 1.5s | 2.5s | 3.0s | 200ms | 0.1 | 350KB |
| `/portal/metrics` | 2.5s | 4.0s | 5.0s | 400ms | 0.1 | 600KB |

### API Response Time Budgets

| Endpoint | p50 | p95 | p99 | Timeout |
|----------|-----|-----|-----|---------|
| `/api/auth/*` | 100ms | 300ms | 500ms | 5s |
| `/api/agents` | 200ms | 500ms | 1000ms | 10s |
| `/api/tasks` | 200ms | 500ms | 1000ms | 10s |
| `/api/webhooks/*` | 100ms | 500ms | 2000ms | 30s |
| `/api/cron/*` | 500ms | 2000ms | 5000ms | 60s |

### Resource Budgets

| Resource Type | Budget | Gzip Budget |
|---------------|--------|-------------|
| JavaScript (total) | 1MB | 300KB |
| CSS (total) | 100KB | 20KB |
| Images (per page) | 2MB | - |
| Fonts | 100KB | - |
| API Payload (average) | 50KB | - |

---

## Core Web Vitals Targets

### Google Core Web Vitals

| Metric | Good | Needs Improvement | Poor | Target |
|--------|------|-------------------|------|--------|
| **LCP** (Largest Contentful Paint) | ≤2.5s | ≤4.0s | >4.0s | ≤2.5s |
| **FID** (First Input Delay) | ≤100ms | ≤300ms | >300ms | ≤100ms |
| **CLS** (Cumulative Layout Shift) | ≤0.1 | ≤0.25 | >0.25 | ≤0.1 |
| **FCP** (First Contentful Paint) | ≤1.8s | ≤3.0s | >3.0s | ≤1.5s |
| **TTFB** (Time to First Byte) | ≤600ms | ≤1000ms | >1000ms | ≤500ms |
| **INP** (Interaction to Next Paint) | ≤200ms | ≤500ms | >500ms | ≤200ms |

### Monitoring Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| LCP | >2.0s | >3.0s |
| FID | >50ms | >100ms |
| CLS | >0.05 | >0.1 |
| Error Rate | >1% | >5% |

---

## Lighthouse Configuration

### CI Configuration

```json
// lighthouserc.json (existing, enhanced)
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/login",
        "http://localhost:3000/portal",
        "http://localhost:3000/portal/agents",
        "http://localhost:3000/portal/chat",
        "http://localhost:3000/portal/tasks",
        "http://localhost:3000/portal/metrics"
      ],
      "numberOfRuns": 3,
      "startServerCommand": "npm run start",
      "startServerReadyPattern": "ready started server",
      "startServerReadyTimeout": 120000,
      "settings": {
        "preset": "desktop",
        "onlyCategories": ["performance", "accessibility", "best-practices", "seo"],
        "skipAudits": ["uses-http2", "screenshot-thumbnails"],
        "chromeFlags": "--no-sandbox --headless --disable-dev-shm-usage",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638.4,
          "cpuSlowdownMultiplier": 4
        },
        "emulatedUserAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }],
        
        "first-contentful-paint": ["warn", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interactive": ["warn", { "maxNumericValue": 3500 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 200 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "speed-index": ["warn", { "maxNumericValue": 2300 }],
        
        "dom-size": ["warn", { "maxNumericValue": 1500 }],
        "unused-javascript": ["warn", { "maxLength": 10 }],
        "unused-css-rules": ["warn", { "maxLength": 10 }],
        "render-blocking-resources": ["warn", { "maxLength": 5 }],
        "modern-image-formats": "off",
        "uses-responsive-images": "off",
        "bf-cache": "off"
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Mobile Performance Testing

```json
// lighthouserc.mobile.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/login",
        "http://localhost:3000/portal"
      ],
      "numberOfRuns": 3,
      "startServerCommand": "npm run start",
      "settings": {
        "preset": "mobile",
        "throttling": {
          "rttMs": 300,
          "throughputKbps": 700,
          "cpuSlowdownMultiplier": 4
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.85 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["warn", { "maxNumericValue": 3500 }]
      }
    }
  }
}
```

---

## Real User Monitoring (RUM)

### Vercel Analytics (Built-in)

Enable Real Experience Score:

```bash
# Enable in Vercel Dashboard
# Project → Analytics → Enable

# Or via CLI
vercel analytics enable
```

Configuration in `next.config.ts`:

```typescript
// Already enabled by Vercel, but verify:
const nextConfig = {
  // ... other config
  
  // Vercel Analytics auto-configured
  // No additional setup needed for Web Vitals
};
```

### Custom Web Vitals Reporting

```typescript
// src/lib/analytics/web-vitals.ts
import { getCLS, getFCP, getFID, getLCP, getTTFB, getINP } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';

const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals';

function getConnectionSpeed() {
  return 'connection' in navigator &&
    navigator['connection'] &&
    'effectiveType' in navigator['connection']
    ? navigator['connection']['effectiveType']
    : '';
}

export function reportWebVitals(metric: any) {
  const body = {
    dsn: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID,
    id: metric.id,
    page: window.location.pathname,
    href: window.location.href,
    event_name: metric.name,
    value: metric.value.toString(),
    speed: getConnectionSpeed(),
  };

  // Send to Vercel Analytics
  const blob = new Blob([new URLSearchParams(body).toString()], {
    type: 'application/x-www-form-urlencoded',
  });
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsUrl, blob);
  } else {
    fetch(vitalsUrl, {
      body: blob,
      method: 'POST',
      credentials: 'omit',
      keepalive: true,
    });
  }

  // Send to Sentry for performance tracking
  Sentry.captureMessage(`Web Vital: ${metric.name}`, {
    level: 'info',
    tags: {
      name: metric.name,
      rating: metric.rating,
    },
    extra: {
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    },
  });
}

export function initWebVitals() {
  getCLS(reportWebVitals);
  getFID(reportWebVitals);
  getFCP(reportWebVitals);
  getLCP(reportWebVitals);
  getTTFB(reportWebVitals);
  getINP(reportWebVitals);
}
```

```tsx
// app/layout.tsx (addition)
import { initWebVitals } from '@/lib/analytics/web-vitals';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize Web Vitals tracking
  if (typeof window !== 'undefined') {
    initWebVitals();
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### RUM Dashboard

**Vercel Analytics:** https://vercel.com/pinkbeam/arm/analytics

Key metrics tracked:
- Real Experience Score
- Core Web Vitals distribution
- Performance by geography
- Performance by device type

---

## Application Performance Monitoring (APM)

### Sentry Performance Monitoring

```typescript
// sentry.client.config.ts (additions)
Sentry.init({
  // ... existing config
  
  // Performance monitoring
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  
  // Profiles sample rate
  profilesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.01 : 1.0,
  
  integrations: [
    // ... existing integrations
    Sentry.browserProfilingIntegration(),
  ],
  
  // Performance thresholds
  beforeSendTransaction(event) {
    // Filter out health checks
    if (event.transaction?.includes('/api/health')) {
      return null;
    }
    return event;
  },
});
```

### Custom Performance Spans

```typescript
// src/lib/performance.ts
import * as Sentry from '@sentry/nextjs';

export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const span = Sentry.startInactiveSpan({
    name,
    op: 'custom',
    tags,
  });

  const start = performance.now();
  
  return fn()
    .finally(() => {
      span?.finish();
      const duration = performance.now() - start;
      
      // Log slow operations
      if (duration > 1000) {
        Sentry.captureMessage(`Slow operation: ${name}`, {
          level: 'warning',
          extra: { duration, name },
        });
      }
    });
}

export function measureSync<T>(
  name: string,
  fn: () => T,
  tags?: Record<string, string>
): T {
  const span = Sentry.startInactiveSpan({
    name,
    op: 'custom',
    tags,
  });

  const start = performance.now();
  
  try {
    return fn();
  } finally {
    span?.finish();
    const duration = performance.now() - start;
    
    if (duration > 100) {
      Sentry.captureMessage(`Slow sync operation: ${name}`, {
        level: 'warning',
        extra: { duration, name },
      });
    }
  }
}
```

### API Performance Tracking

```typescript
// Middleware for API route timing
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export function middleware(request: NextRequest) {
  const start = Date.now();
  
  const response = NextResponse.next();
  
  const duration = Date.now() - start;
  
  // Add timing header
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  // Track slow requests
  if (duration > 1000) {
    Sentry.captureMessage('Slow API request', {
      level: 'warning',
      tags: {
        path: request.nextUrl.pathname,
        method: request.method,
      },
      extra: {
        duration,
        query: request.nextUrl.search,
      },
    });
  }
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## Bundle Analysis

### Webpack Bundle Analyzer

```bash
# Analyze bundle size
npm run analyze

# This opens a visualization of the bundle composition
```

Configuration in `next.config.ts`:

```typescript
// Already configured with @next/bundle-analyzer
// Set ANALYZE=true to enable
```

### Bundle Size Monitoring

```yaml
# .github/workflows/bundle-analysis.yml
name: Bundle Analysis

on:
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Build and analyze
        run: |
          ANALYZE=true npm run build 2>&1 | tee bundle-analysis.txt
          
      - name: Check bundle size
        run: |
          # Extract total size from build output
          TOTAL_SIZE=$(grep -oP 'First Load JS shared by all \K[0-9.]+' bundle-analysis.txt || echo "0")
          echo "Total bundle size: ${TOTAL_SIZE}KB"
          
          # Fail if over budget (1MB = 1024KB)
          if (( $(echo "$TOTAL_SIZE > 1024" | bc -l) )); then
            echo "❌ Bundle size exceeds 1MB budget!"
            exit 1
          fi
          
      - uses: actions/upload-artifact@v6
        with:
          name: bundle-analysis
          path: bundle-analysis.txt
```

### Size Limit Configuration

```json
// .size-limit.json
[
  {
    "path": ".next/static/chunks/**/*.js",
    "limit": "300 KB",
    "gzip": true
  },
  {
    "path": ".next/static/css/**/*.css",
    "limit": "20 KB",
    "gzip": true
  },
  {
    "path": ".next/server/app/**/*.js",
    "limit": "500 KB",
    "gzip": true
  }
]
```

---

## Optimization Checklist

### Pre-Release Performance Checklist

- [ ] Lighthouse score ≥ 90 on all critical pages
- [ ] Core Web Vitals passing (LCP < 2.5s, CLS < 0.1, FID < 100ms)
- [ ] Bundle size under budget
- [ ] No render-blocking resources
- [ ] Images optimized (WebP/AVIF, lazy loaded)
- [ ] Fonts preloaded
- [ ] JavaScript code-split properly
- [ ] API response times under budget
- [ ] Database queries optimized
- [ ] CDN caching configured

### Performance Monitoring Checklist

- [ ] Vercel Analytics enabled
- [ ] Sentry performance monitoring configured
- [ ] Web Vitals reporting active
- [ ] Lighthouse CI configured
- [ ] Bundle size tracking enabled
- [ ] Alert thresholds configured
- [ ] Performance dashboard created
- [ ] RUM data being collected

### Optimization Techniques

**Images:**
- Use Next.js Image component
- Serve WebP/AVIF formats
- Implement lazy loading
- Use appropriate sizes

**JavaScript:**
- Code split by route
- Dynamic imports for heavy components
- Tree shake unused code
- Use `next/dynamic` for non-critical components

**CSS:**
- Purge unused styles
- Inline critical CSS
- Defer non-critical styles

**APIs:**
- Implement caching headers
- Use Edge Functions for latency-sensitive operations
- Optimize database queries
- Use connection pooling

**Database:**
- Add indexes for common queries
- Use prepared statements
- Implement query result caching
- Monitor slow query log

---

## Appendix

### Performance Testing Commands

```bash
# Run Lighthouse locally
npm run lighthouse

# Run with specific config
lhci autorun --config=lighthouserc.mobile.json

# Analyze bundle
npm run analyze

# Run performance tests
npm run test:perf

# Check bundle size
npm run size
```

### Performance Testing Tools

| Tool | Purpose | URL |
|------|---------|-----|
| Lighthouse | Page audits | Built-in |
| WebPageTest | Detailed analysis | webpagetest.org |
| PageSpeed Insights | Google scoring | pagespeed.web.dev |
| GTmetrix | Performance testing | gtmetrix.com |
| Sentry | APM | sentry.io |
| Vercel Analytics | RUM | vercel.com/analytics |

### Related Documentation

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
- `docs/PRODUCTION-DEPLOYMENT-RUNBOOK.md` - Deployment procedures

### Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-21 | 1.0 | Initial performance baseline |
