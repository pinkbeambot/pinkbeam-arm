/**
 * Metrics Grid Component
 * 
 * Displays aggregated metrics in a grid of cards including:
 * - Task metrics (total, completed, failed, rates)
 * - Agent metrics (total, active, idle, performance)
 * - Decision metrics
 * - Escalation metrics
 */

'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Users,
  Activity,
  Scale,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { MetricsGridProps } from './types';

// ============================================================================
// Metric Card Component
// ============================================================================

interface MetricItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'default' | 'green' | 'red' | 'amber' | 'blue';
  className?: string;
}

function MetricItem({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  trendValue,
  color = 'default',
  className,
}: MetricItemProps) {
  const colorClasses = {
    default: 'text-foreground',
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
  };

  const bgClasses = {
    default: 'bg-slate-100',
    green: 'bg-green-100',
    red: 'bg-red-100',
    amber: 'bg-amber-100',
    blue: 'bg-blue-100',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn('p-3 rounded-lg border bg-card', className)}>
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', bgClasses[color])}>
          <Icon className={cn('w-4 h-4', colorClasses[color])} />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs',
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'
          )}>
            <TrendIcon className="w-3 h-3" />
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Metrics Grid
// ============================================================================

export function MetricsGrid({ metrics, className }: MetricsGridProps) {
  // Format duration for display
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tasks Section */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Tasks
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem
            icon={CheckCircle2}
            label="Completed"
            value={metrics.tasks.completed}
            subValue={`${metrics.tasks.successRate.toFixed(1)}% success rate`}
            color="green"
          />
          <MetricItem
            icon={XCircle}
            label="Failed"
            value={metrics.tasks.failed}
            subValue={`${(100 - metrics.tasks.successRate).toFixed(1)}% failure rate`}
            color="red"
          />
          <MetricItem
            icon={Loader2}
            label="In Progress"
            value={metrics.tasks.inProgress}
            subValue={`${metrics.tasks.queued} queued`}
            color="blue"
          />
          <MetricItem
            icon={Clock}
            label="Avg Duration"
            value={formatDuration(metrics.tasks.avgDuration)}
            subValue={`${metrics.tasks.completionRate.toFixed(1)}/min rate`}
            color="amber"
          />
        </div>
      </div>

      {/* Agents Section */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Agents
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem
            icon={Users}
            label="Total"
            value={metrics.agents.total}
            subValue={`${metrics.agents.active} active`}
            color="default"
          />
          <MetricItem
            icon={Activity}
            label="Active"
            value={metrics.agents.active}
            subValue={`${((metrics.agents.active / metrics.agents.total) * 100).toFixed(0)}% of total`}
            color="green"
          />
          <MetricItem
            icon={Clock}
            label="Idle"
            value={metrics.agents.idle}
            subValue={`${((metrics.agents.idle / metrics.agents.total) * 100).toFixed(0)}% of total`}
            color="amber"
          />
          <MetricItem
            icon={TrendingUp}
            label="Avg Success"
            value={`${metrics.agents.avgSuccessRate.toFixed(1)}%`}
            subValue={`${metrics.agents.avgTasksPerMinute.toFixed(1)} tasks/min`}
            color="blue"
          />
        </div>
      </div>

      {/* Decisions & Escalations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Decisions */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Decisions
          </h3>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{metrics.decisions.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{metrics.decisions.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{metrics.decisions.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Confidence</span>
                  <span className="font-semibold">{metrics.decisions.avgConfidence.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Escalations */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Escalations
          </h3>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{metrics.escalations.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{metrics.escalations.open}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{metrics.escalations.resolved}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Resolution Time</span>
                  <span className="font-semibold">{Math.round(metrics.escalations.avgResolutionTime)}m</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Metrics Summary (for header/status bar)
// ============================================================================

export function MetricsSummary({
  metrics,
  className,
}: {
  metrics: MetricsGridProps['metrics'];
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-6', className)}>
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span className="text-sm">
          <span className="font-semibold">{metrics.tasks.completed}</span>
          <span className="text-muted-foreground ml-1">completed</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-500" />
        <span className="text-sm">
          <span className="font-semibold">{metrics.agents.active}</span>
          <span className="text-muted-foreground ml-1">active agents</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-pink-500" />
        <span className="text-sm">
          <span className="font-semibold">{metrics.tasks.completionRate.toFixed(1)}</span>
          <span className="text-muted-foreground ml-1">tasks/min</span>
        </span>
      </div>
    </div>
  );
}
