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

<<<<<<< HEAD
  const supabase = createClient();
=======
  // ============================================================================
  // Data Fetching Functions
  // ============================================================================

  const fetchMetricsSnapshot = React.useCallback(async () => {
    try {
      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .order('last_active_at', { ascending: false });

      if (agentsError) throw agentsError;

      // Fetch tasks stats
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('status');

      if (tasksError) throw tasksError;

      // Fetch recent activities for calculating rates
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Process agent metrics
      const agents: AgentLiveMetrics[] = (agentsData || []).map((agent: Agent) => {
        const agentActivities = (activitiesData || []).filter(
          (a: Activity) => a.agent_id === agent.id
        );
        
        const completedTasks = agentActivities.filter(
          (a: Activity) => a.type === 'task_completed'
        ).length;
        
        const failedTasks = agentActivities.filter(
          (a: Activity) => a.type === 'task_failed'
        ).length;
        
        const totalTasks = completedTasks + failedTasks;
        const tasksPerMinute = totalTasks / 5; // per 5 minute window
        const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;

        return {
          agentId: agent.id,
          agentName: agent.name,
          status: agent.status,
          tasksPerMinute,
          successRate,
          currentLoad: agent.current_task_id ? Math.random() * 40 + 40 : Math.random() * 20, // Simulated load
          avgResponseTime: Math.random() * 500 + 100, // Simulated
          errorRate: successRate > 0 ? 100 - successRate : 0,
          lastActivityAt: agent.last_active_at || agent.updated_at,
          cpuUsage: Math.random() * 30 + 10,
          memoryUsage: Math.random() * 40 + 20,
        };
      });

      // Filter by agentIds if specified
      const filteredAgents = agentIds 
        ? agents.filter(a => agentIds.includes(a.agentId))
        : agents;

      // Calculate aggregated metrics
      const completedCount = (activitiesData || []).filter(
        (a: Activity) => a.type === 'task_completed'
      ).length;
      
      const failedCount = (activitiesData || []).filter(
        (a: Activity) => a.type === 'task_failed'
      ).length;
      
      const totalCount = completedCount + failedCount;

      const aggregatedData: AggregatedMetrics = {
        tasks: {
          total: totalCount,
          completed: completedCount,
          failed: failedCount,
          inProgress: filteredAgents.filter(a => a.currentLoad > 50).length,
          queued: Math.floor(Math.random() * 10), // Simulated
          completionRate: totalCount / 5, // per 5 minutes
          successRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 100,
          avgDuration: Math.random() * 120 + 30, // Simulated
        },
        agents: {
          total: filteredAgents.length,
          active: filteredAgents.filter(a => a.status === 'active').length,
          idle: filteredAgents.filter(a => a.status === 'idle').length,
          error: filteredAgents.filter(a => a.status === 'error').length,
          avgTasksPerMinute: filteredAgents.reduce((acc, a) => acc + a.tasksPerMinute, 0) / (filteredAgents.length || 1),
          avgSuccessRate: filteredAgents.reduce((acc, a) => acc + a.successRate, 0) / (filteredAgents.length || 1),
        },
        decisions: {
          total: (activitiesData || []).filter((a: Activity) => a.type === 'decision_made').length,
          approved: 0, // Would need decisions table
          rejected: 0,
          avgConfidence: 85, // Simulated
        },
        escalations: {
          total: (activitiesData || []).filter(
            (a: Activity) => a.type === 'escalation_raised' || a.type === 'escalation_created'
          ).length,
          open: 0, // Would need escalations table
          resolved: 0,
          avgResolutionTime: 0,
        },
      };

      // Calculate system health
      const avgResponseTime = filteredAgents.reduce((acc, a) => acc + a.avgResponseTime, 0) / (filteredAgents.length || 1);
      const systemStatus: SystemHealthMetrics = {
        status: avgResponseTime < 500 ? 'healthy' : avgResponseTime < 1000 ? 'degraded' : 'critical',
        uptime: Date.now() / 1000, // Simulated
        database: {
          status: 'healthy',
          responseTime: Math.random() * 50 + 10,
          connectionPool: { used: 5, total: 100, utilization: 5 },
          queryLatency: { p50: 10, p95: 25, p99: 50 },
        },
        realtime: {
          status: isRealtime ? 'healthy' : 'degraded',
          connections: filteredAgents.length,
          messagesPerSecond: Math.random() * 10,
          latency: Math.random() * 100,
        },
        agentRuntime: {
          status: filteredAgents.some(a => a.status === 'error') ? 'degraded' : 'healthy',
          activeAgents: filteredAgents.filter(a => a.status === 'active').length,
          queuedTasks: aggregatedData.tasks.queued,
          processingTasks: aggregatedData.tasks.inProgress,
          avgTaskWaitTime: Math.random() * 30,
        },
        resources: {
          cpu: { usage: Math.random() * 30 + 20, cores: 8 },
          memory: { used: 4096, total: 16384, usage: 25 },
          disk: { used: 100, total: 500, usage: 20 },
        },
      };

      // Update state
      setAgentMetrics(filteredAgents);
      setSystemHealth(systemStatus);
      setAggregated(aggregatedData);
      setLastUpdateAt(new Date());

      // Update chart history
      const now = Date.now();
      const newPoint: LiveMetricPoint = { timestamp: now, value: aggregatedData.tasks.completionRate };
      const newSuccessPoint: LiveMetricPoint = { timestamp: now, value: aggregatedData.tasks.successRate };
      const newLoadPoint: LiveMetricPoint = { 
        timestamp: now, 
        value: aggregatedData.agents.avgTasksPerMinute 
      };

      setTasksPerMinuteHistory(prev => [...prev.slice(-maxDataPoints + 1), newPoint]);
      setSuccessRateHistory(prev => [...prev.slice(-maxDataPoints + 1), newSuccessPoint]);
      setAgentLoadHistory(prev => [...prev.slice(-maxDataPoints + 1), newLoadPoint]);

    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  }, [supabase, agentIds, maxDataPoints, isRealtime]);

  // ============================================================================
  // Realtime Subscription
  // ============================================================================
>>>>>>> eng-be/task-25-edge-functions

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
