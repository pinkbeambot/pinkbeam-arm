"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// Base Skeleton Building Blocks
// ============================================================================

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}

/**
 * Multi-line text skeleton
 * 
 * @example
 * ```tsx
 * <SkeletonText lines={3} />
 * ```
 */
export function SkeletonText({ lines = 2, className, lastLineWidth = "60%" }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? `w-[${lastLineWidth}]` : "w-full"
          )}
          style={i === lines - 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  );
}

interface SkeletonAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function SkeletonAvatar({ size = "md", className }: SkeletonAvatarProps) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return <Skeleton className={cn("rounded-full", sizes[size], className)} />;
}

// ============================================================================
// Agent Roster Skeletons
// ============================================================================

/**
 * Skeleton for agent card in roster
 */
export function SkeletonAgentCard() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-start gap-4">
        <SkeletonAvatar size="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <SkeletonText lines={2} lastLineWidth="40%" />
      <div className="flex items-center gap-2 pt-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton for agent roster grid
 */
export function SkeletonAgentRoster({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAgentCard key={i} />
      ))}
    </div>
  );
}

// ============================================================================
// Task Pipeline Skeletons
// ============================================================================

/**
 * Skeleton for task card in kanban
 */
export function SkeletonTaskCard() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-5 w-full" />
      <SkeletonText lines={2} lastLineWidth="50%" />
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <SkeletonAvatar size="sm" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

/**
 * Skeleton for kanban column
 */
export function SkeletonKanbanColumn({ taskCount = 3 }: { taskCount?: number }) {
  return (
    <div className="rounded-lg border bg-muted/50 p-4 space-y-3 min-w-[280px]">
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-8 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: taskCount }).map((_, i) => (
          <SkeletonTaskCard key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for full kanban board
 */
export function SkeletonKanbanBoard({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonKanbanColumn key={i} />
      ))}
    </div>
  );
}

// ============================================================================
// Activity Feed Skeletons
// ============================================================================

/**
 * Skeleton for activity item
 */
export function SkeletonActivityItem() {
  return (
    <div className="flex items-start gap-4 p-4">
      <SkeletonAvatar size="md" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <SkeletonText lines={2} lastLineWidth="30%" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton for activity feed
 */
export function SkeletonActivityFeed({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonActivityItem key={i} />
      ))}
    </div>
  );
}

// ============================================================================
// Escalation Inbox Skeletons
// ============================================================================

/**
 * Skeleton for escalation row
 */
export function SkeletonEscalationRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <Skeleton className="h-5 w-5 rounded" />
      <SkeletonAvatar size="sm" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

/**
 * Skeleton for escalation list
 */
export function SkeletonEscalationList({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonEscalationRow key={i} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Stats/Analytics Skeletons
// ============================================================================

/**
 * Skeleton for stat card
 */
export function SkeletonStatCard() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/**
 * Skeleton for stats grid
 */
export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for chart
 */
export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2" style={{ height }}>
        <div className="flex items-end justify-between gap-2 h-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="w-full rounded-t"
              style={{ height: `${Math.random() * 60 + 20}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Chat Skeletons
// ============================================================================

/**
 * Skeleton for chat message
 */
export function SkeletonChatMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("flex gap-4 p-4", isUser && "flex-row-reverse")}>
      <SkeletonAvatar size="md" />
      <div className={cn("space-y-2 max-w-[70%]", isUser && "items-end")}>
        <Skeleton className="h-4 w-32" />
        <div className={cn("rounded-lg p-3 bg-muted", isUser && "bg-primary")}>
          <SkeletonText lines={3} lastLineWidth="40%" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for chat interface
 */
export function SkeletonChat({ messageCount = 4 }: { messageCount?: number }) {
  return (
    <div className="rounded-lg border bg-card flex flex-col h-[500px]">
      <div className="p-4 border-b flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Array.from({ length: messageCount }).map((_, i) => (
          <SkeletonChatMessage key={i} isUser={i % 2 === 1} />
        ))}
      </div>
      <div className="p-4 border-t">
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

// ============================================================================
// Form Skeletons
// ============================================================================

/**
 * Skeleton for form field
 */
export function SkeletonFormField() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

/**
 * Skeleton for form
 */
export function SkeletonForm({ fieldCount = 4 }: { fieldCount?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: fieldCount }).map((_, i) => (
          <SkeletonFormField key={i} />
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// ============================================================================
// Decision Log Skeletons
// ============================================================================

/**
 * Skeleton for decision row
 */
export function SkeletonDecisionRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  );
}

/**
 * Skeleton for decision log
 */
export function SkeletonDecisionLog({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <Skeleton className="h-6 w-48" />
      </div>
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonDecisionRow key={i} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Full Page Skeletons
// ============================================================================

/**
 * Skeleton for full dashboard page
 */
export function SkeletonDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats */}
      <SkeletonStatsGrid count={4} />

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonChart height={300} />
        </div>
        <div>
          <SkeletonActivityFeed count={5} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for settings page
 */
export function SkeletonSettingsPage() {
  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="rounded-lg border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <SkeletonText lines={2} />
          <div className="space-y-4 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonFormField key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
