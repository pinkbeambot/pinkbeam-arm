/**
 * Lazy-loaded Analytics Components
 * 
 * Heavy chart components that should be loaded dynamically
 * to reduce initial bundle size.
 */

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Loading fallback for chart components
function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton className="h-full w-full" />
    </div>
  );
}

// Lazy load PerformanceTab (heavy due to recharts)
export const PerformanceTabLazy = lazy(() => 
  import('@/components/dashboard/agents/PerformanceTab').then(mod => ({ 
    default: mod.PerformanceTab 
  }))
);

// Lazy load AgentAnalytics (heavy due to recharts)
export const AgentAnalyticsLazy = lazy(() => 
  import('@/components/dashboard/performance/AgentAnalytics').then(mod => ({ 
    default: mod.AgentAnalytics 
  }))
);

// Lazy load LiveLineChart
export const LiveLineChartLazy = lazy(() => 
  import('@/components/dashboard/metrics/LiveLineChart').then(mod => ({ 
    default: mod.LiveLineChart 
  }))
);

// Lazy load TaskStageChart
export const TaskStageChartLazy = lazy(() => 
  import('@/components/dashboard/performance/TaskStageChart').then(mod => ({ 
    default: mod.TaskStageChart 
  }))
);

// Wrapper component with suspense
interface LazyChartWrapperProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
}

export function LazyChartWrapper({ children, height = 300, className }: LazyChartWrapperProps) {
  return (
    <Suspense fallback={<ChartSkeleton className={className} style={{ height }} />}>
      {children}
    </Suspense>
  );
}
