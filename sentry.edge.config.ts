import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.VERCEL_ENV || 'development',
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Sampling rates for edge functions
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  
  // Edge-specific settings
  beforeSend(event) {
    // Filter common edge function noise
    const ignoreErrors = [
      'The operation was aborted',
      'AbortError',
    ];
    
    const errorMessage = event.exception?.values?.[0]?.value || '';
    if (ignoreErrors.some(e => errorMessage.includes(e))) {
      return null;
    }
    
    return event;
  },
});
