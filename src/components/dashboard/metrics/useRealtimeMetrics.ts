'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  AgentLiveMetrics,
  SystemHealthMetrics,
  AggregatedMetrics,
  LiveMetricPoint,
  UseRealtimeMetricsOptions,
  UseRealtimeMetricsReturn,
} from './types';

// ============================================================================
// Mock Data Generators (for development/demo purposes)
// ============================================================================

function generateMockAgentMetrics(agentId: string, agentName: string): AgentLiveMetrics {
  const statuses = ['idle', 'active', 'paused', 'error'] as const;
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  return {
    agentId,
    agentName,
    status: status === 'idle' ? 'idle' : status === 'active' ? 'active' : status === 'paused' ? 'paused' : 'error',
    tasksPerMinute: Math.random() * 10,
    successRate: 70 + Math.random() * 25,
    currentLoad: Math.random() * 100,
    avgResponseTime: 100 + Math.random() * 500,
    errorRate: Math.random() * 5,
    lastActivityAt: new Date().toISOString(),
    cpuUsage: Math.random() * 80,
    memoryUsage: Math.random() * 70,
  };
}

function generateMockSystemHealth(): SystemHealthMetrics {
  return {
    status: 'healthy',
    uptime: 86400 + Math.random() * 10000,
    database: {
      status: 'healthy',
      responseTime: 5 + Math.random() * 20,
      connectionPool: {
        used: Math.floor(Math.random() * 10),
        total: 20,
        utilization: Math.random() * 50,
      },
      queryLatency: {
        p50: 5 + Math.random() * 10,
        p95: 20 + Math.random() * 30,
        p99: 50 + Math.random() * 50,
      },
    },
    realtime: {
      status: 'healthy',
      connections: Math.floor(Math.random() * 100),
      messagesPerSecond: Math.random() * 50,
      latency: Math.random() * 10,
    },
    agentRuntime: {
      status: 'healthy',
      activeAgents: Math.floor(Math.random() * 20),
      queuedTasks: Math.floor(Math.random() * 50),
      processingTasks: Math.floor(Math.random() * 30),
      avgTaskWaitTime: Math.random() * 5,
    },
    resources: {
      cpu: {
        usage: Math.random() * 60,
        cores: 8,
      },
      memory: {
        used: 4000 + Math.random() * 2000,
        total: 16000,
        usage: Math.random() * 40,
      },
      disk: {
        used: 100 + Math.random() * 50,
        total: 500,
        usage: Math.random() * 30,
      },
    },
  };
}

function generateMockAggregatedMetrics(): AggregatedMetrics {
  return {
    tasks: {
      total: 1000 + Math.floor(Math.random() * 500),
      completed: 800 + Math.floor(Math.random() * 200),
      failed: 20 + Math.floor(Math.random() * 30),
      inProgress: 30 + Math.floor(Math.random() * 50),
      queued: 10 + Math.floor(Math.random() * 40),
      completionRate: 5 + Math.random() * 10,
      successRate: 90 + Math.random() * 8,
      avgDuration: 30 + Math.random() * 60,
    },
    agents: {
      total: 10 + Math.floor(Math.random() * 10),
      active: 5 + Math.floor(Math.random() * 5),
      idle: 3 + Math.floor(Math.random() * 3),
      error: Math.floor(Math.random() * 2),
      avgTasksPerMinute: 5 + Math.random() * 5,
      avgSuccessRate: 85 + Math.random() * 10,
    },
    decisions: {
      total: 500 + Math.floor(Math.random() * 200),
      approved: 400 + Math.floor(Math.random() * 100),
      rejected: 50 + Math.floor(Math.random() * 50),
      avgConfidence: 0.8 + Math.random() * 0.15,
    },
    escalations: {
      total: 30 + Math.floor(Math.random() * 20),
      open: 5 + Math.floor(Math.random() * 10),
      resolved: 25 + Math.floor(Math.random() * 15),
      avgResolutionTime: 15 + Math.random() * 30,
    },
  };
}

// ============================================================================
// useRealtimeMetrics Hook
// ============================================================================

export function useRealtimeMetrics(
  options: UseRealtimeMetricsOptions = {}
): UseRealtimeMetricsReturn {
  const {
    enabled = true,
    refreshInterval = 5000,
    maxDataPoints = 50,
    agentIds,
  } = options;

  const [agentMetrics, setAgentMetrics] = React.useState<AgentLiveMetrics[]>([]);
  const [selectedAgent, setSelectedAgent] = React.useState<AgentLiveMetrics | null>(null);
  const [systemHealth, setSystemHealth] = React.useState<SystemHealthMetrics | null>(null);
  const [aggregated, setAggregated] = React.useState<AggregatedMetrics | null>(null);
  const [tasksPerMinuteHistory, setTasksPerMinuteHistory] = React.useState<LiveMetricPoint[]>([]);
  const [successRateHistory, setSuccessRateHistory] = React.useState<LiveMetricPoint[]>([]);
  const [agentLoadHistory, setAgentLoadHistory] = React.useState<LiveMetricPoint[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isRealtime, setIsRealtime] = React.useState(false);
  const [lastUpdateAt, setLastUpdateAt] = React.useState<Date | null>(null);
  const [subscribedAgents, setSubscribedAgents] = React.useState<Set<string>>(new Set());

  const supabase = createClient();

  // Initialize with mock data for development
  React.useEffect(() => {
    if (!enabled) return;

    // Initial mock data
    const mockAgents = [
      generateMockAgentMetrics('agent-1', 'Data Processor'),
      generateMockAgentMetrics('agent-2', 'Content Analyzer'),
      generateMockAgentMetrics('agent-3', 'Task Router'),
      generateMockAgentMetrics('agent-4', 'Notification Agent'),
      generateMockAgentMetrics('agent-5', 'Report Generator'),
    ];

    setAgentMetrics(mockAgents);
    setSystemHealth(generateMockSystemHealth());
    setAggregated(generateMockAggregatedMetrics());
    setLastUpdateAt(new Date());

    // Generate initial history
    const now = Date.now();
    const initialHistory: LiveMetricPoint[] = Array.from({ length: maxDataPoints }, (_, i) => ({
      timestamp: now - (maxDataPoints - i) * 1000,
      value: 5 + Math.random() * 10,
    }));

    setTasksPerMinuteHistory(initialHistory);
    setSuccessRateHistory(initialHistory.map(p => ({ ...p, value: 85 + Math.random() * 10 })));
    setAgentLoadHistory(initialHistory.map(p => ({ ...p, value: Math.random() * 100 })));
  }, [enabled, maxDataPoints]);

  // Fallback polling for metrics updates
  React.useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // Update agent metrics
      setAgentMetrics(prev =>
        prev.map(agent => ({
          ...agent,
          tasksPerMinute: Math.max(0, agent.tasksPerMinute + (Math.random() - 0.5) * 2),
          successRate: Math.min(100, Math.max(0, agent.successRate + (Math.random() - 0.5) * 2)),
          currentLoad: Math.min(100, Math.max(0, agent.currentLoad + (Math.random() - 0.5) * 10)),
          avgResponseTime: Math.max(50, agent.avgResponseTime + (Math.random() - 0.5) * 50),
          lastActivityAt: new Date().toISOString(),
        }))
      );

      // Update system health
      setSystemHealth(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          uptime: prev.uptime + refreshInterval / 1000,
          database: {
            ...prev.database,
            responseTime: Math.max(1, prev.database.responseTime + (Math.random() - 0.5) * 5),
          },
          realtime: {
            ...prev.realtime,
            messagesPerSecond: Math.max(0, prev.realtime.messagesPerSecond + (Math.random() - 0.5) * 10),
          },
        };
      });

      // Update aggregated metrics
      setAggregated(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            completionRate: Math.max(0, prev.tasks.completionRate + (Math.random() - 0.5) * 0.5),
          },
        };
      });

      // Update history
      setTasksPerMinuteHistory(prev => {
        const newPoint: LiveMetricPoint = {
          timestamp: now,
          value: 5 + Math.random() * 10,
        };
        return [...prev.slice(-maxDataPoints + 1), newPoint];
      });

      setSuccessRateHistory(prev => {
        const newPoint: LiveMetricPoint = {
          timestamp: now,
          value: 85 + Math.random() * 10,
        };
        return [...prev.slice(-maxDataPoints + 1), newPoint];
      });

      setAgentLoadHistory(prev => {
        const newPoint: LiveMetricPoint = {
          timestamp: now,
          value: Math.random() * 100,
        };
        return [...prev.slice(-maxDataPoints + 1), newPoint];
      });

      setLastUpdateAt(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [enabled, refreshInterval, maxDataPoints]);

  // Supabase Realtime subscription
  React.useEffect(() => {
    if (!enabled) return;

    // Subscribe to metrics channel
    const channel = supabase
      .channel('metrics')
      .on(
        'broadcast',
        { event: 'metrics.update' },
        (payload) => {
          // Handle realtime metrics updates
          if (payload.payload?.agentMetrics) {
            setAgentMetrics(payload.payload.agentMetrics);
          }
          if (payload.payload?.systemHealth) {
            setSystemHealth(payload.payload.systemHealth);
          }
          if (payload.payload?.aggregated) {
            setAggregated(payload.payload.aggregated);
          }
          setLastUpdateAt(new Date());
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        setIsRealtime(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
    };
  }, [enabled, supabase]);

  // Refresh function
  const refresh = React.useCallback(() => {
    setSystemHealth(generateMockSystemHealth());
    setAggregated(generateMockAggregatedMetrics());
    setLastUpdateAt(new Date());
  }, []);

  // Subscribe to specific agent
  const subscribeToAgent = React.useCallback((agentId: string) => {
    setSubscribedAgents(prev => new Set(prev).add(agentId));
  }, []);

  // Unsubscribe from specific agent
  const unsubscribeFromAgent = React.useCallback((agentId: string) => {
    setSubscribedAgents(prev => {
      const next = new Set(prev);
      next.delete(agentId);
      return next;
    });
  }, []);

  return {
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
    subscribeToAgent,
    unsubscribeFromAgent,
  };
}
