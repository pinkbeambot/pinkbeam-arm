/**
 * Optimized Metrics Page
 * 
 * Uses lazy loading for heavy Recharts components.
 */

import dynamic from 'next/dynamic';
import { PageContainer, PageHeader } from '@/components/dashboard/layout';
import { DashboardLayout } from '@/components/dashboard/layout';
import { Suspense } from 'react';

// Lazy load the heavy metrics dashboard
const RealtimeMetricsDashboardLazy = dynamic(
  () => import('@/components/dashboard/metrics/RealtimeMetricsDashboard').then(mod => ({ 
    default: mod.RealtimeMetricsDashboard 
  })),
  {
    ssr: false,
    loading: () => <MetricsLoadingSkeleton />,
  }
);

export const metadata = {
  title: 'Real-time Metrics | Pink Beam ARM',
  description: 'Live agent performance metrics and system health monitoring',
};

function MetricsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 bg-muted animate-pulse rounded-full" />
          <div className="h-9 w-32 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>

      {/* System Health skeleton */}
      <div className="h-32 bg-muted animate-pulse rounded-lg" />

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg md:col-span-2" />
      </div>

      {/* Agent List skeleton */}
      <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
    </div>
  );
}

export default function MetricsPage() {
  return (
    <DashboardLayout>
      <PageContainer>
        <Suspense fallback={<MetricsLoadingSkeleton />}>
          <RealtimeMetricsDashboardLazy 
            defaultTimeRange="live"
            showSystemHealth
            showAgentList
          />
        </Suspense>
      </PageContainer>
    </DashboardLayout>
  );
}
