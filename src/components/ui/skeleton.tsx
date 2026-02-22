import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Skeleton loading component with animation
 * 
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-32" />
 * ```
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-primary/10 animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

/**
 * Skeleton card variant for card-like content
 * 
 * @example
 * ```tsx
 * <SkeletonCard />
 * ```
 */
function SkeletonCard() {
  return (
    <div className="p-6 rounded-xl border bg-card space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}

/**
 * Skeleton table variant for table content
 * 
 * @example
 * ```tsx
 * <SkeletonTable />
 * ```
 */
function SkeletonTable() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="p-4 border-b">
        <Skeleton className="h-6 w-48" />
      </div>
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
  )
}

/**
 * Skeleton dashboard variant for dashboard layouts
 * 
 * @example
 * ```tsx
 * <SkeletonDashboard />
 * ```
 */
function SkeletonDashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border bg-card space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Content Cards */}
      <div className="grid gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

/**
 * Skeleton list variant for list content
 * 
 * @example
 * ```tsx
 * <SkeletonList />
 * ```
 */
function SkeletonList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border bg-card flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonDashboard, SkeletonList }
