'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatNumber } from '@/lib/utils';
import { Kanban, TrendingDown, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { TaskPipelineStage, TaskStatusBreakdown } from '@/types/analytics';

interface TaskPipelineWidgetProps {
  stages?: TaskPipelineStage[];
  statusBreakdown?: TaskStatusBreakdown[];
  summary?: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    inProgressTasks: number;
    avgCompletionTime: number;
    completionRate: number;
  };
  isLoading?: boolean;
  className?: string;
}

export function TaskPipelineWidget({
  stages,
  statusBreakdown,
  summary,
  isLoading,
  className,
}: TaskPipelineWidgetProps) {
  if (isLoading) {
    return <TaskPipelineSkeleton className={className} />;
  }

  const pipelineStages = stages || [];
  const breakdown = statusBreakdown || [];

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Kanban className="h-4 w-4 text-primary" />
              Task Pipeline
            </CardTitle>
            <CardDescription>
              {summary?.totalTasks ?? 0} total tasks
            </CardDescription>
          </div>
          {summary && (
            <div className="text-right">
              <div className="text-2xl font-bold">{summary.completionRate.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">completion rate</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        {/* Funnel Visualization */}
        <div className="space-y-2">
          {pipelineStages.map((stage, index) => (
            <FunnelStage 
              key={stage.name} 
              stage={stage} 
              index={index} 
              total={pipelineStages[0]?.count || 1}
              isLast={index === pipelineStages.length - 1}
            />
          ))}
        </div>

        {/* Status Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status Breakdown
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {breakdown.slice(0, 4).map((status) => (
              <StatusBadge key={status.status} status={status} />
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <SummaryStat 
            icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
            label="Completed"
            value={summary?.completedTasks ?? 0}
          />
          <SummaryStat 
            icon={<AlertCircle className="h-4 w-4 text-red-500" />}
            label="Failed"
            value={summary?.failedTasks ?? 0}
          />
          <SummaryStat 
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            label="Avg Time"
            value={`${(summary?.avgCompletionTime ?? 0).toFixed(0)}m`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelStage({ 
  stage, 
  index, 
  total,
  isLast 
}: { 
  stage: TaskPipelineStage; 
  index: number; 
  total: number;
  isLast: boolean;
}) {
  const widthPercent = total > 0 ? (stage.count / total) * 100 : 0;
  const colors = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
  ];
  const color = colors[index % colors.length];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{stage.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{formatNumber(stage.count)}</span>
          <span className="text-muted-foreground">({stage.percentage.toFixed(0)}%)</span>
        </div>
      </div>
      <div className="relative h-8 w-full overflow-hidden rounded-md bg-muted">
        <div
          className={cn('h-full transition-all duration-500 ease-out', color)}
          style={{ width: `${widthPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center px-3">
          <span className="text-xs font-medium text-white drop-shadow-md">
            {stage.count > 0 && widthPercent > 15 ? stage.name : ''}
          </span>
        </div>
      </div>
      {!isLast && stage.dropOffCount !== undefined && stage.dropOffCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingDown className="h-3 w-3" />
          <span>{stage.dropOffCount} drop-off ({stage.dropOffPercentage?.toFixed(0)}%)</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TaskStatusBreakdown }) {
  const statusColors: Record<string, string> = {
    queued: 'bg-gray-500',
    in_progress: 'bg-blue-500',
    blocked: 'bg-red-500',
    review: 'bg-amber-500',
    completed: 'bg-green-500',
    failed: 'bg-red-600',
    cancelled: 'bg-gray-400',
  };

  return (
    <div className="flex items-center justify-between rounded-md border p-2">
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', statusColors[status.status] || 'bg-gray-500')} />
        <span className="text-xs capitalize">{status.status.replace('_', ' ')}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">{status.count}</div>
        <div className="text-xs text-muted-foreground">{status.percentage.toFixed(0)}%</div>
      </div>
    </div>
  );
}

function SummaryStat({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
}) {
  return (
    <div className="text-center">
      <div className="mb-1 flex justify-center">{icon}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function TaskPipelineSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="mx-auto mb-1 h-4 w-4" />
              <Skeleton className="mx-auto mb-1 h-6 w-8" />
              <Skeleton className="mx-auto h-3 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
