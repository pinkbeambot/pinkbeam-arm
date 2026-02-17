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

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      to: now,
      preset: '30d',
    };
  });

  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data: agentsData, isLoading: isLoadingAgents } = useAgents();
  const agents = useMemo(() => {
    if (!agentsData?.data) return [];
    return agentsData.data.map((agent: { id: string; name: string; role: string }) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
    }));
  }, [agentsData]);

  const { data: agentPerformance, isLoading: isLoadingAgentsPerf } = useAgentPerformance(
    dateRange,
    { agentIds: selectedAgents.length > 0 ? selectedAgents : undefined }
  );

  const { data: taskPipeline, isLoading: isLoadingTasks } = useTaskPipeline(dateRange);

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
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Analytics Dashboard"
            description="Track agent performance, task pipeline, and system metrics"
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeSelector
              value={dateRange}
              onChange={setDateRange}
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
