# Monitoring & Alerting Setup

**Project:** Pink Beam ARM  
**Purpose:** Configure error tracking, performance monitoring, and alerting  
**Last Updated:** 2026-02-21  

---

## Table of Contents

1. [Sentry Configuration](#sentry-configuration)
2. [Uptime Monitoring](#uptime-monitoring)
3. [Log Aggregation](#log-aggregation)
4. [Alert Thresholds](#alert-thresholds)
5. [Dashboard Setup](#dashboard-setup)

---

## Sentry Configuration

### Project Setup

**1. Create Sentry Project:**
- Organization: `pinkbeam`
- Project: `arm-production`
- Platform: Next.js

**2. Install Sentry SDK:**

```bash
npm install @sentry/nextjs
```

**3. Configure Sentry:**

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.VERCEL_ENV || 'development',
  
  // Sampling rates
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  
  // Performance monitoring
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],
  
  // Error filtering
  beforeSend(event) {
    // Filter out known non-critical errors
    const ignoreErrors = [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Failed to fetch',
    ];
    
    if (event.exception?.values?.[0]?.value && 
        ignoreErrors.some(e => event.exception!.values![0].value!.includes(e))) {
      return null;
    }
    
    return event;
  },
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Debug in development
  debug: process.env.NODE_ENV === 'development',
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  
  // Server-specific configuration
  integrations: [
    Sentry.httpIntegration({
      breadcrumbs: true,
    }),
  ],
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
});
```

```typescript
// sentry.edge.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
});
```

**4. Next.js Configuration:**

```typescript
// next.config.ts (additions)
import { withSentryConfig } from '@sentry/nextjs';

// ... existing config

const sentryWebpackPluginOptions = {
  org: 'pinkbeam',
  project: 'arm-production',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
```

**5. Error Boundary Component:**

```tsx
// src/components/ErrorBoundary.tsx
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">
          We've been notified and are working on a fix.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

### Environment Variables

```bash
# Client-side (public)
NEXT_PUBLIC_SENTRY_DSN=https://<key>@sentry.io/<project>

# Server-side (private)
SENTRY_AUTH_TOKEN=<internal-integration-token>
```

Set these in Vercel:

```bash
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add SENTRY_AUTH_TOKEN production
```

---

## Uptime Monitoring

### UptimeRobot Configuration

**Monitors:**

| Name | URL | Interval | Alert Threshold |
|------|-----|----------|-----------------|
| Homepage | https://pinkbeam.io | 60s | 2 failures |
| API Health | https://pinkbeam.io/api/health | 60s | 2 failures |
| Login Page | https://pinkbeam.io/login | 300s | 2 failures |
| Portal | https://pinkbeam.io/portal | 300s | 2 failures |
| Supabase API | https://<project>.supabase.co/rest/v1/ | 60s | 3 failures |

**Alert Contacts:**
- Slack: #alerts-production
- Email: oncall@pinkbeam.io
- PagerDuty: For critical monitors (homepage, API health)

### Status Page

**Status Page URL:** https://status.pinkbeam.io

**Components:**
- Website (pinkbeam.io)
- API (api.pinkbeam.io)
- Authentication
- Database (Supabase)
- Real-time Features
- Email Delivery (Resend)

---

## Log Aggregation

### Supabase Logs

Supabase provides built-in logging:

**Postgres Logs:**
- Slow queries (>1s)
- Failed auth attempts
- RLS policy violations

**API Logs:**
- Edge function invocations
- REST API requests
- Auth events

**Access:**
```
Supabase Dashboard → Project → Logs
```

### Vercel Logs

Application logs are available in:
- Vercel Dashboard
- Vercel CLI: `vercel logs pinkbeam.io --production`

### Log Retention

| Source | Retention | Export |
|--------|-----------|--------|
| Vercel | 3 days | S3 integration |
| Supabase | 7 days | Logflare integration |
| Sentry | 90 days | N/A |

### Logflare Integration (Optional)

For longer retention and analysis:

```bash
# Install Logflare
npm install @logflare/js

# Configure in Supabase
# Dashboard → Settings → API → Logflare
```

---

## Alert Thresholds

### Error Rate Alerts

| Metric | Warning | Critical | Channel |
|--------|---------|----------|---------|
| Error Rate (5min) | > 1% | > 5% | Slack/PagerDuty |
| New Error Types | > 5/hour | > 20/hour | Slack |
| Unhandled Exceptions | > 10/hour | > 50/hour | Slack/PagerDuty |

### Performance Alerts

| Metric | Warning | Critical | Channel |
|--------|---------|----------|---------|
| API p95 Latency | > 500ms | > 1000ms | Slack |
| API p99 Latency | > 1000ms | > 3000ms | Slack/PagerDuty |
| Page Load Time | > 3s | > 5s | Slack |
| Core Web Vitals LCP | > 2.5s | > 4s | Slack |

### Infrastructure Alerts

| Metric | Warning | Critical | Channel |
|--------|---------|----------|---------|
| Database CPU | > 70% | > 90% | Slack |
| Database Connections | > 60 | > 80 | Slack/PagerDuty |
| Database Storage | > 70% | > 85% | Slack |
| Edge Function Errors | > 5% | > 10% | Slack |

### Business Metric Alerts

| Metric | Warning | Critical | Channel |
|--------|---------|----------|---------|
| Failed Auth Rate | > 10% | > 25% | Slack |
| Checkout Failures | > 5% | > 15% | Slack/PagerDuty |
| Email Bounce Rate | > 5% | > 10% | Slack |

### Sentry Alert Rules

```
Rule: High Error Volume
- Condition: events matching "error" exceed 100 in 5 minutes
- Action: Send Slack notification to #alerts-production
- Action: Create PagerDuty incident (P2)

Rule: New Error Pattern
- Condition: New issue discovered
- Action: Send Slack notification to #alerts-production

Rule: Performance Regression
- Condition: Transaction duration p95 > 1000ms
- Action: Send Slack notification

Rule: User Feedback
- Condition: New user feedback submitted
- Action: Send Slack notification to #user-feedback
```

---

## Dashboard Setup

### Sentry Dashboards

**Main Dashboard:**
- Error volume (last 24 hours)
- Error rate by release
- Most frequent issues
- Performance overview
- User feedback

**Performance Dashboard:**
- API response times (p50, p95, p99)
- Web Vitals (LCP, FID, CLS)
- Transaction breakdown
- Database query performance

### Vercel Analytics

Enable in project settings:
```
Vercel Dashboard → pinkbeam/arm → Analytics → Enable
```

Key metrics:
- Real Experience Score
- Core Web Vitals
- Traffic insights
- Performance trends

### Custom Grafana Dashboard (Optional)

For advanced monitoring, export Supabase metrics to Grafana:

```yaml
# docker-compose.yml for Grafana
version: '3'
services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
      
volumes:
  grafana-storage:
```

### Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    checks: {} as Record<string, { status: string; responseTime?: number; error?: string }>,
  };

  // Check database connectivity
  const dbStart = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('tenants').select('id').limit(1);
    
    if (error) throw error;
    
    checks.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart,
    };
  } catch (err) {
    checks.checks.database = {
      status: 'unhealthy',
      responseTime: Date.now() - dbStart,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    checks.status = 'unhealthy';
  }

  // Check Supabase Auth
  const authStart = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.auth.getSession();
    
    if (error && error.message !== 'Auth session missing!') {
      throw error;
    }
    
    checks.checks.auth = {
      status: 'healthy',
      responseTime: Date.now() - authStart,
    };
  } catch (err) {
    checks.checks.auth = {
      status: 'unhealthy',
      responseTime: Date.now() - authStart,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    checks.status = 'unhealthy';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  
  return NextResponse.json(checks, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
```

---

## Alert Runbook

### Error Rate Spike

```
1. Check Sentry for error patterns
2. Identify affected endpoints/features
3. Check recent deployments
4. If related to deployment, initiate rollback
5. If not, investigate root cause
6. Post update in #incidents channel
```

### Database Connection Pool Exhausted

```
1. Check active connections in Supabase dashboard
2. Look for connection leaks in application
3. Consider increasing pool size temporarily
4. Enable connection pooling if not already
5. Restart application to clear stuck connections
```

### API Latency Spike

```
1. Check Sentry performance dashboard
2. Identify slow transactions
3. Check database query performance
4. Look for N+1 queries
5. Check Supabase connection health
6. Scale Vercel functions if needed
```

---

## Appendix

### Sentry CLI Commands

```bash
# Create release
npx sentry-cli releases new <version>

# Associate commits
npx sentry-cli releases set-commits --auto <version>

# Finalize release
npx sentry-cli releases finalize <version>

# View releases
npx sentry-cli releases list
```

### Related Documentation

- [Sentry Next.js SDK](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel Monitoring](https://vercel.com/docs/concepts/edge-network/compression)
- [Supabase Observability](https://supabase.com/docs/guides/platform/telemetry)
- `docs/PRODUCTION-DEPLOYMENT-RUNBOOK.md` - Deployment procedures

### Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-21 | 1.0 | Initial monitoring setup |
