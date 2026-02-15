'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/dashboard/layout';
import { DashboardLayout } from '@/components/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MetricCard,
  DateRangeSelector,
  AgentLeaderboard,
  AgentAnalytics,
  ROIMetricsSection,
  BottleneckVisualization,
  ExportButton,
  TaskStageChart,
  type DateRange,
  type AgentPerformance,
} from '@/components/dashboard/performance';
import { usePerformanceData } from '@/lib/hooks/use-analytics';
import { BarChart3, RefreshCw, Users, AlertCircle } from 'lucide-react';

export default function PerformancePage() {
  const [dateRange, setDateRange] = React.useState<DateRange>('30d');
  const [selectedAgent, setSelectedAgent] = React.useState<AgentPerformance | null>(null);
  const { data, isLoading, error, refetch } = usePerformanceData(dateRange);

  const handleRefresh = async () => {
    await refetch();
  };

  // Handle loading state
  if (isLoading && !data) {
    return (
      <DashboardLayout>
        <PageContainer>
          <PageHeader
            title="Performance Dashboard"
            description="Analytics, insights, and ROI metrics for your AI workforce"
          />
          <div className="flex items-center justify-center h-96">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

  // Handle error state
  if (error && !data) {
    return (
      <DashboardLayout>
        <PageContainer>
          <PageHeader
            title="Performance Dashboard"
            description="Analytics, insights, and ROI metrics for your AI workforce"
          />
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Failed to load analytics</h3>
              <p className="text-muted-foreground mt-1">{error.message}</p>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

  // Use real data or fallback to empty state
  const performanceData = data;

  return (
    <DashboardLayout>
      <PageContainer>
        {/* Header */}
        <PageHeader
          title="Performance Dashboard"
          description="Analytics, insights, and ROI metrics for your AI workforce"
        >
          <div className="flex items-center gap-3">
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
            <ExportButton dateRange={dateRange} data={performanceData} disabled={!performanceData} />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </PageHeader>

        {performanceData && (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <MetricCard data={performanceData.metrics.tasksCompleted} />
              <MetricCard data={performanceData.metrics.activeAgents} />
              <MetricCard data={performanceData.metrics.avgCompletionTime} />
              <MetricCard data={performanceData.metrics.successRate} />
              <MetricCard data={performanceData.metrics.totalEscalations} />
              <MetricCard data={performanceData.metrics.totalCost} />
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="agents" className="gap-2">
                  <Users className="h-4 w-4" />
                  Agent Analytics
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Leaderboard */}
                  <div className="lg:col-span-2">
                    <AgentLeaderboard 
                      agents={performanceData.agentLeaderboard}
                      onAgentClick={setSelectedAgent}
                    />
                  </div>
                  
                  {/* Bottlenecks */}
                  <div>
                    <BottleneckVisualization bottlenecks={performanceData.bottlenecks} />
                  </div>
                </div>

                {/* ROI Section */}
                <ROIMetricsSection data={performanceData.roi} />

                {/* Task Stage Chart */}
                <TaskStageChart stages={performanceData.taskStageMetrics} />
              </TabsContent>

              {/* Agent Analytics Tab */}
              <TabsContent value="agents" className="space-y-6">
                {selectedAgent ? (
                  <AgentAnalytics 
                    agent={selectedAgent}
                    onClose={() => setSelectedAgent(null)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {performanceData.agentLeaderboard.map((agent) => (
                      <AgentAnalytics 
                        key={agent.agent.id}
                        agent={agent}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setSelectedAgent(agent)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
