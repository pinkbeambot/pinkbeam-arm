'use client';

import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: { componentStack?: string };
  title?: string;
  description?: string;
  showDetails?: boolean;
  onReset?: () => void;
  onReload?: () => void;
  onHome?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'p-6 max-w-sm',
  md: 'p-8 max-w-lg',
  lg: 'p-12 max-w-2xl',
};

/**
 * ErrorFallback - Graceful error display UI component
 * 
 * Shows user-friendly error messages with options to retry, reload, or go home.
 * Can display technical error details in development mode.
 */
export function ErrorFallback({
  error,
  errorInfo,
  title = 'Something went wrong',
  description = 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
  showDetails = process.env.NODE_ENV === 'development',
  onReset,
  onReload,
  onHome,
  className,
  size = 'md',
}: ErrorFallbackProps) {
  const handleReload = () => {
    if (onReload) {
      onReload();
    } else {
      window.location.reload();
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      window.location.href = '/portal';
    }
  };

  return (
    <Card
      className={cn(
        'text-center border-destructive/50 bg-destructive/5 mx-auto',
        sizeClasses[size],
        className
      )}
    >
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>

        {showDetails && error && (
          <details className="w-full text-left mb-6">
            <summary className="cursor-pointer font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Error Details (Development Only)
            </summary>
            <div className="bg-muted p-4 rounded-lg overflow-auto max-h-48">
              <code className="text-xs text-destructive whitespace-pre-wrap block">
                {error.name}: {error.message}
              </code>
              {errorInfo?.componentStack && (
                <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              )}
              {error.stack && (
                <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          {onReset && (
            <Button
              onClick={onReset}
              variant="outline"
              className="gap-2"
              data-testid="error-retry-button"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button
            onClick={handleReload}
            variant="default"
            className="gap-2 bg-pink-500 hover:bg-pink-600"
            data-testid="error-reload-button"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>
          {onHome && (
            <Button
              onClick={handleHome}
              variant="ghost"
              className="gap-2"
              data-testid="error-home-button"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * ErrorFallback with integrated ErrorBoundary wrapper
 * Use this when you want a self-contained error boundary with fallback UI
 */
export function ErrorBoundaryWithFallback({
  children,
  ...fallbackProps
}: Omit<React.ComponentProps<typeof ErrorFallback>, 'error' | 'errorInfo'> & {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback {...fallbackProps} />}
      onReset={fallbackProps.onReset}
    >
      {children}
    </ErrorBoundary>
  );
}

// Import ErrorBoundary for the wrapper component
import { ErrorBoundary } from './ErrorBoundary';

export default ErrorFallback;
