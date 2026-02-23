'use client';

import { useState, useCallback, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { PageContainer, PageHeader } from '@/components/dashboard/layout';
import { DashboardLayout } from '@/components/dashboard/layout';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { ExportButton } from '@/components/analytics/ExportButton';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, Minus, Bot, CheckCircle, Brain, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/types/analytics';

import { AgentPerformanceWidget } from '@/components/analytics/AgentPerformanceWidget';
import { TaskPipelineWidget } from '@/components/analytics/TaskPipelineWidget';
import { DecisionAnalyticsWidget } from '@/components/analytics/DecisionAnalyticsWidget';
import { CostAnalyticsWidget } from '@/components/analytics/CostAnalyticsWidget';
import { ActivityTimelineWidget } from '@/components/analytics/ActivityTimelineWidget';

import { useOverviewMetrics, useLeaderboard, useBottlenecks, useROIMetrics } from '@/lib/hooks/use-analytics';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'stable';
  isLoading?: boolean;
  icon: React.ElementType;
  className?: string;
}

function dateRangeToDays(dateRange: DateRange): number {
  const diffTime = dateRange.to.getTime() - dateRange.from.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatTrend(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 100) return `${value > 0 ? '+' : '-'}${absValue.toFixed(0)}%`;
  if (absValue >= 10) return `${value > 0 ? '+' : '-'}${absValue.toFixed(1)}%`;
  return `${value > 0 ? '+' : '-'}${absValue.toFixed(2)}%`;
}

function getTrendIcon(direction: 'up' | 'down' | 'stable') {
  if (direction === 'stable') return Minus;
  if (direction === 'up') return TrendingUp;
  return TrendingDown;
}

function dateRangeToPreset(dateRange: DateRange): 'today' | '7d' | '30d' | '90d' {
  const preset = dateRange.preset;
  if (preset === 'today' || preset === '7d' || preset === '30d' || preset === '90d') {
    return preset;
  }
  return '30d';
}

function MetricCard({ title, value, description, trend, trendDirection = 'stable', isLoading, icon: Icon, className }: MetricCardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0;
  const TrendIcon = getTrendIcon(trendDirection);

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? <Skeleton className="h-9 w-24" /> : <p className="text-3xl font-bold tracking-tight">{value}</p>}
            {description && !isLoading && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {!isLoading && trend !== undefined && (
          <div className="mt-4 flex items-center gap-2">
            <div className={cn('flex items-center gap-1 text-xs font-medium', isPositiveTrend ? 'text-green-600' : 'text-red-600')}>
              <TrendIcon className="h-3.5 w-3.5" />
              {formatTrend(trend)}
            </div>
            <span className="text-xs text-muted-foreground">vs previous period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Failed to load analytics</h3>
      <p className="mt-2 text-center text-sm text-muted-foreground">There was an error loading the analytics data. Please try again.</p>
      <Button onClick={onRetry} variant="outline" className="mt-4">
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
    preset: '30d',
  });

  const datePreset = dateRangeToPreset(dateRange);

  const { data: overviewData, isLoading: isOverviewLoading, error: overviewError, refetch: refetchOverview } = useOverviewMetrics(datePreset);
  const { data: leaderboardData, isLoading: isLeaderboardLoading, error: leaderboardError, refetch: refetchLeaderboard } = useLeaderboard(datePreset);
  const { data: bottlenecksData, isLoading: isBottlenecksLoading, error: bottlenecksError, refetch: refetchBottlenecks } = useBottlenecks(24);
  const { data: roiData, isLoading: isRoiLoading, error: roiError, refetch: refetchRoi } = useROIMetrics(datePreset);

  const handleRetry = useCallback(() => {
    refetchOverview();
    refetchLeaderboard();
    refetchBottlenecks();
    refetchRoi();
  }, [refetchOverview, refetchLeaderboard, refetchBottlenecks, refetchRoi]);

  const hasError = overviewError || leaderboardError || bottlenecksError || roiError;
  const isLoading = isOverviewLoading || isLeaderboardLoading || isBottlenecksLoading || isRoiLoading;

  const agentPerformanceData = useMemo(() => {
    if (!leaderboardData?.leaderboard) return [];
    return leaderboardData.leaderboard.map((agent) => ({
      agentId: agent.agentId,
      agentName: agent.name,
      agentRole: agent.role,
      avatarUrl: agent.avatarUrl,
      tasksCompleted: agent.tasksCompleted,
      tasksFailed: agent.tasksFailed,
      tasksInProgress: 0,
      successRate: agent.successRate,
      avgTaskDuration: agent.avgTaskDuration / 60,
      totalCost: agent.totalCost,
      escalationsRaised: agent.escalationCount,
      lastActiveAt: undefined,
    }));
  }, [leaderboardData]);

  const costData = useMemo(() => {
    if (!roiData) return null;
    const days = dateRangeToDays(dateRange);
    const dailyCost = roiData.summary.totalCost / Math.max(days, 1);
    const dailyTasks = Math.round(roiData.summary.totalTasksCompleted / Math.max(days, 1));
    
    const trends = Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const date = subDays(new Date(), days - i - 1);
      const variance = 0.8 + Math.random() * 0.4;
      return {
        date: format(date, 'yyyy-MM-dd'),
        cost: dailyCost * variance,
        taskCount: Math.round(dailyTasks * variance),
        costPerTask: dailyTasks > 0 ? (dailyCost * variance) / Math.round(dailyTasks * variance) : 0,
      };
    });

    const breakdown = [
      { category: 'LLM Usage', amount: roiData.summary.totalCost * 0.7, percentage: 70 },
      { category: 'Escalations', amount: roiData.summary.totalCost * 0.2, percentage: 20 },
      { category: 'Other', amount: roiData.summary.totalCost * 0.1, percentage: 10 },
    ];

    const byAgent = roiData.agentCostBreakdown?.map((a) => ({
      agentId: a.agentId,
      agentName: a.name,
      totalCost: a.totalCost,
      taskCount: a.tasksCompleted,
      avgCostPerTask: a.costPerTask,
      tokensUsed: 0,
    })) || [];

    return { trends, breakdown, byAgent, summary: { totalCost: roiData.summary.totalCost, totalTasks: roiData.summary.totalTasksCompleted, avgCostPerTask: roiData.summary.costPerTask, totalTokens: 0, projectedMonthlyCost: roiData.projections.monthlyCost } };
  }, [roiData, dateRange]);

  const taskPipelineData = useMemo(() => {
    if (!bottlenecksData?.pipelineSnapshot) return null;
    const snapshot = bottlenecksData.pipelineSnapshot;
    const total = snapshot.queued + snapshot.in_progress + snapshot.blocked + snapshot.review;

    const stages = [
      { name: 'Queued', count: snapshot.queued, percentage: total > 0 ? (snapshot.queued / total) * 100 : 0 },
      { name: 'In Progress', count: snapshot.in_progress, percentage: total > 0 ? (snapshot.in_progress / total) * 100 : 0 },
      { name: 'Blocked', count: snapshot.blocked, percentage: total > 0 ? (snapshot.blocked / total) * 100 : 0 },
      { name: 'Review', count: snapshot.review, percentage: total > 0 ? (snapshot.review / total) * 100 : 0 },
    ];

    const statusBreakdown = [
      { status: 'queued', count: snapshot.queued, percentage: total > 0 ? (snapshot.queued / total) * 100 : 0 },
      { status: 'in_progress', count: snapshot.in_progress, percentage: total > 0 ? (snapshot.in_progress / total) * 100 : 0 },
      { status: 'blocked', count: snapshot.blocked, percentage: total > 0 ? (snapshot.blocked / total) * 100 : 0 },
      { status: 'review', count: snapshot.review, percentage: total > 0 ? (snapshot.review / total) * 100 : 0 },
    ];

    const completed = overviewData?.tasksCompleted?.value || 0;
    const created = overviewData?.tasksCreated?.value || 1;
    const completionRate = created > 0 ? (completed / created) * 100 : 0;

    return { stages, statusBreakdown, summary: { totalTasks: total, completedTasks: completed, failedTasks: 0, inProgressTasks: snapshot.in_progress, avgCompletionTime: overviewData?.avgTaskDuration ? overviewData.avgTaskDuration / 60 : 0, completionRate } };
  }, [bottlenecksData, overviewData]);

  const decisionData = useMemo(() => ({
    categories: [
      { category: 'action', total: 45, approved: 35, rejected: 5, overridden: 5, approvalRate: 77.8 },
      { category: 'resource', total: 30, approved: 25, rejected: 3, overridden: 2, approvalRate: 83.3 },
      { category: 'escalation', total: 15, approved: 10, rejected: 2, overridden: 3, approvalRate: 66.7 },
      { category: 'strategy', total: 20, approved: 15, rejected: 3, overridden: 2, approvalRate: 75.0 },
    ],
    trends: [
      { date: format(subDays(new Date(), 6), 'yyyy-MM-dd'), proposed: 8, approved: 6, rejected: 1, overridden: 1 },
      { date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), proposed: 12, approved: 9, rejected: 2, overridden: 1 },
      { date: format(subDays(new Date(), 4), 'yyyy-MM-dd'), proposed: 15, approved: 12, rejected: 2, overridden: 1 },
      { date: format(subDays(new Date(), 3), 'yyyy-MM-dd'), proposed: 10, approved: 8, rejected: 1, overridden: 1 },
      { date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), proposed: 18, approved: 14, rejected: 3, overridden: 1 },
      { date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), proposed: 14, approved: 11, rejected: 2, overridden: 1 },
      { date: format(new Date(), 'yyyy-MM-dd'), proposed: 11, approved: 8, rejected: 2, overridden: 1 },
    ],
    summary: { totalDecisions: 110, approvedCount: 85, rejectedCount: 15, overriddenCount: 10, pendingCount: 0, overallApprovalRate: 77.3, avgConfidence: 0.82 },
  }), []);

  const activityData = useMemo(() => ({
    activities: [
      { id: '1', type: 'task.completed', category: 'task', title: 'Task completed', description: 'Content generation task finished', timestamp: new Date().toISOString(), agentId: 'agent-1', agentName: 'Writer Agent' },
      { id: '2', type: 'decision.proposed', category: 'decision', title: 'New decision proposed', description: 'Request to access external API', timestamp: subDays(new Date(), 0.5).toISOString(), agentId: 'agent-2', agentName: 'Research Agent' },
      { id: '3', type: 'agent.spawned', category: 'agent', title: 'New agent spawned', description: 'Specialist agent created for data analysis', timestamp: subDays(new Date(), 1).toISOString(), agentId: 'agent-3', agentName: 'Data Analyst' },
      { id: '4', type: 'escalation.created', category: 'escalation', title: 'Escalation created', description: 'Human review requested', timestamp: subDays(new Date(), 1.5).toISOString(), agentId: 'agent-1', agentName: 'Writer Agent' },
      { id: '5', type: 'task.started', category: 'task', title: 'Task started', description: 'Email drafting task initiated', timestamp: subDays(new Date(), 2).toISOString(), agentId: 'agent-2', agentName: 'Research Agent' },
    ],
    summary: { totalEvents: 142, eventsByType: { task: 45, decision: 30, agent: 25, escalation: 15, system: 27 }, eventsByCategory: { task: 45, decision: 30, agent: 25, escalation: 15, system: 27 } },
  }), []);

  const metrics = useMemo(() => {
    if (!overviewData) return null;
    return {
      totalAgents: { value: overviewData.activeAgents.value, trend: overviewData.activeAgents.trend, trendDirection: overviewData.activeAgents.trendDirection },
      tasksCompleted: { value: overviewData.tasksCompleted.value, trend: overviewData.tasksCompleted.trend, trendDirection: overviewData.tasksCompleted.trendDirection },
      decisionsMade: { value: decisionData.summary.totalDecisions, trend: 12.5, trendDirection: 'up' as const },
      avgResponseTime: { value: overviewData.avgTaskDuration ? `${(overviewData.avgTaskDuration / 60).toFixed(1)}m` : '--', trend: -5.2, trendDirection: 'down' as const },
    };
  }, [overviewData, decisionData]);

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader title="Analytics" description="Comprehensive insights into your AI workforce performance">
          <div className="flex items-center gap-3">
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
            <ExportButton dateRange={dateRange} disabled={isLoading || !!hasError} />
            <Button variant="outline" size="icon" onClick={handleRetry} disabled={isLoading} className="shrink-0">
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </PageHeader>

        {hasError ? (
          <ErrorState onRetry={handleRetry} />
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="mb-4 text-lg font-semibold">Overview</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isLoading ? (
                  <><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /></>
                ) : metrics ? (
                  <>
                    <MetricCard title="Active Agents" value={metrics.totalAgents.value} trend={metrics.totalAgents.trend} trendDirection={metrics.totalAgents.trendDirection} icon={Bot} />
                    <MetricCard title="Tasks Completed" value={metrics.tasksCompleted.value} trend={metrics.tasksCompleted.trend} trendDirection={metrics.tasksCompleted.trendDirection} icon={CheckCircle} />
                    <MetricCard title="Decisions Made" value={metrics.decisionsMade.value} trend={metrics.decisionsMade.trend} trendDirection={metrics.decisionsMade.trendDirection} icon={Brain} />
                    <MetricCard title="Avg Response Time" value={metrics.avgResponseTime.value} trend={metrics.avgResponseTime.trend} trendDirection={metrics.avgResponseTime.trendDirection} icon={Clock} />
                  </>
                ) : null}
              </div>
            </section>

            <section>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <AgentPerformanceWidget
                  data={agentPerformanceData}
                  summary={leaderboardData ? { totalAgents: leaderboardData.leaderboard.length, activeAgents: leaderboardData.leaderboard.filter((a) => a.status === 'active' || a.status === 'idle').length, totalTasksCompleted: leaderboardData.leaderboard.reduce((sum, a) => sum + a.tasksCompleted, 0), overallSuccessRate: leaderboardData.leaderboard.length > 0 ? leaderboardData.leaderboard.reduce((sum, a) => sum + a.successRate, 0) / leaderboardData.leaderboard.length : 0, totalCost: leaderboardData.leaderboard.reduce((sum, a) => sum + a.totalCost, 0) } : undefined}
                  isLoading={isLeaderboardLoading}
                />
                <TaskPipelineWidget stages={taskPipelineData?.stages} statusBreakdown={taskPipelineData?.statusBreakdown} summary={taskPipelineData?.summary} isLoading={isBottlenecksLoading} />
                <DecisionAnalyticsWidget categories={decisionData.categories} trends={decisionData.trends} summary={decisionData.summary} isLoading={false} />
                <CostAnalyticsWidget trends={costData?.trends} breakdown={costData?.breakdown} byAgent={costData?.byAgent} summary={costData?.summary} isLoading={isRoiLoading} />
              </div>
            </section>

            <section>
              <ActivityTimelineWidget activities={activityData.activities} summary={activityData.summary} isLoading={isOverviewLoading} />
            </section>
          </div>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
