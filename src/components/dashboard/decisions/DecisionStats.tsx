'use client';

import { useMemo } from 'react';
import { 
  Brain, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Activity
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import type { Decision } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DecisionStatsProps {
  decisions: Decision[];
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'default' | 'green' | 'amber' | 'red' | 'blue';
}

function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'bg-card',
    green: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
    amber: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
    red: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
    blue: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  };

  const iconColors = {
    default: 'text-muted-foreground',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <Card className={cn(colorClasses[color])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn('h-4 w-4', iconColors[color])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
            {trend === 'neutral' && <Activity className="h-3 w-3 text-gray-500" />}
            <span className={cn(
              'text-xs',
              trend === 'up' && 'text-green-600',
              trend === 'down' && 'text-red-600',
              trend === 'neutral' && 'text-gray-600'
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DecisionStats({ decisions, className }: DecisionStatsProps) {
  const stats = useMemo(() => {
    const total = decisions.length;
    
    // Average confidence
    const avgConfidence = total > 0
      ? Math.round(decisions.reduce((sum, d) => sum + d.confidence, 0) / total)
      : 0;

    // High confidence decisions (>80%)
    const highConfidenceCount = decisions.filter(d => d.confidence >= 80).length;
    const highConfidencePercent = total > 0
      ? Math.round((highConfidenceCount / total) * 100)
      : 0;

    // Overridden decisions
    const overriddenCount = decisions.filter(d => d.status === 'overridden').length;
    const overrideRate = total > 0
      ? Math.round((overriddenCount / total) * 100)
      : 0;

    // Decisions today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = decisions.filter(d => new Date(d.created_at) >= today).length;

    // Status breakdown
    const statusCounts = {
      proposed: decisions.filter(d => d.status === 'proposed').length,
      approved: decisions.filter(d => d.status === 'approved').length,
      rejected: decisions.filter(d => d.status === 'rejected').length,
      overridden: overriddenCount,
      executed: decisions.filter(d => d.status === 'executed').length,
    };

    // Weekly trend (compare last 7 days to previous 7 days)
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const lastWeekCount = decisions.filter(d => {
      const date = new Date(d.created_at);
      return date >= last7Days && date < now;
    }).length;
    
    const previousWeekCount = decisions.filter(d => {
      const date = new Date(d.created_at);
      return date >= previous7Days && date < last7Days;
    }).length;

    const weekTrend = previousWeekCount === 0
      ? lastWeekCount > 0 ? 'up' : 'neutral'
      : lastWeekCount > previousWeekCount
        ? 'up'
        : lastWeekCount < previousWeekCount
          ? 'down'
          : 'neutral';
    
    const weekTrendValue = previousWeekCount === 0
      ? lastWeekCount > 0 ? '+100%' : '0%'
      : `${Math.round(((lastWeekCount - previousWeekCount) / previousWeekCount) * 100)}%`;

    return {
      total,
      avgConfidence,
      highConfidencePercent,
      overrideRate,
      todayCount,
      statusCounts,
      weekTrend,
      weekTrendValue,
      lastWeekCount,
    };
  }, [decisions]);

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      <StatCard
        title="Total Decisions"
        value={formatNumber(stats.total)}
        subtitle={`${stats.todayCount} today`}
        icon={Brain}
        trend={stats.weekTrend as 'up' | 'down' | 'neutral'}
        trendValue={`${stats.weekTrendValue} vs last week`}
        color="blue"
      />
      
      <StatCard
        title="Average Confidence"
        value={`${stats.avgConfidence}%`}
        subtitle={`${stats.highConfidencePercent}% high confidence (>80%)`}
        icon={Gauge}
        color={stats.avgConfidence >= 80 ? 'green' : stats.avgConfidence >= 50 ? 'amber' : 'red'}
      />
      
      <StatCard
        title="Override Rate"
        value={`${stats.overrideRate}%`}
        subtitle={`${stats.statusCounts.overridden} overridden decisions`}
        icon={AlertTriangle}
        color={stats.overrideRate < 5 ? 'green' : stats.overrideRate < 15 ? 'amber' : 'red'}
      />
      
      <StatCard
        title="Executed Decisions"
        value={formatNumber(stats.statusCounts.executed)}
        subtitle={`${stats.statusCounts.approved} approved, ${stats.statusCounts.rejected} rejected`}
        icon={CheckCircle2}
        color="green"
      />
    </div>
  );
}

// Mini stats for dashboard widgets
export function DecisionStatsMini({ decisions }: { decisions: Decision[] }) {
  const recentDecisions = useMemo(() => {
    return decisions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [decisions]);

  const avgConfidence = useMemo(() => {
    return decisions.length > 0
      ? Math.round(decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length)
      : 0;
  }, [decisions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{decisions.length} total decisions</span>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{avgConfidence}% avg confidence</span>
        </div>
      </div>
      
      {recentDecisions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Recent decisions:</p>
          {recentDecisions.map((decision) => (
            <div 
              key={decision.id}
              className="flex items-center justify-between text-sm py-1 border-b last:border-0"
            >
              <span className="truncate flex-1 mr-2">{decision.title}</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                decision.confidence >= 80 ? 'bg-green-100 text-green-800' :
                decision.confidence >= 50 ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800'
              )}>
                {decision.confidence}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
