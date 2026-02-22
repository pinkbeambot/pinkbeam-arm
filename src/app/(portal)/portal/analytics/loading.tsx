import { PageContainer, PageHeader } from '@/components/dashboard/layout';
import { DashboardLayout } from '@/components/dashboard/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

function WidgetSkeleton({ height = '400px' }: { height?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
          <div style={{ height }}>
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsLoading() {
  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader
          title="Analytics"
          description="Comprehensive insights into your AI workforce performance"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-24" />
          </div>
        </PageHeader>

        <div className="space-y-6">
          {/* Overview Skeleton */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">Overview</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          </section>

          {/* Widgets Skeleton */}
          <section>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <WidgetSkeleton height="320px" />
              <WidgetSkeleton height="320px" />
              <WidgetSkeleton height="320px" />
              <WidgetSkeleton height="320px" />
            </div>
          </section>

          {/* Activity Timeline Skeleton */}
          <section>
            <WidgetSkeleton height="200px" />
          </section>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
