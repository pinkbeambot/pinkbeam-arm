/**
 * Analytics Hooks Tests
 * Unit tests for the analytics hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePerformanceData, useOverviewMetrics, useLeaderboard, useBottlenecks, useROIMetrics } from '@/lib/hooks/use-analytics';
import type { DateRange } from '@/components/dashboard/performance/types';

// Mock the analytics service
vi.mock('@/lib/analytics', () => ({
  analyticsService: {
    fetchPerformanceData: vi.fn(),
    fetchOverviewMetrics: vi.fn(),
    fetchLeaderboard: vi.fn(),
    fetchBottlenecks: vi.fn(),
    fetchROIMetrics: vi.fn(),
  },
}));

import { analyticsService } from '@/lib/analytics';

const mockFetchPerformanceData = analyticsService.fetchPerformanceData ;
const mockFetchOverviewMetrics = analyticsService.fetchOverviewMetrics ;
const mockFetchLeaderboard = analyticsService.fetchLeaderboard ;
const mockFetchBottlenecks = analyticsService.fetchBottlenecks ;
const mockFetchROIMetrics = analyticsService.fetchROIMetrics ;

describe('useAnalytics hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePerformanceData', () => {
    it('should fetch performance data on mount', async () => {
      const mockData = {
        dateRange: '30d' as DateRange,
        metrics: {
          tasksCompleted: { title: 'Tasks', value: 100, change: 10, changeLabel: 'vs last', trend: [], format: 'number' as const },
          activeAgents: { title: 'Agents', value: 5, change: 0, changeLabel: 'vs last', trend: [], format: 'number' as const },
          avgCompletionTime: { title: 'Time', value: 10, change: -5, changeLabel: 'vs last', trend: [], format: 'time' as const },
          successRate: { title: 'Success', value: 95, change: 2, changeLabel: 'vs last', trend: [], format: 'percentage' as const },
          totalEscalations: { title: 'Escalations', value: 3, change: -10, changeLabel: 'vs last', trend: [], format: 'number' as const },
          totalCost: { title: 'Cost', value: 50, change: -5, changeLabel: 'vs last', trend: [], format: 'currency' as const },
        },
        agentLeaderboard: [],
        roi: {
          totalTasksCompleted: 1000,
          totalCost: 100,
          estimatedHumanHoursSaved: 50,
          humanHourlyRate: 50,
          estimatedValueGenerated: 2500,
          roiPercentage: 2400,
          costPerTask: 0.1,
          tasksPerDollar: 10,
          projectedMonthlyCost: 300,
          projectedAnnualCost: 3650,
        },
        bottlenecks: [],
        taskStageMetrics: [],
        hourlyDistribution: [],
      };

      mockFetchPerformanceData.mockResolvedValueOnce(mockData);

      const { result } = renderHook(() => usePerformanceData('30d' as DateRange));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors', async () => {
      mockFetchPerformanceData.mockRejectedValueOnce(new Error('Failed to fetch'));

      const { result } = renderHook(() => usePerformanceData('30d' as DateRange));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch');
    });

    it('should refetch when called', async () => {
      const mockData = {
        dateRange: '30d' as DateRange,
        metrics: {
          tasksCompleted: { title: 'Tasks', value: 100, change: 10, changeLabel: 'vs last', trend: [], format: 'number' as const },
          activeAgents: { title: 'Agents', value: 5, change: 0, changeLabel: 'vs last', trend: [], format: 'number' as const },
          avgCompletionTime: { title: 'Time', value: 10, change: -5, changeLabel: 'vs last', trend: [], format: 'time' as const },
          successRate: { title: 'Success', value: 95, change: 2, changeLabel: 'vs last', trend: [], format: 'percentage' as const },
          totalEscalations: { title: 'Escalations', value: 3, change: -10, changeLabel: 'vs last', trend: [], format: 'number' as const },
          totalCost: { title: 'Cost', value: 50, change: -5, changeLabel: 'vs last', trend: [], format: 'currency' as const },
        },
        agentLeaderboard: [],
        roi: {
          totalTasksCompleted: 1000,
          totalCost: 100,
          estimatedHumanHoursSaved: 50,
          humanHourlyRate: 50,
          estimatedValueGenerated: 2500,
          roiPercentage: 2400,
          costPerTask: 0.1,
          tasksPerDollar: 10,
          projectedMonthlyCost: 300,
          projectedAnnualCost: 3650,
        },
        bottlenecks: [],
        taskStageMetrics: [],
        hourlyDistribution: [],
      };

      mockFetchPerformanceData.mockResolvedValue(mockData);

      const { result } = renderHook(() => usePerformanceData('30d' as DateRange));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchPerformanceData).toHaveBeenCalledTimes(1);

      await result.current.refetch();

      expect(mockFetchPerformanceData).toHaveBeenCalledTimes(2);
    });

    it('should refetch when dateRange changes', async () => {
      const mockData = {
        dateRange: '7d' as DateRange,
        metrics: {
          tasksCompleted: { title: 'Tasks', value: 50, change: 5, changeLabel: 'vs last', trend: [], format: 'number' as const },
          activeAgents: { title: 'Agents', value: 5, change: 0, changeLabel: 'vs last', trend: [], format: 'number' as const },
          avgCompletionTime: { title: 'Time', value: 10, change: -5, changeLabel: 'vs last', trend: [], format: 'time' as const },
          successRate: { title: 'Success', value: 95, change: 2, changeLabel: 'vs last', trend: [], format: 'percentage' as const },
          totalEscalations: { title: 'Escalations', value: 3, change: -10, changeLabel: 'vs last', trend: [], format: 'number' as const },
          totalCost: { title: 'Cost', value: 50, change: -5, changeLabel: 'vs last', trend: [], format: 'currency' as const },
        },
        agentLeaderboard: [],
        roi: {
          totalTasksCompleted: 500,
          totalCost: 50,
          estimatedHumanHoursSaved: 25,
          humanHourlyRate: 50,
          estimatedValueGenerated: 1250,
          roiPercentage: 2400,
          costPerTask: 0.1,
          tasksPerDollar: 10,
          projectedMonthlyCost: 300,
          projectedAnnualCost: 3650,
        },
        bottlenecks: [],
        taskStageMetrics: [],
        hourlyDistribution: [],
      };

      mockFetchPerformanceData.mockResolvedValue(mockData);

      const { result, rerender } = renderHook(
        ({ dateRange }) => usePerformanceData(dateRange),
        { initialProps: { dateRange: '30d' as DateRange } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchPerformanceData).toHaveBeenCalledWith('30d');

      rerender({ dateRange: '7d' as DateRange });

      await waitFor(() => {
        expect(mockFetchPerformanceData).toHaveBeenCalledWith('7d');
      });
    });
  });

  describe('useOverviewMetrics', () => {
    it('should fetch overview metrics', async () => {
      const mockData = {
        summary: {
          tasksCompleted: { value: 100, trend: 10, trendDirection: 'up' as const },
          tasksCreated: { value: 120, trend: 5, trendDirection: 'up' as const },
          successRate: { value: 95, trend: 2, trendDirection: 'up' as const },
          activeAgents: { value: 5, trend: 0, trendDirection: 'up' as const },
          totalCost: { value: 50, trend: -5, trendDirection: 'down' as const },
          openEscalations: { value: 3, trend: -10, trendDirection: 'down' as const },
        },
        dailyBreakdown: [],
        avgTaskDuration: 120,
      };

      mockFetchOverviewMetrics.mockResolvedValueOnce({
        summary: mockData.summary,
        dailyBreakdown: [],
        avgTaskDuration: 120,
        period: { days: 30, startDate: '', endDate: '' },
      });

      const { result } = renderHook(() => useOverviewMetrics('30d' as DateRange));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.tasksCompleted.value).toBe(100);
    });
  });

  describe('useLeaderboard', () => {
    it('should fetch leaderboard', async () => {
      const mockData = {
        leaderboard: [
          {
            rank: 1,
            medal: 'gold',
            agentId: 'agent-1',
            name: 'Test Agent',
            role: 'worker',
            status: 'active',
            tasksCompleted: 100,
            tasksFailed: 5,
            successRate: 95,
            avgTaskDuration: 60,
            totalCost: 10,
            escalationCount: 2,
            overrideRate: 1,
            trendDirection: 'improving',
          },
        ],
        period: { days: 30 },
        sortBy: 'tasksCompleted',
        generatedAt: '',
      };

      mockFetchLeaderboard.mockResolvedValueOnce(mockData);

      const { result } = renderHook(() => useLeaderboard('30d' as DateRange));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.leaderboard).toHaveLength(1);
      expect(mockFetchLeaderboard).toHaveBeenCalledWith('30d', 'tasksCompleted', 20);
    });
  });

  describe('useBottlenecks', () => {
    it('should fetch bottlenecks', async () => {
      const mockData = {
        bottlenecks: [],
        pipelineSnapshot: { queued: 5, in_progress: 10, blocked: 0, review: 2 },
        timeInStage: {
          queued: { avgTime: 300 },
          in_progress: { avgTime: 1200 },
          blocked: { avgTime: 0 },
          review: { avgTime: 600 },
        },
        summary: {
          totalBottlenecks: 0,
          highSeverityCount: 0,
          totalBlockedTasks: 0,
          avgWaitTime: 0,
        },
        tasksWaitingLongest: [],
        agentWorkload: [],
        dependencyDelays: [],
        recommendations: [],
        period: { hours: 24 },
        generatedAt: '',
      };

      mockFetchBottlenecks.mockResolvedValueOnce(mockData);

      const { result } = renderHook(() => useBottlenecks(24));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.pipelineSnapshot.queued).toBe(5);
      expect(mockFetchBottlenecks).toHaveBeenCalledWith(24);
    });
  });

  describe('useROIMetrics', () => {
    it('should fetch ROI metrics', async () => {
      const mockData = {
        summary: {
          totalTasksCompleted: 1000,
          totalCost: 100,
          costPerTask: 0.1,
          tasksPerDollar: 10,
          estimatedHoursSaved: 50,
          estimatedValueGenerated: 2500,
          roiPercentage: 2400,
        },
        trends: {
          cost: 5,
          tasksCompleted: 10,
          roi: 15,
        },
        agentCostBreakdown: [],
        taskTypeBreakdown: [],
        dailyTrend: [],
        projections: {
          monthlyCost: 300,
          annualCost: 3650,
          monthlyValue: 7500,
          annualValue: 91250,
        },
        comparison: {
          vsHumanLabor: {
            humanCost: 2500,
            aiCost: 100,
            savings: 2400,
          },
        },
        assumptions: {
          avgHumanCostPerHour: 50,
          periodDays: 30,
        },
      };

      mockFetchROIMetrics.mockResolvedValueOnce(mockData);

      const { result } = renderHook(() => useROIMetrics('30d' as DateRange));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.summary.roiPercentage).toBe(2400);
      expect(mockFetchROIMetrics).toHaveBeenCalledWith('30d', 50);
    });

    it('should use custom hourly rate', async () => {
      mockFetchROIMetrics.mockResolvedValueOnce({
        summary: {
          totalTasksCompleted: 1000,
          totalCost: 100,
          costPerTask: 0.1,
          tasksPerDollar: 10,
          estimatedHoursSaved: 50,
          estimatedValueGenerated: 3750,
          roiPercentage: 3650,
        },
        trends: {},
        agentCostBreakdown: [],
        taskTypeBreakdown: [],
        dailyTrend: [],
        projections: {},
        comparison: {},
        assumptions: {},
      });

      renderHook(() => useROIMetrics('30d' as DateRange, 75));

      await waitFor(() => {
        expect(mockFetchROIMetrics).toHaveBeenCalledWith('30d', 75);
      });
    });
  });
});
