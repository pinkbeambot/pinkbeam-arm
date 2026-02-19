'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, Home, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PortalErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  portalName?: string;
}

interface PortalErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * PortalErrorBoundary - Error boundary specifically for portal/dashboard areas
 * 
 * Provides portal-contextual error handling with:
 * - Portal-specific messaging
 * - Navigation back to portal home
 * - Graceful degradation UI
 * 
 * Usage:
 * ```tsx
 * <PortalErrorBoundary portalName="Agent Dashboard">
 *   <AgentDashboard />
 * </PortalErrorBoundary>
 * ```
 */
export class PortalErrorBoundary extends Component<PortalErrorBoundaryProps, PortalErrorBoundaryState> {
  constructor(props: PortalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): PortalErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`PortalErrorBoundary (${this.props.portalName || 'Unknown'}) caught an error:`, error, errorInfo);
    
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <PortalErrorFallback
          error={this.state.error}
          portalName={this.props.portalName}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface PortalErrorFallbackProps {
  error?: Error;
  portalName?: string;
  onReset?: () => void;
  className?: string;
}

/**
 * PortalErrorFallback - Dashboard/Portal specific error display
 * 
 * Shows contextual error UI for portal sections with:
 * - Portal name context
 * - Safe navigation options
 * - Refresh/retry actions
 */
export function PortalErrorFallback({
  error,
  portalName = 'Portal',
  onReset,
  className,
}: PortalErrorFallbackProps) {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/portal');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn('flex items-center justify-center min-h-[400px] p-4', className)}
    >
      <Card className="max-w-md w-full p-8 text-center border-destructive/20">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"
        >
          <Shield className="h-8 w-8 text-destructive" />
        </motion.div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          {portalName} Error
        </h2>
        
        <p className="text-sm text-muted-foreground mb-6">
          Something went wrong in the {portalName.toLowerCase()}. 
          This section is temporarily unavailable.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-6 p-3 bg-muted rounded-lg text-left">
            <p className="text-xs font-mono text-destructive">
              {error.name}: {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onReset && (
            <Button
              onClick={onReset}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button
            onClick={handleReload}
            variant="default"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
          <Button
            onClick={handleGoHome}
            variant="ghost"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Portal
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * PortalSectionError - Smaller error display for individual portal sections
 * 
 * Use this for card-based or widget-based error states within a portal page
 */
export function PortalSectionError({
  title = 'Section Error',
  description = 'This section failed to load.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center rounded-lg border border-destructive/20 bg-destructive/5',
        className
      )}
    >
      <AlertCircle className="h-8 w-8 text-destructive mb-3" />
      <h4 className="font-medium text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      )}
    </motion.div>
  );
}

export default PortalErrorBoundary;
