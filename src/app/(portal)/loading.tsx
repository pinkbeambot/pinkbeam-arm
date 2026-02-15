import { Skeleton } from '@/components/ui/skeleton';

export default function PortalLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-16 flex-col border-r bg-background p-3 gap-4">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Content area skeleton */}
      <div className="flex-1 p-6">
        {/* Page header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>

        {/* Main content area */}
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}
