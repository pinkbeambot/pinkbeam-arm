import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.VERCEL_ENV || 'development',
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Sampling rates - production: 10% for performance, 1% for sessions
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: process.env.VERCEL_ENV === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Session replay configuration
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
      maskAllInputs: true, // Always mask inputs for security
    }),
    Sentry.browserTracingIntegration({
      // Track component render times
      instrumentNavigation: true,
      instrumentPageLoad: true,
    }),
  ],
  
  // Error filtering
  beforeSend(event) {
    // Filter out known non-critical errors
    const ignoreErrors = [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
      'Failed to fetch',
      'AbortError: The user aborted a request',
      'AbortError: Fetch is aborted',
      'TypeError: Failed to fetch',
      'TypeError: NetworkError when attempting to fetch resource',
    ];
    
    const errorMessage = event.exception?.values?.[0]?.value || '';
    if (ignoreErrors.some(e => errorMessage.includes(e))) {
      return null;
    }
    
    // Filter out browser extension errors
    const frames = event.exception?.values?.[0]?.stacktrace?.frames || [];
    if (frames.some(frame => frame.filename?.includes('chrome-extension://'))) {
      return null;
    }
    
    return event;
  },
  
  // Tag errors with tenant info when available
  beforeSendTransaction(event) {
    // Filter out health checks from performance tracking
    if (event.transaction?.includes('/api/health')) {
      return null;
    }
    return event;
  },
  
  // Debug in development
  debug: process.env.NODE_ENV === 'development',
  
  // Attach stack traces to messages
  attachStacktrace: true,
});
