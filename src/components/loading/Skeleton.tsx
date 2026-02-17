import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Base Skeleton Component
 * 
 * A loading placeholder with pulse animation.
 * Respects reduced motion preferences.
 * 
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-32" />
 * ```
 */
export function Skeleton({ className, children }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Agent Card Skeleton
 * 
 * Loading state for agent cards in grid/list views.
 * 
 * Structure:
 * - Avatar (48px circle)
 * - Name line
 * - Role line  
 * - Status badge
 * - Stats row (3 items)
 */
export function AgentCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-4', className)}>
      {/* Header: Avatar + Info + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Stats row */}
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Task Card Skeleton
 * 
 * Loading state for task cards in pipeline columns.
 * 
 * Structure:
 * - Checkbox + Title + Priority badge
 * - Description line
 * - Assignee avatar + name
 * - Due date
 */
export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-3 space-y-3', className)}>
      {/* Header: Checkbox + Title + Priority */}
      <div className="flex items-start gap-2">
        <Skeleton className="h-4 w-4 rounded-sm mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-12 rounded-full flex-shrink-0" />
          </div>
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      {/* Footer: Assignee + Due Date */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * Activity Item Skeleton
 * 
 * Loading state for activity feed items.
 * 
 * Structure:
 * - Avatar (36px circle)
 * - Type badge + timestamp
 * - Description lines
 */
export function ActivityItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3 p-3 rounded-lg', className)}>
      {/* Avatar */}
      <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 space-y-2 min-w-0">
        {/* Header: Badge + Timestamp */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Description lines */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/**
 * Activity Feed Skeleton
 * 
 * List wrapper with multiple activity item skeletons.
 * Includes staggered animation delay.
 */
export function ActivityFeedSkeleton({ 
  count = 5,
  className 
}: { 
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton
          key={i}
          style={{
            animationDelay: i < 4 ? `${i * 150}ms` : '600ms',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Stat Card Skeleton
 * 
 * Individual stat card skeleton for dashboards.
 * 
 * Structure:
 * - Label line
 * - Value line
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-2', className)}>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-24" />
    </div>
  );
}

/**
 * Dashboard Stats Skeleton
 * 
 * Loading state for dashboard statistics overview.
 * 
 * Structure:
 * - 4 stat cards (grid)
 * - Chart placeholder with bars
 */
export function DashboardStatsSkeleton({ className }: { className?: string }) {
  // Generate consistent random heights for chart bars
  const barHeights = [35, 55, 40, 70, 45, 60, 50, 80, 65, 45, 55, 40];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Chart Placeholder */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-5 w-32 mb-6" />
        <div className="h-48 flex items-end justify-between gap-2">
          {barHeights.map((height, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Table
 * 
 * Loading state for data tables.
 * 
 * Structure:
 * - Header row
 * - 5 data rows
 */
export function SkeletonTable({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <Skeleton className="h-6 w-48" />
      </div>
      
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton List
 * 
 * Generic list loading state.
 * 
 * Structure:
 * - 6 list items with avatar + text
 */
export function SkeletonList({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-lg border bg-card flex items-center gap-4"
        >
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}
