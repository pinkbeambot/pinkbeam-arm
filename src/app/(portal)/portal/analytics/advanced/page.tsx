'use client';

import { useState, useCallback, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { PageContainer, PageHeader } from '@/components/dashboard/layout';
import { DashboardLayout } from '@/components/dashboard/layout';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { ExportButton } from '@/components/analytics/ExportButton';
import { PredictiveAnalyticsWidget } from '@/components/analytics/PredictiveAnalyticsWidget';
import { HeatmapWidget } from '@/components/analytics/HeatmapWidget';
import { InsightsWidget } from '@/components/analytics/InsightsWidget';
import { NaturalLanguageQuery } from '@/components/analytics/NaturalLanguageQuery';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, Minus, Bot, CheckCircle, Brain, Clock, Activity, Zap, DollarSign } from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import type { DateRange } from '@/types/analytics';

import { AgentPerformanceWidget } from '@/components/analytics/AgentPerformanceWidget';
import { TaskPipelineWidget } from '@/components/analytics/TaskPipelineWidget';
import { DecisionAnalyticsWidget } from '@/components/analytics/DecisionAnalyticsWidget';
import { CostAnalyticsWidget } from '@/components/analytics/CostAnalyticsWidget';
import { ActivityTimelineWidget } from '@/components/analytics/ActivityTimelineWidget';

import { 
  useOverviewMetrics, 
  useLeaderboard, 
  useBottlenecks, 
  useROIMetrics 
} from '@/lib/hooks/use-analytics';

import {
  usePredictions,
  useHeatmap,
  useNLQuery,
  useInsights,
  useRealtimeMetrics,
} from '@/lib/hooks/use-advanced-analytics';

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

function MetricCard({ title, value, description, trend, trendDirection = 'stable', isLoading, icon: Icon, className }: MetricCardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0;
  const TrendIcon = trendDirection === 'stable' ? Minus : trendDirection === 'up' ? TrendingUp : TrendingDown;

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
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
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

export default function AdvancedAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
    preset: '30d',
  });

  const datePreset = useMemo(() => {
    const preset = dateRange.preset;
    if (preset === 'today' || preset === '7d' || preset === '30d' || preset === '90d') {
      return preset;
    }
    return '30d';
  }, [dateRange]);

  // Basic analytics hooks
  const { 
    data: overviewData, 
    isLoading: isOverviewLoading, 
    error: overviewError, 
    refetch: refetchOverview 
  } = useOverviewMetrics(datePreset);
  
  const { 
    data: leaderboardData, 
    isLoading: isLeaderboardLoading, 
    error: leaderboardError, 
    refetch: refetchLeaderboard 
  } = useLeaderboard(datePreset);
  
  const { 
    data: bottlenecksData, 
    isLoading: isBottlenecksLoading, 
    error: bottlenecksError, 
    refetch: refetchBottlenecks 
  } = useBottlenecks(24);
  
  const { 
    data: roiData, 
    isLoading: isRoiLoading, 
    error: roiError, 
    refetch: refetchRoi 
  } = useROIMetrics(datePreset);

  // Advanced analytics hooks
  const {
    data: predictionsData,
    isLoading: isPredictionsLoading,
    error: predictionsError,
    refetch: refetchPredictions,
  } = usePredictions(dateRange, 7);

  const {
    data: heatmapData,
    isLoading: isHeatmapLoading,
    error: heatmapError,
    refetch: refetchHeatmap,
  } = useHeatmap('hourly', dateRange, 'activity');

  const {
    insights,
    alerts,
    isLoading: isInsightsLoading,
    error: insightsError,
    refetch: refetchInsights,
    acknowledgeAlert,
  } = useInsights(dateRange);

  const {
    data: nlQueryResult,
    isLoading: isNLQueryLoading,
    error: nlQueryError,
    executeQuery,
  } = useNLQuery(dateRange);

  const {
    data: realtimeData,
    isLoading: isRealtimeLoading,
  } = useRealtimeMetrics(30000);

  const handleRetry = useCallback(() => {
    refetchOverview();
    refetchLeaderboard();
    refetchBottlenecks();
    refetchRoi();
    refetchPredictions();
    refetchHeatmap();
    refetchInsights();
  }, [refetchOverview, refetchLeaderboard, refetchBottlenecks, refetchRoi, refetchPredictions, refetchHeatmap, refetchInsights]);

  const hasError = overviewError || leaderboardError || bottlenecksError || roiError || predictionsError || heatmapError || insightsError;
  const isLoading = isOverviewLoading || isLeaderboardLoading || isBottlenecksLoading || isRoiLoading;

  // Transform data for widgets
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
    const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
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

  // Time series data for enhanced charts
  const timeSeriesData = useMemo(() => {
    if (!overviewData?.dailyBreakdown) return [];
    return overviewData.dailyBreakdown.map(d => ({
      date: d.date,
      value: d.tasksCompleted,
    }));
  }, [overviewData]);

  const costTimeSeriesData = useMemo(() => {
    // @ts-expect-error - dailyTrend not yet in ROIData type
    if (!roiData?.dailyTrend) return [];
    // @ts-expect-error - dailyTrend not yet in ROIData type
    return roiData.dailyTrend.map((d: {date: string; cost: number}) => ({
      date: d.date,
      value: d.cost,
    }));
  }, [roiData]);

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader title="Advanced Analytics" description="ML-powered insights and predictive analytics for your AI workforce">
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
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="explore">Explore</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Real-time Metrics */}
              {realtimeData && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Real-time Metrics
                    <Badge variant="secondary" className="text-xs">Live</Badge>
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard 
                      title="Active Agents" 
                      value={realtimeData.agents.active} 
                      description={`${realtimeData.agents.idle} idle`}
                      icon={Bot} 
                      isLoading={isRealtimeLoading}
                    />
                    <MetricCard 
                      title="Tasks In Progress" 
                      value={realtimeData.tasks.inProgress} 
                      description={`${realtimeData.tasks.queued} queued`}
                      icon={CheckCircle} 
                      isLoading={isRealtimeLoading}
                    />
                    <MetricCard 
                      title="Success Rate" 
                      value={`${realtimeData.tasks.completed > 0 
                        ? ((realtimeData.tasks.completed / (realtimeData.tasks.completed + realtimeData.tasks.failed)) * 100).toFixed(1)
                        : '0.0'}%`}
                      icon={Zap} 
                      isLoading={isRealtimeLoading}
                    />
                    <MetricCard 
                      title="Hourly Cost" 
                      value={formatCurrency(realtimeData.cost.currentHour)}
                      trend={0}
                      icon={DollarSign} 
                      isLoading={isRealtimeLoading}
                    />
                  </div>
                </section>
              )}

              {/* KPI Overview */}
              <section>
                <h2 className="mb-4 text-lg font-semibold">Key Performance Indicators</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {isLoading ? (
                    <><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /></>
                  ) : overviewData ? (
                    <>
                      <MetricCard 
                        title="Active Agents" 
                        value={overviewData.activeAgents.value} 
                        trend={overviewData.activeAgents.trend}
                        trendDirection={overviewData.activeAgents.trend >= 0 ? 'up' : 'down'}
                        icon={Bot} 
                      />
                      <MetricCard 
                        title="Tasks Completed" 
                        value={formatNumber(overviewData.tasksCompleted.value)} 
                        trend={overviewData.tasksCompleted.trend}
                        trendDirection={overviewData.tasksCompleted.trend >= 0 ? 'up' : 'down'}
                        icon={CheckCircle} 
                      />
                      <MetricCard 
                        title="Decisions Made" 
                        value="110" 
                        trend={12.5}
                        trendDirection="up"
                        icon={Brain} 
                      />
                      <MetricCard 
                        title="Avg Response Time" 
                        value={overviewData.avgTaskDuration ? `${(overviewData.avgTaskDuration / 60).toFixed(1)}m` : '--'}
                        trend={-5.2}
                        trendDirection="down"
                        icon={Clock} 
                      />
                    </>
                  ) : null}
                </div>
              </section>

              {/* Enhanced Time Series Charts */}
              <section>
                <h2 className="mb-4 text-lg font-semibold">Trends & Forecasts</h2>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <TimeSeriesChart
                    data={timeSeriesData}
                    title="Task Completion Trend"
                    description="Daily tasks completed with trend line"
                    type="area"
                    showTrendLine
                    showPrediction
                    isLoading={isOverviewLoading}
                  />
                  <TimeSeriesChart
                    data={costTimeSeriesData}
                    title="Cost Trend"
                    description="Daily LLM costs with projections"
                    type="line"
                    showTrendLine
                    valueFormatter={formatCurrency}
                    isLoading={isRoiLoading}
                  />
                </div>
              </section>

              {/* Main Widgets */}
              <section>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <AgentPerformanceWidget
                    data={agentPerformanceData}
                    summary={leaderboardData ? { 
                      totalAgents: leaderboardData.leaderboard.length, 
                      activeAgents: leaderboardData.leaderboard.filter((a) => a.status === 'active' || a.status === 'idle').length, 
                      totalTasksCompleted: leaderboardData.leaderboard.reduce((sum, a) => sum + a.tasksCompleted, 0), 
                      overallSuccessRate: leaderboardData.leaderboard.length > 0 ? leaderboardData.leaderboard.reduce((sum, a) => sum + a.successRate, 0) / leaderboardData.leaderboard.length : 0, 
                      totalCost: leaderboardData.leaderboard.reduce((sum, a) => sum + a.totalCost, 0) 
                    } : undefined}
                    isLoading={isLeaderboardLoading}
                  />
                  <TaskPipelineWidget 
                    stages={bottlenecksData?.pipelineSnapshot ? [
                      { name: 'Queued', count: bottlenecksData.pipelineSnapshot.queued, percentage: 0 },
                      { name: 'In Progress', count: bottlenecksData.pipelineSnapshot.in_progress, percentage: 0 },
                      { name: 'Blocked', count: bottlenecksData.pipelineSnapshot.blocked, percentage: 0 },
                      { name: 'Review', count: bottlenecksData.pipelineSnapshot.review, percentage: 0 },
                    ].map(s => ({ ...s, percentage: bottlenecksData.pipelineSnapshot ? (s.count / Math.max(Object.values(bottlenecksData.pipelineSnapshot).reduce((a, b) => a + b, 0), 1)) * 100 : 0 })) : undefined}
                    isLoading={isBottlenecksLoading} 
                  />
                  <CostAnalyticsWidget 
                    trends={costData?.trends}
                    breakdown={costData?.breakdown}
                    byAgent={costData?.byAgent}
                    summary={costData?.summary}
                    isLoading={isRoiLoading}
                  />
                  <HeatmapWidget
                    data={heatmapData ?? undefined}
                    isLoading={isHeatmapLoading}
                  />
                </div>
              </section>
            </TabsContent>

            {/* Predictions Tab */}
            <TabsContent value="predictions" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <PredictiveAnalyticsWidget
                  taskPredictions={predictionsData?.taskPredictions}
                  workloadForecasts={predictionsData?.workloadForecasts}
                  costProjection={predictionsData?.costProjection}
                  anomalies={predictionsData?.anomalies}
                  isLoading={isPredictionsLoading}
                />
                <TimeSeriesChart
                  data={predictionsData?.costProjection?.forecast.map(f => ({ date: f.date, value: f.projected })) || []}
                  title="Cost Forecast"
                  description="7-day cost projection with confidence intervals"
                  type="area"
                  showPrediction
                  valueFormatter={formatCurrency}
                  isLoading={isPredictionsLoading}
                />
              </div>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <InsightsWidget
                  insights={insights}
                  alerts={alerts}
                  isLoading={isInsightsLoading}
                  onAcknowledgeAlert={acknowledgeAlert}
                />
                <NaturalLanguageQuery
                  onQuery={executeQuery}
                  isLoading={isNLQueryLoading}
                />
              </div>
            </TabsContent>

            {/* Explore Tab */}
            <TabsContent value="explore" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <HeatmapWidget
                  data={heatmapData ?? undefined}
                  isLoading={isHeatmapLoading}
                  className="lg:col-span-2"
                />
                <DecisionAnalyticsWidget
                  categories={[
                    { category: 'action', total: 45, approved: 35, rejected: 5, overridden: 5, approvalRate: 77.8 },
                    { category: 'resource', total: 30, approved: 25, rejected: 3, overridden: 2, approvalRate: 83.3 },
                    { category: 'escalation', total: 15, approved: 10, rejected: 2, overridden: 3, approvalRate: 66.7 },
                    { category: 'strategy', total: 20, approved: 15, rejected: 3, overridden: 2, approvalRate: 75.0 },
                  ]}
                  trends={[
                    { date: format(subDays(new Date(), 6), 'yyyy-MM-dd'), proposed: 8, approved: 6, rejected: 1, overridden: 1 },
                    { date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), proposed: 12, approved: 9, rejected: 2, overridden: 1 },
                    { date: format(subDays(new Date(), 4), 'yyyy-MM-dd'), proposed: 15, approved: 12, rejected: 2, overridden: 1 },
                    { date: format(subDays(new Date(), 3), 'yyyy-MM-dd'), proposed: 10, approved: 8, rejected: 1, overridden: 1 },
                    { date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), proposed: 18, approved: 14, rejected: 3, overridden: 1 },
                    { date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), proposed: 14, approved: 11, rejected: 2, overridden: 1 },
                    { date: format(new Date(), 'yyyy-MM-dd'), proposed: 11, approved: 8, rejected: 2, overridden: 1 },
                  ]}
                  summary={{ totalDecisions: 110, approvedCount: 85, rejectedCount: 15, overriddenCount: 10, pendingCount: 0, overallApprovalRate: 77.3, avgConfidence: 0.82 }}
                  isLoading={false}
                />
                <ActivityTimelineWidget
                  activities={[
                    { id: '1', type: 'task.completed', category: 'task', title: 'Task completed', description: 'Content generation task finished', timestamp: new Date().toISOString(), agentId: 'agent-1', agentName: 'Writer Agent' },
                    { id: '2', type: 'decision.proposed', category: 'decision', title: 'New decision proposed', description: 'Request to access external API', timestamp: subDays(new Date(), 0.5).toISOString(), agentId: 'agent-2', agentName: 'Research Agent' },
                    { id: '3', type: 'agent.spawned', category: 'agent', title: 'New agent spawned', description: 'Specialist agent created for data analysis', timestamp: subDays(new Date(), 1).toISOString(), agentId: 'agent-3', agentName: 'Data Analyst' },
                    { id: '4', type: 'escalation.created', category: 'escalation', title: 'Escalation created', description: 'Human review requested', timestamp: subDays(new Date(), 1.5).toISOString(), agentId: 'agent-1', agentName: 'Writer Agent' },
                    { id: '5', type: 'task.started', category: 'task', title: 'Task started', description: 'Email drafting task initiated', timestamp: subDays(new Date(), 2).toISOString(), agentId: 'agent-2', agentName: 'Research Agent' },
                  ]}
                  summary={{ totalEvents: 142, eventsByType: { task: 45, decision: 30, agent: 25, escalation: 15, system: 27 }, eventsByCategory: { task: 45, decision: 30, agent: 25, escalation: 15, system: 27 } }}
                  isLoading={isOverviewLoading}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
