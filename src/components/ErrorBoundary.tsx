'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error to Sentry with additional context
    Sentry.captureException(error, {
      tags: {
        component: 'ErrorBoundary',
      },
      extra: {
        digest: error.digest,
        stack: error.stack,
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground">
            We&apos;ve been notified and are working on a fix.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="text-left bg-muted p-4 rounded-lg overflow-auto max-h-48">
            <p className="text-xs font-mono text-destructive">{error.message}</p>
            <pre className="text-xs text-muted-foreground mt-2 overflow-auto">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go home
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Error ID: {error.digest || 'unknown'}
        </p>
      </div>
    </div>
  );
}
