'use client';

import * as React from 'react';
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
  generatePerformanceData,
  type DateRange,
  type AgentPerformance,
} from '@/components/dashboard/performance';
import { BarChart3, RefreshCw, Users } from 'lucide-react';

export default function PerformancePage() {
  const [dateRange, setDateRange] = React.useState<DateRange>('30d');
  const [selectedAgent, setSelectedAgent] = React.useState<AgentPerformance | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  // Generate mock data based on selected date range
  const data = React.useMemo(() => generatePerformanceData(dateRange), [dateRange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

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
            <ExportButton dateRange={dateRange} />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </PageHeader>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <MetricCard data={data.metrics.tasksCompleted} />
          <MetricCard data={data.metrics.activeAgents} />
          <MetricCard data={data.metrics.avgCompletionTime} />
          <MetricCard data={data.metrics.successRate} />
          <MetricCard data={data.metrics.totalEscalations} />
          <MetricCard data={data.metrics.totalCost} />
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
                  agents={data.agentLeaderboard}
                  onAgentClick={setSelectedAgent}
                />
              </div>
              
              {/* Bottlenecks */}
              <div>
                <BottleneckVisualization bottlenecks={data.bottlenecks} />
              </div>
            </div>

            {/* ROI Section */}
            <ROIMetricsSection data={data.roi} />

            {/* Task Stage Chart */}
            <TaskStageChart stages={data.taskStageMetrics} />
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
                {data.agentLeaderboard.map((agent) => (
                  <AgentAnalytics 
                    key={agent.agent.id}
                    agent={agent}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </DashboardLayout>
  );
}

// Utility for class merging
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
