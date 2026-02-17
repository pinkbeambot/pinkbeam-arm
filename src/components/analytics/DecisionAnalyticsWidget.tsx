'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatNumber } from '@/lib/utils';
import { Brain, CheckCircle2, XCircle, AlertTriangle, Circle, TrendingUp } from 'lucide-react';
import type { DecisionCategoryMetrics, DecisionTrend } from '@/types/analytics';

interface DecisionAnalyticsWidgetProps {
  categories?: DecisionCategoryMetrics[];
  trends?: DecisionTrend[];
  summary?: {
    totalDecisions: number;
    approvedCount: number;
    rejectedCount: number;
    overriddenCount: number;
    pendingCount: number;
    overallApprovalRate: number;
    avgConfidence: number;
  };
  isLoading?: boolean;
  className?: string;
}

export function DecisionAnalyticsWidget({
  categories,
  trends,
  summary,
  isLoading,
  className,
}: DecisionAnalyticsWidgetProps) {
  if (isLoading) {
    return <DecisionAnalyticsSkeleton className={className} />;
  }

  const categoryMetrics = categories || [];
  const recentTrends = trends?.slice(-7) || [];
  const trendDirection = summary?.overallApprovalRate ?? 0 >= 70 ? 'positive' : 'negative';

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Brain className="h-4 w-4 text-primary" />
              Decisions
            </CardTitle>
            <CardDescription>
              {summary?.totalDecisions ?? 0} total decisions
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold">{(summary?.overallApprovalRate ?? 0).toFixed(0)}%</span>
              {trendDirection === 'positive' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingUp className="h-4 w-4 rotate-180 text-red-500" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">approval rate</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            By Category
          </h4>
          <div className="space-y-2">
            {categoryMetrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No decision data available</p>
            ) : (
              categoryMetrics.map((category) => (
                <CategoryRow key={category.category} category={category} />
              ))
            )}
          </div>
        </div>

        {recentTrends.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              7-Day Trend
            </h4>
            <TrendSparkline trends={recentTrends} />
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 pt-4 border-t">
          <DecisionStat 
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
            label="Approved"
            value={summary?.approvedCount ?? 0}
            color="text-green-600"
          />
          <DecisionStat 
            icon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
            label="Rejected"
            value={summary?.rejectedCount ?? 0}
            color="text-red-600"
          />
          <DecisionStat 
            icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
            label="Overridden"
            value={summary?.overriddenCount ?? 0}
            color="text-amber-600"
          />
          <DecisionStat 
            icon={<Circle className="h-3.5 w-3.5 text-gray-400" />}
            label="Pending"
            value={summary?.pendingCount ?? 0}
            color="text-gray-600"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryRow({ category }: { category: DecisionCategoryMetrics }) {
  const decidedCount = category.approved + category.rejected + category.overridden;
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium capitalize">{category.category}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{category.total} total</span>
          <Badge variant={category.approvalRate >= 70 ? 'default' : 'secondary'} className="text-xs">
            {category.approvalRate.toFixed(0)}%
          </Badge>
        </div>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {decidedCount > 0 && (
          <>
            <div className="bg-green-500 transition-all" style={{ width: `${(category.approved / decidedCount) * 100}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${(category.rejected / decidedCount) * 100}%` }} />
            <div className="bg-amber-500 transition-all" style={{ width: `${(category.overridden / decidedCount) * 100}%` }} />
          </>
        )}
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {category.approved}
        </span>
        <span className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
          {category.rejected}
        </span>
        <span className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {category.overridden}
        </span>
      </div>
    </div>
  );
}

function TrendSparkline({ trends }: { trends: DecisionTrend[] }) {
  if (trends.length === 0) return null;

  const maxValue = Math.max(...trends.flatMap(t => [t.approved, t.rejected, t.overridden]));
  const height = 60;
  const width = 100;
  const barWidth = width / trends.length;

  return (
    <div className="relative h-[60px] w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
        {trends.map((trend, i) => {
          const x = i * barWidth;
          const approvedHeight = maxValue > 0 ? (trend.approved / maxValue) * height * 0.8 : 0;
          const rejectedHeight = maxValue > 0 ? (trend.rejected / maxValue) * height * 0.8 : 0;
          
          return (
            <g key={trend.date}>
              <rect x={x + 2} y={height - approvedHeight} width={barWidth - 4} height={approvedHeight} fill="rgb(34, 197, 94)" rx={1} />
              <rect x={x + 2} y={height - approvedHeight - rejectedHeight} width={barWidth - 4} height={rejectedHeight} fill="rgb(239, 68, 68)" rx={1} />
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
        <span>{trends[0]?.date.slice(5)}</span>
        <span>{trends[trends.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function DecisionStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="mb-1 flex justify-center">{icon}</div>
      <div className={cn("text-base font-semibold", color)}>{formatNumber(value)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function DecisionAnalyticsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="mx-auto mb-1 h-4 w-4" />
              <Skeleton className="mx-auto mb-1 h-5 w-6" />
              <Skeleton className="mx-auto h-3 w-14" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
