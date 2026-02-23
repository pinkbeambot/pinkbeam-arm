/**
 * Performance Dashboard Page
 * 
 * Displays Core Web Vitals metrics and performance insights.
 * Only accessible in development or to admin users.
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Clock, 
  Zap, 
  LayoutGrid, 
  MousePointer, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';

// ============================================================================
// Types
// ============================================================================

interface MetricSummary {
  count: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
}

interface VitalsData {
  metrics: Record<string, MetricSummary | null>;
}

// ============================================================================
// Metric Configuration
// ============================================================================

const METRIC_CONFIG = {
  LCP: {
    name: 'Largest Contentful Paint',
    description: 'Time until largest content element is visible',
    unit: 'ms',
    good: 2500,
    poor: 4000,
    icon: LayoutGrid,
  },
  FID: {
    name: 'First Input Delay',
    description: 'Time from first interaction to response',
    unit: 'ms',
    good: 100,
    poor: 300,
    icon: MousePointer,
  },
  CLS: {
    name: 'Cumulative Layout Shift',
    description: 'Visual stability score (lower is better)',
    unit: '',
    good: 0.1,
    poor: 0.25,
    icon: LayoutGrid,
  },
  FCP: {
    name: 'First Contentful Paint',
    description: 'Time until first content is rendered',
    unit: 'ms',
    good: 1800,
    poor: 3000,
    icon: Zap,
  },
  TTFB: {
    name: 'Time to First Byte',
    description: 'Server response time',
    unit: 'ms',
    good: 800,
    poor: 1800,
    icon: Clock,
  },
  INP: {
    name: 'Interaction to Next Paint',
    description: 'Overall interaction responsiveness',
    unit: 'ms',
    good: 200,
    poor: 500,
    icon: Activity,
  },
};

type MetricName = keyof typeof METRIC_CONFIG;

// ============================================================================
// Components
// ============================================================================

function MetricCard({ 
  name, 
  data 
}: { 
  name: MetricName; 
  data: MetricSummary | null;
}) {
  const config = METRIC_CONFIG[name];
  const Icon = config.icon;

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{config.name}</CardTitle>
          </div>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const getRating = (value: number) => {
    if (name === 'CLS') {
      if (value <= config.good) return 'good';
      if (value <= config.poor) return 'needs-improvement';
      return 'poor';
    }
    if (value <= config.good) return 'good';
    if (value <= config.poor) return 'needs-improvement';
    return 'poor';
  };

  const p75Rating = getRating(data.p75);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">{config.name}</CardTitle>
          </div>
          <Badge 
            variant={p75Rating === 'good' ? 'default' : p75Rating === 'needs-improvement' ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {p75Rating === 'good' ? 'Good' : p75Rating === 'needs-improvement' ? 'Needs Improvement' : 'Poor'}
          </Badge>
        </div>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* P75 Value */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">
            {name === 'CLS' ? data.p75.toFixed(3) : Math.round(data.p75)}
          </span>
          <span className="text-sm text-muted-foreground">{config.unit} (p75)</span>
        </div>

        {/* Percentiles */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">p50</p>
            <p className="font-medium">
              {name === 'CLS' ? data.p50.toFixed(3) : Math.round(data.p50)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">p90</p>
            <p className="font-medium">
              {name === 'CLS' ? data.p90.toFixed(3) : Math.round(data.p90)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">p99</p>
            <p className="font-medium">
              {name === 'CLS' ? data.p99.toFixed(3) : Math.round(data.p99)}
            </p>
          </div>
        </div>

        {/* Sample count */}
        <p className="text-xs text-muted-foreground">
          Based on {data.count} measurements
        </p>
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-9 w-24" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function PerformancePage() {
  const [data, setData] = useState<VitalsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analytics/vitals');
      
      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader 
          title="Performance Monitoring" 
          description="Core Web Vitals and application performance metrics"
        >
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </PageHeader>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Summary Cards */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Core Web Vitals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <>
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                </>
              ) : (
                (Object.keys(METRIC_CONFIG) as MetricName[]).map((metricName) => (
                  <MetricCard
                    key={metricName}
                    name={metricName}
                    data={data?.metrics?.[metricName] || null}
                  />
                ))
              )}
            </div>
          </section>

          {/* Performance Guidelines */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Performance Guidelines</h2>
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/20">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Good</p>
                      <p className="text-sm text-muted-foreground">
                        Meets recommended thresholds. Users experience fast, responsive interactions.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/20">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">Needs Improvement</p>
                      <p className="text-sm text-muted-foreground">
                        Moderate performance. Some users may experience delays.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">Poor</p>
                      <p className="text-sm text-muted-foreground">
                        Significant performance issues. User experience is degraded.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Resources */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bundle Analysis</CardTitle>
                  <CardDescription>
                    Run bundle analyzer to check chunk sizes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="bg-muted px-2 py-1 rounded text-sm">
                    npm run analyze
                  </code>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lighthouse Audit</CardTitle>
                  <CardDescription>
                    Run automated performance audits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="bg-muted px-2 py-1 rounded text-sm">
                    npm run lighthouse
                  </code>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
