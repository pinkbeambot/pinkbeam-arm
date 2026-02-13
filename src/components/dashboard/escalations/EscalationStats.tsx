'use client';

import { 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface EscalationStats {
  totalOpen: number;
  critical: number;
  high: number;
  normal: number;
  low: number;
  avgResolutionTime: number;
}

interface EscalationStatsProps {
  stats: EscalationStats;
  loading: boolean;
}

export function EscalationStatsView({ stats, loading }: EscalationStatsProps) {
  if (loading) {
    return <EscalationStatsSkeleton />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        label="Open"
        value={stats.totalOpen}
        icon={AlertCircle}
        color="blue"
        trend={stats.totalOpen > 5 ? 'up' : 'down'}
        trendLabel={stats.totalOpen > 5 ? 'High volume' : 'Normal'}
      />
      <StatCard
        label="Critical"
        value={stats.critical}
        icon={AlertTriangle}
        color="red"
        highlight={stats.critical > 0}
      />
      <StatCard
        label="High"
        value={stats.high}
        icon={AlertCircle}
        color="orange"
      />
      <StatCard
        label="Normal"
        value={stats.normal}
        icon={Clock}
        color="amber"
      />
      <StatCard
        label="Low"
        value={stats.low}
        icon={CheckCircle2}
        color="slate"
      />
      <StatCard
        label="Avg Resolution"
        value={formatDuration(stats.avgResolutionTime)}
        icon={Clock}
        color="green"
        isTime
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: 'blue' | 'red' | 'orange' | 'amber' | 'slate' | 'green';
  highlight?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  isTime?: boolean;
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  highlight,
  trend,
  trendLabel,
  isTime 
}: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-600 dark:text-blue-400',
      icon: 'text-blue-500',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-600 dark:text-red-400',
      icon: 'text-red-500',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-600 dark:text-orange-400',
      icon: 'text-orange-500',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-600 dark:text-amber-400',
      icon: 'text-amber-500',
    },
    slate: {
      bg: 'bg-slate-50 dark:bg-slate-950/30',
      border: 'border-slate-200 dark:border-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      icon: 'text-slate-500',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-600 dark:text-green-400',
      icon: 'text-green-500',
    },
  };

  const colors = colorClasses[color];

  return (
    <Card className={cn(
      'border transition-all',
      colors.bg,
      colors.border,
      highlight && 'ring-2 ring-red-500 animate-pulse-subtle'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className={cn('text-2xl font-bold mt-1', colors.text)}>
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-red-500" />
                ) : trend === 'down' ? (
                  <TrendingDown className="h-3 w-3 text-green-500" />
                ) : (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={cn(
                  'text-xs',
                  trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-muted-foreground'
                )}>
                  {trendLabel}
                </span>
              </div>
            )}
          </div>
          <div className={cn('p-2 rounded-lg bg-background/50', colors.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EscalationStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-12" />
              </div>
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  return `${Math.round(hours / 24)}d`;
}
