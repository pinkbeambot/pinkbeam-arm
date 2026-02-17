import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'p-8',
  md: 'p-12',
  lg: 'p-16',
};

const iconSizes = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

/**
 * EmptyState - Configurable empty state component
 * 
 * Used when:
 * - Agent Roster has no agents
 * - Task Pipeline has no tasks
 * - Activity Feed has no activities
 * - Search returns no results
 * 
 * Features:
 * - Configurable icon, title, description
 * - Primary and secondary action buttons
 * - Multiple size variants
 * 
 * Example:
 * ```tsx
 * <EmptyState
 *   icon={Users}
 *   title="No agents yet"
 *   description="Get started by creating your first AI agent"
 *   action={{ label: 'Create Agent', onClick: handleCreate }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const renderAction = (actionConfig?: EmptyStateAction) => {
    if (!actionConfig) return null;

    const variant = actionConfig.variant || 'default';
    const buttonClass =
      variant === 'default'
        ? 'bg-pink-500 hover:bg-pink-600'
        : '';

    if (actionConfig.href) {
      return (
        <Button
          key={actionConfig.label}
          variant={variant}
          className={buttonClass}
          asChild
        >
          <a href={actionConfig.href}>{actionConfig.label}</a>
        </Button>
      );
    }

    return (
      <Button
        key={actionConfig.label}
        variant={variant}
        className={buttonClass}
        onClick={actionConfig.onClick}
      >
        {actionConfig.label}
      </Button>
    );
  };

  return (
    <Card
      className={cn(
        'text-center border-dashed border-2',
        sizeClasses[size],
        className
      )}
    >
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className={cn('text-muted-foreground', iconSizes[size])} />
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          {description}
        </p>

        {(action || secondaryAction) && (
          <div className="flex flex-wrap gap-3 justify-center">
            {action && renderAction(action)}
            {secondaryAction && renderAction(secondaryAction)}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Pre-configured EmptyState for "No Search Results" scenarios
 */
export function EmptySearchResults({
  query,
  onClear,
  className,
}: {
  query: string;
  onClear: () => void;
  className?: string;
}) {
  const { SearchX } = require('lucide-react');

  return (
    <EmptyState
      icon={SearchX}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search terms.`}
      action={{ label: 'Clear Search', onClick: onClear, variant: 'outline' }}
      className={className}
    />
  );
}

/**
 * Pre-configured EmptyState for filtered lists
 */
export function EmptyFilteredResults({
  filterCount,
  onClear,
  className,
}: {
  filterCount: number;
  onClear: () => void;
  className?: string;
}) {
  const { FilterX } = require('lucide-react');

  return (
    <EmptyState
      icon={FilterX}
      title="No matching items"
      description={`You've applied ${filterCount} filter${filterCount !== 1 ? 's' : ''}. Try adjusting your filters to see more results.`}
      action={{ label: 'Clear Filters', onClick: onClear, variant: 'outline' }}
      className={className}
    />
  );
}

export default EmptyState;
