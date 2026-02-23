import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton as BaseSkeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
  className?: string;
  showAvatar?: boolean;
  showFooter?: boolean;
  lines?: number;
}

/**
 * SkeletonCard - Loading placeholder for card components
 * Used for: Agent cards, Task cards, Decision cards
 * 
 * Matches the layout of actual cards to prevent layout shift
 */
export function SkeletonCard({
  className,
  showAvatar = true,
  showFooter = true,
  lines = 3,
}: SkeletonCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {showAvatar && (
            <BaseSkeleton className="h-12 w-12 rounded-full shrink-0" />
          )}
          <div className="space-y-2 flex-1 min-w-0">
            <BaseSkeleton className="h-4 w-3/4" />
            <BaseSkeleton className="h-3 w-1/2" />
          </div>
        </div>

        {/* Body */}
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <BaseSkeleton
              key={i}
              className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
            />
          ))}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="flex gap-2 pt-2">
            <BaseSkeleton className="h-8 w-20" />
            <BaseSkeleton className="h-8 w-20" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SkeletonListProps {
  className?: string;
  count?: number;
  showAvatar?: boolean;
  showActions?: boolean;
}

/**
 * SkeletonList - Loading placeholder for list components
 * Used for: Agent lists, Task lists, Activity lists
 */
export function SkeletonList({
  className,
  count = 6,
  showAvatar = true,
  showActions = true,
}: SkeletonListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {showAvatar && (
                <BaseSkeleton className="h-12 w-12 rounded-full shrink-0" />
              )}
              <div className="space-y-2 flex-1 min-w-0">
                <BaseSkeleton className="h-4 w-3/4" />
                <BaseSkeleton className="h-3 w-1/2" />
              </div>
              {showActions && (
                <BaseSkeleton className="h-8 w-24 shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface SkeletonDashboardProps {
  className?: string;
  statCount?: number;
  showStats?: boolean;
  showChart?: boolean;
  contentRows?: number;
}

/**
 * SkeletonDashboard - Loading placeholder for dashboard pages
 * Used for: Portal dashboard, Metrics pages, Analytics pages
 * 
 * Creates a skeleton that matches the typical dashboard layout:
 * - Header with title and description
 * - Stats grid
 * - Chart area (optional)
 * - Content cards
 */
export function SkeletonDashboard({
  className,
  statCount = 4,
  showStats = true,
  showChart = false,
  contentRows = 2,
}: SkeletonDashboardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="space-y-2">
        <BaseSkeleton className="h-8 w-64" />
        <BaseSkeleton className="h-4 w-96" />
      </div>

      {/* Stats Grid */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: statCount }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <BaseSkeleton className="h-4 w-20" />
                <BaseSkeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {showChart && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <BaseSkeleton className="h-6 w-32" />
              <BaseSkeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <div className="grid gap-4">
        {Array.from({ length: contentRows }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  className?: string;
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

/**
 * SkeletonTable - Loading placeholder for table components
 */
export function SkeletonTable({
  className,
  rows = 5,
  columns = 4,
  showHeader = true,
}: SkeletonTableProps) {
  return (
    <Card className={className}>
      {showHeader && (
        <div className="p-4 border-b">
          <BaseSkeleton className="h-6 w-48" />
        </div>
      )}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <BaseSkeleton
                key={colIndex}
                className={cn(
                  'h-4',
                  colIndex === 0 ? 'w-10 rounded-full' : 'flex-1'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

interface SkeletonActivityProps {
  className?: string;
  count?: number;
}

/**
 * SkeletonActivity - Loading placeholder for activity feed items
 */
export function SkeletonActivity({
  className,
  count = 5,
}: SkeletonActivityProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4">
          <BaseSkeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <BaseSkeleton className="h-4 w-24" />
              <BaseSkeleton className="h-3 w-16" />
            </div>
            <BaseSkeleton className="h-3 w-full" />
            <BaseSkeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { BaseSkeleton as Skeleton };
