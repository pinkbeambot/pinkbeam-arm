'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface AgentAnalyticsData {
  agent: {
    id: string;
    name: string;
    avatarUrl?: string;
    role: string;
    status: string;
    description?: string;
    createdAt: string;
    llmConfig?: {
      provider: string;
      model: string;
      temperature: number;
      max_tokens: number;
    };
    limits?: {
      max_sub_agents: number;
      escalation_threshold: number;
      timeout_seconds: number;
      max_tokens_per_task: number;
      max_cost_per_task_usd: number;
    };
  };
  summary: {
    totalTasksCompleted: number;
    totalTasksFailed: number;
    totalTasksCreated: number;
    successRate: number;
    avgTaskDuration: number;
    totalCost: number;
    totalEscalations: number;
    totalDecisions: number;
    totalOverridden: number;
    overrideRate: number;
    avgConfidence: number;
  };
  taskTypeBreakdown: Array<{
    type: string;
    count: number;
    completed: number;
    failed: number;
    cost: number;
    successRate: number;
  }>;
  workloadDistribution: Array<{
    hour: number;
    tasks: number;
  }>;
  dailyTrend: Array<{
    date: string;
    tasksCompleted: number;
    tasksFailed: number;
    successRate: number;
    cost: number;
    escalations: number;
    avgDuration: number;
    confidence: number;
  }>;
  decisionConfidenceTrend: Array<{
    date: string;
    confidence: number;
  }>;
  escalationResolutionTrend: Array<{
    date: string;
    resolutionTime: number;
  }>;
  recentTasks: Array<{
    type: string;
    status: string;
    createdAt: string;
    cost?: number;
  }>;
  period: {
    days: number;
  };
}

export interface UseAgentAnalyticsOptions {
  agentId?: string;
  days?: number;
  enabled?: boolean;
}

export interface UseAgentAnalyticsReturn {
  data: AgentAnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// useAgentAnalytics Hook
// ============================================================================

export function useAgentAnalytics(
  options: UseAgentAnalyticsOptions = {}
): UseAgentAnalyticsReturn {
  const { agentId, days = 30, enabled = true } = options;

  const [data, setData] = React.useState<AgentAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchAnalytics = React.useCallback(async () => {
    if (!agentId) return;

    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `/api/v1/analytics/agents/${agentId}?days=${days}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch analytics: ${response.statusText}`
        );
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [agentId, days]);

  // Initial fetch
  React.useEffect(() => {
    if (enabled && agentId) {
      fetchAnalytics();
    }
  }, [enabled, agentId, fetchAnalytics]);

  const refetch = React.useCallback(() => {
    if (agentId) {
      fetchAnalytics();
    }
  }, [agentId, fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

export default useAgentAnalytics;
