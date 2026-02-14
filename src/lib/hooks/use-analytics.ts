/**
 * Analytics Hooks
 * React hooks for fetching analytics data with loading and error states
 */

import * as React from 'react';
import type { PerformanceDashboardData, DateRange } from '@/components/dashboard/performance/types';
import { analyticsService } from '@/lib/analytics';

interface UseAnalyticsResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface OverviewData {
  tasksCompleted: { value: number; trend: number; trendDirection: 'up' | 'down' };
  tasksCreated: { value: number; trend: number; trendDirection: 'up' | 'down' };
  successRate: { value: number; trend: number; trendDirection: 'up' | 'down' };
  activeAgents: { value: number; trend: number; trendDirection: 'up' | 'down' };
  totalCost: { value: number; trend: number; trendDirection: 'up' | 'down' };
  openEscalations: { value: number; trend: number; trendDirection: 'up' | 'down' };
  avgTaskDuration: number;
  dailyBreakdown: Array<{
    date: string;
    tasksCompleted: number;
    tasksCreated: number;
    cost: number;
  }>;
}

interface LeaderboardData {
  leaderboard: Array<{
    rank: number;
    medal: string | null;
    agentId: string;
    name: string;
    avatarUrl?: string;
    role: string;
    status: string;
    tasksCompleted: number;
    tasksFailed: number;
    successRate: number;
    avgTaskDuration: number;
    totalCost: number;
    escalationCount: number;
    overrideRate: number;
    trendDirection: string;
  }>;
}

interface BottlenecksData {
  bottlenecks: Array<{
    type: string;
    description: string;
    affectedCount: number;
    avgWaitTimeSeconds: number;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  pipelineSnapshot: {
    queued: number;
    in_progress: number;
    blocked: number;
    review: number;
  };
  timeInStage: {
    queued: { avgTime: number };
    in_progress: { avgTime: number };
    blocked: { avgTime: number };
    review: { avgTime: number };
  };
}

interface ROIData {
  summary: {
    totalTasksCompleted: number;
    totalCost: number;
    costPerTask: number;
    tasksPerDollar: number;
    estimatedHoursSaved: number;
    estimatedValueGenerated: number;
    roiPercentage: number;
  };
  trends: {
    cost: number;
    tasksCompleted: number;
    roi: number;
  };
  agentCostBreakdown: Array<{
    agentId: string;
    name: string;
    role: string;
    totalCost: number;
    tasksCompleted: number;
    costPerTask: number;
  }>;
  projections: {
    monthlyCost: number;
    annualCost: number;
    monthlyValue: number;
    annualValue: number;
  };
  comparison: {
    vsHumanLabor: {
      humanCost: number;
      aiCost: number;
      savings: number;
    };
  };
}

/**
 * Hook for fetching complete performance dashboard data
 */
export function usePerformanceData(dateRange: DateRange): UseAnalyticsResult<PerformanceDashboardData> {
  const [data, setData] = React.useState<PerformanceDashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await analyticsService.fetchPerformanceData(dateRange);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook for fetching overview metrics only
 */
export function useOverviewMetrics(dateRange: DateRange): UseAnalyticsResult<OverviewData> {
  const [data, setData] = React.useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await analyticsService.fetchOverviewMetrics(dateRange);
      setData({
        tasksCompleted: result.summary.tasksCompleted,
        tasksCreated: result.summary.tasksCreated,
        successRate: result.summary.successRate,
        activeAgents: result.summary.activeAgents,
        totalCost: result.summary.totalCost,
        openEscalations: result.summary.openEscalations,
        avgTaskDuration: result.avgTaskDuration,
        dailyBreakdown: result.dailyBreakdown,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook for fetching agent leaderboard
 */
export function useLeaderboard(dateRange: DateRange, sortBy: string = 'tasksCompleted', limit: number = 20): UseAnalyticsResult<LeaderboardData> {
  const [data, setData] = React.useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await analyticsService.fetchLeaderboard(dateRange, sortBy, limit);
      setData({ leaderboard: result.leaderboard });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, sortBy, limit]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook for fetching bottleneck data
 */
export function useBottlenecks(hours: number = 24): UseAnalyticsResult<BottlenecksData> {
  const [data, setData] = React.useState<BottlenecksData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await analyticsService.fetchBottlenecks(hours);
      setData({
        bottlenecks: result.bottlenecks,
        pipelineSnapshot: result.pipelineSnapshot,
        timeInStage: result.timeInStage,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [hours]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook for fetching ROI metrics
 */
export function useROIMetrics(dateRange: DateRange, hourlyRate: number = 50): UseAnalyticsResult<ROIData> {
  const [data, setData] = React.useState<ROIData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await analyticsService.fetchROIMetrics(dateRange, hourlyRate);
      setData({
        summary: result.summary,
        trends: result.trends,
        agentCostBreakdown: result.agentCostBreakdown,
        projections: result.projections,
        comparison: result.comparison,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, hourlyRate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// Re-export types
export type { UseAnalyticsResult, OverviewData, LeaderboardData, BottlenecksData, ROIData };
