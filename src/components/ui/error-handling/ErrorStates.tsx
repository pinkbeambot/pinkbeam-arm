"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  RefreshCw,
  WifiOff,
  ServerOff,
  Lock,
  AlertTriangle,
  Home,
  ArrowLeft,
  X,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

// ============================================================================
// Error State Types
// ============================================================================

type ErrorSeverity = "error" | "warning" | "info";
type ErrorType = "generic" | "network" | "auth" | "server" | "not-found" | "validation";

interface ErrorStateProps {
  type?: ErrorType;
  severity?: ErrorSeverity;
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  onBack?: () => void;
  onDismiss?: () => void;
  className?: string;
  showHomeLink?: boolean;
  showSupportLink?: boolean;
}

// ============================================================================
// Error Icons
// ============================================================================

const errorIcons = {
  generic: AlertCircle,
  network: WifiOff,
  auth: Lock,
  server: ServerOff,
  "not-found": AlertTriangle,
  validation: AlertCircle,
};

const errorColors = {
  error: "text-destructive bg-destructive/10 border-destructive/20",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
};

// ============================================================================
// Main Error State Component
// ============================================================================

/**
 * Comprehensive error state component with retry functionality
 * 
 * @example
 * ```tsx
 * <ErrorState
 *   type="network"
 *   title="Connection lost"
 *   message="Please check your internet connection and try again."
 *   onRetry={handleRetry}
 * />
 * ```
 */
export function ErrorState({
  type = "generic",
  severity = "error",
  title,
  message,
  error,
  onRetry,
  onBack,
  onDismiss,
  className,
  showHomeLink = true,
  showSupportLink = true,
}: ErrorStateProps) {
  const Icon = errorIcons[type];
  const errorMessage = error instanceof Error ? error.message : error;
  
  const defaultTitles: Record<ErrorType, string> = {
    generic: "Something went wrong",
    network: "Connection problem",
    auth: "Access denied",
    server: "Server error",
    "not-found": "Page not found",
    validation: "Invalid input",
  };

  const defaultMessages: Record<ErrorType, string> = {
    generic: "An unexpected error occurred. Please try again.",
    network: "We're having trouble connecting. Please check your internet connection.",
    auth: "You don't have permission to access this resource.",
    server: "Our servers are experiencing issues. Please try again later.",
    "not-found": "The page you're looking for doesn't exist or has been moved.",
    validation: "Please check your input and try again.",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border p-8 text-center",
        errorColors[severity],
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background/50"
      >
        <Icon className="h-8 w-8" />
      </motion.div>

      <h3 className="text-lg font-semibold mb-2">
        {title || defaultTitles[type]}
      </h3>

      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
        {message || defaultMessages[type]}
      </p>

      {errorMessage && (
        <div className="bg-background/50 rounded p-3 mb-4 mx-auto max-w-md">
          <p className="text-xs font-mono text-muted-foreground break-all">
            {errorMessage}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}

        {onBack && (
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        )}

        {showHomeLink && (
          <Button asChild variant={onRetry || onBack ? "outline" : "default"}>
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        )}

        {showSupportLink && (
          <Button asChild variant="ghost">
            <Link href="/support">
              <HelpCircle className="mr-2 h-4 w-4" />
              Get Help
            </Link>
          </Button>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/5 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// Inline Error Alert
// ============================================================================

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Compact inline error alert for embedding in forms and lists
 * 
 * @example
 * ```tsx
 * <InlineError message="Failed to save changes" onRetry={handleRetry} />
 * ```
 */
export function InlineError({ message, onRetry, onDismiss, className }: InlineErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm",
        className
      )}
    >
      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
      <span className="flex-1 text-destructive">{message}</span>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-destructive font-medium hover:underline shrink-0"
        >
          Retry
        </button>
      )}
      
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-destructive/20 rounded transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-destructive" />
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// Form Field Error
// ============================================================================

interface FormFieldErrorProps {
  message: string;
  className?: string;
}

/**
 * Error message for form fields with icon
 * 
 * @example
 * ```tsx
 * <input />
 * <FormFieldError message="Email is required" />
 * ```
 */
export function FormFieldError({ message, className }: FormFieldErrorProps) {
  return (
    <motion.span
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-center gap-1 text-sm text-destructive mt-1", className)}
    >
      <AlertCircle className="h-3 w-3" />
      {message}
    </motion.span>
  );
}

// ============================================================================
// Network Error State
// ============================================================================

interface NetworkErrorProps {
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

/**
 * Specialized network error state with retry animation
 * 
 * @example
 * ```tsx
 * <NetworkError onRetry={refetch} isRetrying={isLoading} />
 * ```
 */
export function NetworkError({ onRetry, isRetrying, className }: NetworkErrorProps) {
  return (
    <ErrorState
      type="network"
      title="Connection lost"
      message="We're having trouble connecting to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      className={className}
    >
      {isRetrying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4 animate-spin" />
          Reconnecting...
        </motion.div>
      )}
    </ErrorState>
  );
}

// ============================================================================
// 404 Not Found State
// ============================================================================

interface NotFoundProps {
  resource?: string;
  onBack?: () => void;
  className?: string;
}

/**
 * 404 Not Found state for resources
 * 
 * @example
 * ```tsx
 * <NotFound resource="Agent" onBack={() => router.back()} />
 * ```
 */
export function NotFound({ resource = "Page", onBack, className }: NotFoundProps) {
  return (
    <ErrorState
      type="not-found"
      severity="warning"
      title={`${resource} not found`}
      message={`The ${resource.toLowerCase()} you're looking for doesn't exist or has been moved.`}
      onBack={onBack}
      className={className}
    />
  );
}

// ============================================================================
// Server Error State
// ============================================================================

interface ServerErrorProps {
  onRetry: () => void;
  error?: Error;
  className?: string;
}

/**
 * Server error state with error ID for support
 * 
 * @example
 * ```tsx
 * <ServerError onRetry={refetch} error={error} />
 * ```
 */
export function ServerError({ onRetry, error, className }: ServerErrorProps) {
  const errorId = React.useMemo(() => 
    `ERR-${Date.now().toString(36).toUpperCase()}`, 
    []
  );

  return (
    <ErrorState
      type="server"
      title="Server error"
      message="We're experiencing technical difficulties. Our team has been notified."
      error={error}
      onRetry={onRetry}
      className={className}
    >
      <p className="text-xs text-muted-foreground mt-4">
        Error ID: {errorId}
      </p>
    </ErrorState>
  );
}

// ============================================================================
// Access Denied State
// ============================================================================

interface AccessDeniedProps {
  requiredRole?: string;
  onRequestAccess?: () => void;
  className?: string;
}

/**
 * Access denied state for permission errors
 * 
 * @example
 * ```tsx
 * <AccessDenied requiredRole="Admin" onRequestAccess={handleRequest} />
 * ```
 */
export function AccessDenied({ requiredRole, onRequestAccess, className }: AccessDeniedProps) {
  return (
    <ErrorState
      type="auth"
      severity="warning"
      title="Access denied"
      message={requiredRole 
        ? `This resource requires ${requiredRole} permissions.` 
        : "You don't have permission to access this resource."}
      className={className}
    >
      {onRequestAccess && (
        <Button onClick={onRequestAccess} variant="outline" className="mt-4">
          Request Access
        </Button>
      )}
    </ErrorState>
  );
}

// ============================================================================
// Error Boundary Fallback
// ============================================================================

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  className?: string;
}

/**
 * Error boundary fallback component
 * 
 * @example
 * ```tsx
 * <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundaryFallback({
  error,
  resetErrorBoundary,
  className,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4", className)}>
      <ErrorState
        type="generic"
        severity="error"
        title="Something went wrong"
        message="An unexpected error occurred in the application."
        error={error}
        onRetry={resetErrorBoundary}
        showHomeLink
        showSupportLink
      />
    </div>
  );
}

// ============================================================================
// Toast Error
// ============================================================================

interface ToastErrorProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Error toast notification component
 * 
 * @example
 * ```tsx
 * toast.error(<ToastError message="Failed to save" action={{ label: "Retry", onClick: retry }} />)
 * ```
 */
export function ToastError({ message, action }: ToastErrorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {message}
      </span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium underline underline-offset-2 hover:no-underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
