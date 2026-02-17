'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Wallet } from 'lucide-react';
import type { CostTrend, CostBreakdown, AgentCostMetrics } from '@/types/analytics';

interface CostAnalyticsWidgetProps {
  trends?: CostTrend[];
  breakdown?: CostBreakdown[];
  byAgent?: AgentCostMetrics[];
  summary?: {
    totalCost: number;
    totalTasks: number;
    avgCostPerTask: number;
    totalTokens: number;
    projectedMonthlyCost: number;
  };
  isLoading?: boolean;
  className?: string;
}

export function CostAnalyticsWidget({
  trends,
  breakdown,
  byAgent,
  summary,
  isLoading,
  className,
}: CostAnalyticsWidgetProps) {
  if (isLoading) {
    return <CostAnalyticsSkeleton className={className} />;
  }

  const recentTrends = trends?.slice(-14) || [];
  const costBreakdown = breakdown || [];
  const topAgents = (byAgent || []).slice(0, 3);

  const trendValue = recentTrends.length >= 2
    ? (recentTrends[recentTrends.length - 1]?.cost || 0) - (recentTrends[recentTrends.length - 2]?.cost || 0)
    : 0;
  const isTrendingUp = trendValue > 0;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <DollarSign className="h-4 w-4 text-primary" />
              LLM Costs
            </CardTitle>
            <CardDescription>
              {summary?.totalTasks ?? 0} tasks processed
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalCost ?? 0)}</div>
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              {isTrendingUp ? (
                <>
                  <TrendingUp className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">+{formatCurrency(Math.abs(trendValue))}</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">-{formatCurrency(Math.abs(trendValue))}</span>
                </>
              )}
              <span>from yesterday</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        {/* Cost Trend Chart */}
        {recentTrends.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              14-Day Trend
            </h4>
            <CostTrendChart trends={recentTrends} />
          </div>
        )}

        {/* Top Agents by Cost */}
        {topAgents.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Top Agents by Cost
            </h4>
            <div className="space-y-2">
              {topAgents.map((agent) => (
                <AgentCostRow key={agent.agentId} agent={agent} totalCost={summary?.totalCost || 1} />
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <CostStat 
            icon={<Wallet className="h-4 w-4 text-blue-500" />}
            label="Avg per Task"
            value={formatCurrency(summary?.avgCostPerTask ?? 0)}
          />
          <CostStat 
            icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
            label="Projected/Month"
            value={formatCurrency(summary?.projectedMonthlyCost ?? 0)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CostTrendChart({ trends }: { trends: CostTrend[] }) {
  if (trends.length === 0) return null;

  const maxCost = Math.max(...trends.map(t => t.cost), 0.01);
  const minCost = Math.min(...trends.map(t => t.cost), 0);
  const range = maxCost - minCost || 1;
  const height = 80;
  const width = trends.length - 1;
  
  const points = trends.map((t, i) => {
    const x = i;
    const y = height - ((t.cost - minCost) / range) * height * 0.8 - height * 0.1;
    return `${x},${y}`;
  });

  const areaPath = `M0,${height} L${points.join(' L')} L${width},${height} Z`;
  const linePath = `M${points.join(' L')}`;

  return (
    <div className="relative h-[80px] w-full">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="h-full w-full" 
        preserveAspectRatio="none"
      >
        <path d={areaPath} fill="rgba(99, 102, 241, 0.2)" />
        <path d={linePath} fill="none" stroke="rgb(99, 102, 241)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
        {trends.map((t, i) => {
          const x = i;
          const y = height - ((t.cost - minCost) / range) * height * 0.8 - height * 0.1;
          return (
            <circle key={t.date} cx={x} cy={y} r={0.3} fill="rgb(99, 102, 241)" />
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

function AgentCostRow({ agent, totalCost }: { agent: AgentCostMetrics; totalCost: number }) {
  const percentage = totalCost > 0 ? (agent.totalCost / totalCost) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="truncate font-medium">{agent.agentName}</span>
          <span className="text-muted-foreground">{formatCurrency(agent.totalCost)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div 
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-10 text-right">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function CostStat({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function CostAnalyticsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
