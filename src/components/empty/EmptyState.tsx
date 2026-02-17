'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, Search, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { EmptyStateProps } from './types';

/**
 * Base Empty State Component
 * 
 * Provides visual feedback when no content is available.
 * Three variants: default, search, and error.
 * 
 * @example
 * ```tsx
 * // Default empty state
 * <EmptyState
 *   icon={Bot}
 *   title="No agents yet"
 *   description="Create your first AI agent to start delegating tasks."
 *   action={{ label: "Create Agent", href: "/agents/new" }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  className,
  children,
}: EmptyStateProps) {
  // Variant-specific styles
  const variantStyles = {
    default: {
      iconColor: 'text-muted-foreground',
      iconBg: 'bg-muted/50',
      borderColor: 'border-dashed',
    },
    search: {
      iconColor: 'text-muted-foreground',
      iconBg: 'bg-muted/50',
      borderColor: 'border-dashed',
    },
    error: {
      iconColor: 'text-destructive',
      iconBg: 'bg-destructive/10',
      borderColor: 'border-destructive/20',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        'p-6 sm:p-8 lg:p-12 text-center',
        styles.borderColor,
        className
      )}
    >
      {/* Icon Container */}
      <div
        className={cn(
          'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
          styles.iconBg
        )}
      >
        <Icon className={cn('h-8 w-8', styles.iconColor)} aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="w-full sm:w-auto"
            >
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              variant={variant === 'error' ? 'default' : 'beam'}
              onClick={action.onClick}
              asChild={!!action.href}
              className="w-full sm:w-auto"
            >
              {action.href ? (
                <Link href={action.href}>{action.label}</Link>
              ) : (
                action.label
              )}
            </Button>
          )}
        </div>
      )}

      {/* Additional content (error details, etc.) */}
      {children}
    </Card>
  );
}

/**
 * Default Empty State
 * 
 * Use when: No data exists yet (first-use, empty collection)
 * 
 * @example
 * ```tsx
 * <EmptyStateDefault
 *   icon={Bot}
 *   title="No agents yet"
 *   description="Create your first AI agent to start delegating tasks."
 *   action={{ label: "Create Agent", href: "/agents/new" }}
 * />
 * ```
 */
export function EmptyStateDefault(
  props: Omit<EmptyStateProps, 'variant'>
) {
  return <EmptyState {...props} variant="default" />;
}

/**
 * Search Empty State
 * 
 * Use when: Filters/search returned no results
 * 
 * @example
 * ```tsx
 * <EmptyStateSearch
 *   title="No results found"
 *   description={`No agents match "${query}".`}
 *   onClear={() => setQuery('')}
 * />
 * ```
 */
export interface EmptyStateSearchProps {
  title?: string;
  description: string;
  onClear: () => void;
  clearLabel?: string;
  className?: string;
}

export function EmptyStateSearch({
  title = 'No results found',
  description,
  onClear,
  clearLabel = 'Clear search',
  className,
}: EmptyStateSearchProps) {
  return (
    <EmptyState
      icon={Search}
      title={title}
      description={description}
      action={{ label: clearLabel, onClick: onClear }}
      variant="search"
      className={className}
    />
  );
}

/**
 * Error Empty State
 * 
 * Use when: Data failed to load or an error occurred
 * 
 * @example
 * ```tsx
 * <EmptyStateError
 *   title="Failed to load agents"
 *   description="We couldn't fetch your agents. Please try again."
 *   onRetry={refetch}
 *   error={error}
 * />
 * ```
 */
export interface EmptyStateErrorProps {
  title?: string;
  description: string;
  onRetry: () => void;
  retryLabel?: string;
  error?: Error | null;
  showDetails?: boolean;
  className?: string;
}

export function EmptyStateError({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try Again',
  error,
  showDetails = false,
  className,
}: EmptyStateErrorProps) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      action={{ label: retryLabel, onClick: onRetry }}
      variant="error"
      className={className}
    >
      {showDetails && error?.message && (
        <p className="text-xs text-destructive/60 font-mono mt-4 max-w-md mx-auto">
          {error.message}
        </p>
      )}
    </EmptyState>
  );
}
