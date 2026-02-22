'use client';

import { useState, useMemo } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/dashboard/layout';
import { DashboardLayout } from '@/components/dashboard/layout';
import {
  AgentPerformanceWidget,
  TaskPipelineWidget,
  DecisionAnalyticsWidget,
  CostAnalyticsWidget,
  ActivityTimelineWidget,
  DateRangeSelector,
  AnalyticsFilters,
  ExportButton,
} from '@/components/analytics';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import {
  useAgentPerformance,
  useTaskPipeline,
  useDecisionAnalytics,
  useCostAnalytics,
  useActivityTimeline,
  useRefreshAnalytics,
} from '@/hooks/analytics';
import type { DateRange } from '@/types/analytics';

function useAgents() {
  return useQuery({
    queryKey: ['agents', 'list'],
    queryFn: async () => {
      const response = await fetch('/api/agents?limit=100');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

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

function getTrendIcon(direction: 'up' | 'down' | 'stable', isPositive: boolean) {
  if (direction === 'stable') return Minus;
  if (direction === 'up') return isPositive ? TrendingUp : TrendingUp;
  return TrendingDown;
}

// Convert DateRange to preset string for the hooks
function dateRangeToPreset(dateRange: DateRange): 'today' | '7d' | '30d' | '90d' {
  const preset = dateRange.preset;
  if (preset === 'today' || preset === '7d' || preset === '30d' || preset === '90d') {
    return preset;
  }
  return '30d';
}

// ============================================================================
// Metric Card Component
// ============================================================================

function MetricCard({
  title,
  value,
  description,
  trend,
  trendDirection = 'stable',
  isLoading,
  icon: Icon,
  className,
}: MetricCardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0;
  const TrendIcon = getTrendIcon(trendDirection, isPositiveTrend);

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
            {description && !isLoading && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {!isLoading && trend !== undefined && (
          <div className="mt-4 flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                isPositiveTrend ? 'text-green-600' : 'text-red-600'
              )}
            >
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

// ============================================================================
// Metric Card Skeleton
// ============================================================================

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

// ============================================================================
// Error State
// ============================================================================

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Failed to load analytics</h3>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        There was an error loading the analytics data. Please try again.
      </p>
      <Button onClick={onRetry} variant="outline" className="mt-4">
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      to: now,
      preset: '30d',
    };
  });

  // Extract preset for hooks that expect string DateRange
  const datePreset = dateRangeToPreset(dateRange);

  // Fetch all analytics data
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useOverviewMetrics(datePreset);

  const {
    data: leaderboardData,
    isLoading: isLeaderboardLoading,
    error: leaderboardError,
    refetch: refetchLeaderboard,
  } = useLeaderboard(datePreset);

  const {
    data: bottlenecksData,
    isLoading: isBottlenecksLoading,
    error: bottlenecksError,
    refetch: refetchBottlenecks,
  } = useBottlenecks(24);

  const {
    data: roiData,
    isLoading: isRoiLoading,
    error: roiError,
    refetch: refetchRoi,
  } = useROIMetrics(datePreset);

  const handleRetry = useCallback(() => {
    refetchOverview();
    refetchLeaderboard();
    refetchBottlenecks();
    refetchRoi();
  }, [refetchOverview, refetchLeaderboard, refetchBottlenecks, refetchRoi]);

  const hasError = overviewError || leaderboardError || bottlenecksError || roiError;
  const isLoading = isOverviewLoading || isLeaderboardLoading || isBottlenecksLoading || isRoiLoading;

  // Transform leaderboard data to agent performance metrics
  const agentPerformanceData = useMemo(() => {
    if (!leaderboardData?.leaderboard) return [];
    return leaderboardData.leaderboard.map((agent) => ({
      agentId: agent.agentId,
      agentName: agent.name,
      agentRole: agent.role,
      avatarUrl: agent.avatarUrl,
      tasksCompleted: agent.tasksCompleted,
      tasksFailed: agent.tasksFailed,
      tasksInProgress: 0, // Not provided by API
      successRate: agent.successRate,
      avgTaskDuration: agent.avgTaskDuration / 60, // Convert seconds to minutes
      totalCost: agent.totalCost,
      escalationsRaised: agent.escalationCount,
      lastActiveAt: undefined,
    }));
  }, [agentsData]);

  const { data: agentPerformance, isLoading: isLoadingAgentsPerf } = useAgentPerformance(
    dateRange,
    { agentIds: selectedAgents.length > 0 ? selectedAgents : undefined }
  );

    // Generate mock daily trends based on the total cost and task count
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

  const { data: decisionAnalytics, isLoading: isLoadingDecisions } = useDecisionAnalytics(
    dateRange,
    { categories: selectedCategories.length > 0 ? selectedCategories : undefined }
  );

  const { data: costAnalytics, isLoading: isLoadingCosts } = useCostAnalytics(
    dateRange,
    { agentIds: selectedAgents.length > 0 ? selectedAgents : undefined }
  );

  const { data: activityTimeline, isLoading: isLoadingActivities } = useActivityTimeline(
    dateRange,
    {
      agentIds: selectedAgents.length > 0 ? selectedAgents : undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    },
    { limit: 50 }
  );

  const refresh = useRefreshAnalytics();

  const handleRefresh = () => {
    refresh.refreshAll();
  };

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader
          title="Analytics"
          description="Comprehensive insights into your AI workforce performance"
        >
          <div className="flex items-center gap-3">
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
            <ExportButton
              dateRange={dateRange}
              disabled={isLoading || !!hasError}
            />
            <AnalyticsFilters
              agents={agents}
              selectedAgents={selectedAgents}
              onAgentsChange={setSelectedAgents}
              categories={['action', 'resource', 'escalation', 'strategy']}
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
            />
            <ExportButton
              dateRange={dateRange}
              agentIds={selectedAgents}
              categories={selectedCategories}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Agent Performance */}
          <AgentPerformanceWidget
            data={agentPerformance?.data}
            summary={agentPerformance?.summary}
            isLoading={isLoadingAgentsPerf}
            className="md:col-span-1"
          />

          {/* Task Pipeline */}
          <TaskPipelineWidget
            stages={taskPipeline?.stages}
            statusBreakdown={taskPipeline?.statusBreakdown}
            summary={taskPipeline?.summary}
            isLoading={isLoadingTasks}
            className="md:col-span-1"
          />

          {/* Decision Analytics */}
          <DecisionAnalyticsWidget
            categories={decisionAnalytics?.categories}
            trends={decisionAnalytics?.trends}
            summary={decisionAnalytics?.summary}
            isLoading={isLoadingDecisions}
            className="md:col-span-1"
          />

          {/* Cost Analytics */}
          <CostAnalyticsWidget
            trends={costAnalytics?.trends}
            breakdown={costAnalytics?.breakdown}
            byAgent={costAnalytics?.byAgent}
            summary={costAnalytics?.summary}
            isLoading={isLoadingCosts}
            className="md:col-span-1"
          />

          {/* Activity Timeline */}
          <ActivityTimelineWidget
            activities={activityTimeline?.activities}
            summary={activityTimeline?.summary}
            isLoading={isLoadingActivities}
            className="md:col-span-2 xl:col-span-2"
          />
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
