import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.VERCEL_ENV || 'development',
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Sampling rates
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  
  // Server-specific integrations
  integrations: [
    Sentry.httpIntegration({
      breadcrumbs: true,
    }),
    Sentry.postgresIntegration(), // Auto-instrument PostgreSQL queries
  ],
  
  // Track slow requests
  beforeSendTransaction(event) {
    // Filter out health checks
    if (event.transaction?.includes('/api/health')) {
      return null;
    }
    
    // Add server context
    if (event.contexts?.runtime) {
      event.contexts.runtime = {
        ...event.contexts.runtime,
        name: 'nodejs',
        version: process.version,
      };
    }
    
    return event;
  },
  
  // Include local variables in stack traces (development only)
  includeLocalVariables: process.env.NODE_ENV === 'development',
  
  // Maximum depth for object serialization
  normalizeDepth: 5,
});
