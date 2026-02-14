/**
 * Realtime Metrics Dashboard
 * 
 * Main dashboard component for real-time metrics featuring:
 * - Live updating charts (tasks/min, success rate, agent load)
 * - Agent performance cards with real-time updates
 * - System health indicators
 * - Aggregated metrics grid
 * - WebSocket connection status
 */

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Activity,
  BarChart3,
  Cpu,
  RefreshCw,
  Wifi,
  WifiOff,
  Users,
  Zap,
  LayoutDashboard,
  Settings,
} from 'lucide-react';

// Hooks
import { useRealtimeMetrics } from './useRealtimeMetrics';

// Components
import { LiveLineChart } from './LiveLineChart';
import { AgentMetricsCard, AgentMetricsCompact } from './AgentMetricsCard';
import { SystemHealthIndicator, SystemHealthCompact } from './SystemHealthIndicator';
import { MetricsGrid, MetricsSummary } from './MetricsGrid';

// Types
import type { RealtimeMetricsDashboardProps, MetricTimeRange, AgentLiveMetrics } from './types';

// ============================================================================
// Time Range Selector
// ============================================================================

interface TimeRangeSelectorProps {
  value: MetricTimeRange;
  onChange: (value: MetricTimeRange) => void;
}

function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const ranges: { value: MetricTimeRange; label: string }[] = [
    { value: 'live', label: 'Live' },
    { value: '1h', label: '1H' },
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
  ];

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-all',
            value === range.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Live Indicator
// ============================================================================

function LiveIndicator({ isLive, lastUpdate }: { isLive: boolean; lastUpdate: Date | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'w-2 h-2 rounded-full animate-pulse',
        isLive ? 'bg-green-500' : 'bg-amber-500'
      )} />
      <span className={cn(
        'text-xs font-medium',
        isLive ? 'text-green-600' : 'text-amber-600'
      )}>
        {isLive ? 'LIVE' : 'POLLING'}
      </span>
      {lastUpdate && (
        <span className="text-xs text-muted-foreground">
          Updated {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export function RealtimeMetricsDashboard({
  className,
  defaultTimeRange = 'live',
  showSystemHealth = true,
  showAgentList = true,
}: RealtimeMetricsDashboardProps) {
  const [timeRange, setTimeRange] = React.useState<MetricTimeRange>(defaultTimeRange);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Use the realtime metrics hook
  const {
    agentMetrics,
    selectedAgent,
    setSelectedAgent,
    systemHealth,
    aggregated,
    tasksPerMinuteHistory,
    successRateHistory,
    agentLoadHistory,
    isConnected,
    isRealtime,
    lastUpdateAt,
    refresh,
  } = useRealtimeMetrics({
    enabled: true,
    maxDataPoints: timeRange === 'live' ? 60 : timeRange === '1h' ? 60 : 24,
  });

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Real-time Metrics</h1>
          <div className="flex items-center gap-4 mt-1">
            <LiveIndicator isLive={isRealtime} lastUpdate={lastUpdateAt} />
            {aggregated && <MetricsSummary metrics={aggregated} />}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Badge variant={isRealtime ? 'default' : 'secondary'} className="gap-1">
            {isRealtime ? (
              <>
                <Wifi className="w-3 h-3" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                Polling
              </>
            )}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2">
            <Users className="h-4 w-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Cpu className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Live Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LiveLineChart
              title="Tasks per Minute"
              data={tasksPerMinuteHistory}
              color="#ec4899"
              valueFormatter={(v: number) => v.toFixed(1)}
              showArea
              height={180}
            />
            <LiveLineChart
              title="Success Rate"
              data={successRateHistory}
              color="#22c55e"
              valueFormatter={(v: number) => `${v.toFixed(0)}%`}
              yAxisMin={0}
              yAxisMax={100}
              showArea
              height={180}
            />
            <LiveLineChart
              title="Agent Load"
              data={agentLoadHistory}
              color="#3b82f6"
              valueFormatter={(v: number) => v.toFixed(1)}
              showArea
              height={180}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent List */}
            {showAgentList && (
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-pink-500" />
                    Active Agents
                    <Badge variant="secondary" className="ml-auto">
                      {agentMetrics.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {agentMetrics.map((agent: AgentLiveMetrics) => (
                        <AgentMetricsCompact
                          key={agent.agentId}
                          agent={agent}
                          isSelected={selectedAgent?.agentId === agent.agentId}
                          onClick={() => setSelectedAgent(
                            selectedAgent?.agentId === agent.agentId ? null : agent
                          )}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Metrics Grid */}
            <div className="lg:col-span-2 space-y-6">
              {aggregated && <MetricsGrid metrics={aggregated} />}
              
              {showSystemHealth && systemHealth && (
                <SystemHealthCompact health={systemHealth} />
              )}
            </div>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-6">
          {/* Selected Agent Detail */}
          {selectedAgent && (
            <Card className="border-pink-200 bg-pink-50/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-pink-500" />
                  {selectedAgent.agentName} - Detailed View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks/Min</p>
                    <p className="text-2xl font-bold">{selectedAgent.tasksPerMinute.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">{selectedAgent.successRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Load</p>
                    <p className="text-2xl font-bold">{selectedAgent.currentLoad.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                    <p className="text-2xl font-bold">{Math.round(selectedAgent.avgResponseTime)}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agentMetrics.map((agent: AgentLiveMetrics) => (
              <AgentMetricsCard
                key={agent.agentId}
                agent={agent}
                isSelected={selectedAgent?.agentId === agent.agentId}
                onClick={() => setSelectedAgent(
                  selectedAgent?.agentId === agent.agentId ? null : agent
                )}
              />
            ))}
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {systemHealth && (
              <SystemHealthIndicator health={systemHealth} showDetails />
            )}
            
            {/* Connection Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-pink-500" />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">WebSocket Status</span>
                  <Badge variant={isRealtime ? 'default' : 'secondary'}>
                    {isRealtime ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Data Source</span>
                  <Badge variant={isRealtime ? 'default' : 'secondary'}>
                    {isRealtime ? 'Realtime' : 'Polling'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Last Update</span>
                  <span className="text-sm">
                    {lastUpdateAt?.toLocaleTimeString() || 'Never'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Page Wrapper for Next.js App Router
// ============================================================================

export default function RealtimeMetricsPage() {
  return (
    <div className="space-y-6">
      <RealtimeMetricsDashboard />
    </div>
  );
}
