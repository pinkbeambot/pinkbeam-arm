'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
  BarChart3,
  LayoutGrid,
  Settings,
  Filter,
  AlertCircle
} from 'lucide-react';

import { useRealtimeMetrics } from './useRealtimeMetrics';
import { LiveLineChart } from './LiveLineChart';
import { AgentMetricsCard, AgentMetricsCompact } from './AgentMetricsCard';
import { SystemHealthIndicator, SystemHealthCompact, HealthStatusBadge } from './SystemHealthIndicator';
import { MetricsGrid, MetricsSummary } from './MetricsGrid';

import type { RealtimeMetricsDashboardProps, MetricTimeRange } from './types';

// ============================================================================
// TimeRangeSelector Component
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
            'px-3 py-1 text-sm font-medium rounded-md transition-all',
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
// EmptyState Component
// ============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Activity className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        {message}
      </h3>
      <p className="text-sm text-muted-foreground">
        Metrics will appear here when data is available.
      </p>
    </div>
  );
}

// ============================================================================
// ErrorState Component
// ============================================================================

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="metrics-error-state">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        Failed to fetch metrics
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// RealtimeMetricsDashboard Component
// ============================================================================

export function RealtimeMetricsDashboard({
  className,
  defaultTimeRange = 'live',
  showSystemHealth = true,
  showAgentList = true,
}: RealtimeMetricsDashboardProps) {
  const [timeRange, setTimeRange] = React.useState<MetricTimeRange>(defaultTimeRange);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [showSummary, setShowSummary] = React.useState(false);

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
    error,
    isLoading,
    refresh,
  } = useRealtimeMetrics({
    enabled: true,
    refreshInterval: timeRange === 'live' ? 1000 : 5000,
  });

  const handleRefresh = () => {
    refresh();
  };

  const formatLastUpdate = () => {
    if (!lastUpdateAt) return 'Never';
    return lastUpdateAt.toLocaleTimeString();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Real-time Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Live agent performance and system health monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Realtime indicator */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
              isRealtime
                ? 'bg-green-500/10 text-green-600'
                : 'bg-amber-500/10 text-amber-600'
            )}
          >
            {isRealtime ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Time range selector */}
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />

          {/* Refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="h-9 w-9"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between" data-testid="metrics-error-banner">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-600">Failed to fetch metrics</p>
              <p className="text-sm text-red-600/80">{error.message}</p>
            </div>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* System Health */}
      {showSystemHealth && systemHealth && !error && (
        <SystemHealthIndicator
          health={systemHealth}
          showDetails
        />
      )}

      {/* Aggregated Metrics */}
      {aggregated && !error && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Overview</h2>
            <div className="flex items-center gap-2">
              <Button
                variant={showSummary ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowSummary(!showSummary)}
              >
                {showSummary ? 'Compact View' : 'Detailed View'}
              </Button>
            </div>
          </div>

          {showSummary ? (
            <MetricsSummary metrics={aggregated} />
          ) : (
            <MetricsGrid metrics={aggregated} />
          )}
        </>
      )}

      {/* Charts & Agent List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Performance Charts</h2>
            <span className="text-xs text-muted-foreground">
              Last updated: {formatLastUpdate()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LiveLineChart
              data={tasksPerMinuteHistory}
              title="Tasks per Minute"
              valueFormatter={(v) => `${v.toFixed(1)}/min`}
              color="#3b82f6"
              showArea
            />

            <LiveLineChart
              data={successRateHistory}
              title="Success Rate"
              valueFormatter={(v) => `${v.toFixed(1)}%`}
              color="#22c55e"
              yAxisMin={0}
              yAxisMax={100}
              showArea
            />

            <LiveLineChart
              data={agentLoadHistory}
              title="Agent Load Average"
              valueFormatter={(v) => `${v.toFixed(0)}%`}
              color="#f59e0b"
              yAxisMin={0}
              yAxisMax={100}
              showArea
              className="md:col-span-2"
            />
          </div>
        </div>

        {/* Agent List */}
        {showAgentList && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Agents</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
                {error ? (
                  <ErrorState message={error.message} onRetry={handleRefresh} />
                ) : agentMetrics.length === 0 ? (
                  <EmptyState message="No agents found" />
                ) : (
                  agentMetrics.map((agent) => (
                    viewMode === 'grid' ? (
                      <AgentMetricsCard
                        key={agent.agentId}
                        agent={agent}
                        isSelected={selectedAgent?.agentId === agent.agentId}
                        onClick={() => setSelectedAgent(
                          selectedAgent?.agentId === agent.agentId ? null : agent
                        )}
                      />
                    ) : (
                      <AgentMetricsCompact
                        key={agent.agentId}
                        agent={agent}
                        isSelected={selectedAgent?.agentId === agent.agentId}
                        onClick={() => setSelectedAgent(
                          selectedAgent?.agentId === agent.agentId ? null : agent
                        )}
                      />
                    )
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Selected Agent Details */}
      {selectedAgent && (
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>{selectedAgent.agentName}</CardTitle>
                <HealthStatusBadge 
                  status={selectedAgent.status === 'active' ? 'healthy' : 
                          selectedAgent.status === 'error' ? 'critical' : 
                          selectedAgent.status === 'paused' ? 'degraded' : 'unknown'} 
                  size="sm"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAgent(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Agent ID</p>
                <p className="font-mono text-sm">{selectedAgent.agentId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks/min</p>
                <p className="text-lg font-semibold">{selectedAgent.tasksPerMinute.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className={cn(
                  'text-lg font-semibold',
                  selectedAgent.successRate >= 95 ? 'text-green-600' :
                  selectedAgent.successRate >= 80 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {selectedAgent.successRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-lg font-semibold">{selectedAgent.avgResponseTime.toFixed(0)}ms</p>
              </div>
            </div>

            {selectedAgent.errorRate > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">
                <strong>Error Rate:</strong> {selectedAgent.errorRate.toFixed(2)}% - 
                {selectedAgent.errorRate > 5 
                  ? ' Elevated error rate detected. Consider investigating.' 
                  : ' Within normal range.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Default export
export default RealtimeMetricsDashboard;
