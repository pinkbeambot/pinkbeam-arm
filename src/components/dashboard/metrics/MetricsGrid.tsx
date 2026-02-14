'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  CheckSquare,
  ShieldAlert,
  Brain,
  Minus
} from 'lucide-react';
import type { MetricsGridProps, AggregatedMetrics } from './types';

// ============================================================================
// MetricCard (Internal component)
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red' | 'pink';
  className?: string;
}

function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color,
  className,
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
    pink: 'bg-pink-500/10 text-pink-600',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          {icon}
        </div>
        
        {trend && (
          <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
            <TrendIcon className="w-4 h-4" />
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// MetricsGrid Component
// ============================================================================

export function MetricsGrid({ metrics, className }: MetricsGridProps) {
  const { tasks, agents, decisions, escalations } = metrics;

  // Calculate trends (mock for now - would be compared to previous period)
  const taskTrend: 'up' | 'down' | 'neutral' = tasks.completionRate > 7 ? 'up' : tasks.completionRate < 5 ? 'down' : 'neutral';
  const agentTrend: 'up' | 'down' | 'neutral' = agents.active > agents.total * 0.6 ? 'up' : 'down';
  const escalationTrend: 'up' | 'down' | 'neutral' = escalations.open > 10 ? 'up' : 'down';

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {/* Tasks */}
      <MetricCard
        title="Total Tasks"
        value={tasks.total.toLocaleString()}
        subtitle={`${tasks.inProgress} in progress, ${tasks.queued} queued`}
        trend={taskTrend}
        trendValue={`${tasks.completionRate.toFixed(1)}/min`}
        icon={<CheckSquare className="w-5 h-5" />}
        color="blue"
      />

      {/* Success Rate */}
      <MetricCard
        title="Success Rate"
        value={`${tasks.successRate.toFixed(1)}%`}
        subtitle={`${tasks.completed.toLocaleString()} completed, ${tasks.failed} failed`}
        trend={tasks.successRate > 95 ? 'up' : tasks.successRate > 85 ? 'neutral' : 'down'}
        icon={<CheckCircle2 className="w-5 h-5" />}
        color={tasks.successRate >= 95 ? 'green' : tasks.successRate >= 80 ? 'amber' : 'red'}
      />

      {/* Active Agents */}
      <MetricCard
        title="Active Agents"
        value={agents.active}
        subtitle={`${agents.total} total, ${agents.idle} idle, ${agents.error} error`}
        trend={agentTrend}
        icon={<Users className="w-5 h-5" />}
        color="pink"
      />

      {/* Open Escalations */}
      <MetricCard
        title="Open Escalations"
        value={escalations.open}
        subtitle={`Avg resolution: ${escalations.avgResolutionTime.toFixed(0)}m`}
        trend={escalationTrend}
        icon={<ShieldAlert className="w-5 h-5" />}
        color={escalations.open === 0 ? 'green' : escalations.open < 5 ? 'amber' : 'red'}
      />
    </div>
  );
}

// ============================================================================
// MetricsSummary (Alternative layout with detailed breakdown)
// ============================================================================

interface MetricsSummaryProps {
  metrics: AggregatedMetrics;
  className?: string;
}

export function MetricsSummary({ metrics, className }: MetricsSummaryProps) {
  const { tasks, agents, decisions, escalations } = metrics;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tasks Section */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Tasks</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold">{tasks.total.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{tasks.completed.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{tasks.inProgress}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{tasks.failed}</p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Success Rate:</span>{' '}
            <span className={cn(
              'font-medium',
              tasks.successRate >= 95 ? 'text-green-600' :
              tasks.successRate >= 80 ? 'text-amber-600' : 'text-red-600'
            )}>
              {tasks.successRate.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Completion Rate:</span>{' '}
            <span className="font-medium">{tasks.completionRate.toFixed(1)}/min</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Duration:</span>{' '}
            <span className="font-medium">{tasks.avgDuration.toFixed(0)}s</span>
          </div>
        </div>
      </Card>

      {/* Agents & Decisions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agents */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-pink-500" />
            <h3 className="font-semibold">Agents</h3>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xl font-bold">{agents.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">{agents.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600">{agents.idle}</p>
              <p className="text-xs text-muted-foreground">Idle</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">{agents.error}</p>
              <p className="text-xs text-muted-foreground">Error</p>
            </div>
          </div>

          <div className="mt-3 text-sm">
            <span className="text-muted-foreground">Avg Performance:</span>{' '}
            <span className="font-medium">{agents.avgTasksPerMinute.toFixed(1)} tasks/min</span>
            <span className="mx-2">•</span>
            <span className="font-medium">{agents.avgSuccessRate.toFixed(1)}% success</span>
          </div>
        </Card>

        {/* Decisions */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold">Decisions</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xl font-bold">{decisions.total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">{decisions.approved.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">{decisions.rejected.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>

          <div className="mt-3 text-sm">
            <span className="text-muted-foreground">Avg Confidence:</span>{' '}
            <span className="font-medium">{(decisions.avgConfidence * 100).toFixed(0)}%</span>
          </div>
        </Card>
      </div>

      {/* Escalations */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className={cn(
            'w-5 h-5',
            escalations.open === 0 ? 'text-green-500' :
            escalations.open < 5 ? 'text-amber-500' : 'text-red-500'
          )} />
          <h3 className="font-semibold">Escalations</h3>
          
          {escalations.open > 0 && (
            <span className={cn(
              'ml-auto text-sm px-2 py-0.5 rounded-full',
              escalations.open < 5 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
            )}>
              {escalations.open} open
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xl font-bold">{escalations.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-600">{escalations.resolved}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
          <div>
            <p className="text-xl font-bold">{escalations.avgResolutionTime.toFixed(0)}m</p>
            <p className="text-xs text-muted-foreground">Avg Resolution</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
