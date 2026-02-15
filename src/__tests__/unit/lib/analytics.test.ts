/**
 * Analytics Service Tests
 * Unit tests for the analytics service
 */

import { describe, it, expect } from 'vitest';
import { analyticsService, fetchPerformanceData } from '@/lib/analytics';
import type { DateRange } from '@/components/dashboard/performance/types';

const TEST_TOKEN = 'test-token';

describe('analyticsService', () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('fetchOverviewMetrics', () => {
    it('should fetch overview metrics successfully', async () => {
      const mockResponse = {
        data: {
          summary: {
            tasksCompleted: { value: 100, trend: 10, trendDirection: 'up' as const },
            tasksCreated: { value: 120, trend: 5, trendDirection: 'up' as const },
            successRate: { value: 95, trend: 2, trendDirection: 'up' as const },
            activeAgents: { value: 5, trend: 0, trendDirection: 'up' as const },
            totalCost: { value: 50, trend: -5, trendDirection: 'down' as const },
            openEscalations: { value: 3, trend: -10, trendDirection: 'down' as const },
          },
          dailyBreakdown: [
            { date: '2024-01-01', tasksCompleted: 10, tasksCreated: 12, cost: 5 },
          ],
          avgTaskDuration: 120,
          period: { days: 30, startDate: '2024-01-01', endDate: '2024-01-30' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await analyticsService.fetchOverviewMetrics('30d' as DateRange, TEST_TOKEN);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/overview?days=30',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result.summary.tasksCompleted.value).toBe(100);
    });

    it('should throw error on failed fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      await expect(analyticsService.fetchOverviewMetrics('30d' as DateRange, TEST_TOKEN)).rejects.toThrow('Server error');
    });
  });

  describe('fetchLeaderboard', () => {
    it('should fetch leaderboard successfully', async () => {
      const mockResponse = {
        data: {
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
          generatedAt: '2024-01-30T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await analyticsService.fetchLeaderboard('30d' as DateRange, 'tasksCompleted', 20, TEST_TOKEN);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/leaderboard?days=30&sortBy=tasksCompleted&limit=20',
        expect.any(Object)
      );
      expect(result.leaderboard[0].name).toBe('Test Agent');
    });
  });

  describe('fetchBottlenecks', () => {
    it('should fetch bottlenecks successfully', async () => {
      const mockResponse = {
        data: {
          summary: {
            totalBottlenecks: 2,
            highSeverityCount: 1,
            totalBlockedTasks: 10,
            avgWaitTime: 3600,
          },
          bottlenecks: [
            {
              type: 'blocked_tasks',
              description: 'Tasks stuck in blocked state',
              affectedCount: 10,
              avgWaitTimeSeconds: 3600,
              severity: 'high' as const,
              recommendation: 'Review task dependencies',
            },
          ],
          pipelineSnapshot: {
            queued: 5,
            in_progress: 10,
            blocked: 3,
            review: 2,
          },
          timeInStage: {
            queued: { count: 5, avgTime: 300, maxTime: 600 },
            in_progress: { count: 10, avgTime: 1200, maxTime: 3600 },
            blocked: { count: 3, avgTime: 7200, maxTime: 14400 },
            review: { count: 2, avgTime: 600, maxTime: 1200 },
          },
          tasksWaitingLongest: [],
          agentWorkload: [],
          dependencyDelays: [],
          recommendations: [],
          period: { hours: 24 },
          generatedAt: '2024-01-30T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await analyticsService.fetchBottlenecks(24, TEST_TOKEN);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/bottlenecks?hours=24',
        expect.any(Object)
      );
      expect(result.bottlenecks[0].severity).toBe('high');
    });
  });

  describe('fetchROIMetrics', () => {
    it('should fetch ROI metrics successfully', async () => {
      const mockResponse = {
        data: {
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
            costPerTask: -2,
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
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await analyticsService.fetchROIMetrics('30d' as DateRange, 50, TEST_TOKEN);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/roi?days=30&hourlyRate=50',
        expect.any(Object)
      );
      expect(result.summary.roiPercentage).toBe(2400);
    });
  });

  describe('fetchPerformanceData', () => {
    it('should aggregate all performance data', async () => {
      const mockOverview = {
        data: {
          summary: {
            tasksCompleted: { value: 100, trend: 10, trendDirection: 'up' as const },
            tasksCreated: { value: 120, trend: 5, trendDirection: 'up' as const },
            successRate: { value: 95, trend: 2, trendDirection: 'up' as const },
            activeAgents: { value: 5, trend: 0, trendDirection: 'up' as const },
            totalCost: { value: 50, trend: -5, trendDirection: 'down' as const },
            openEscalations: { value: 3, trend: -10, trendDirection: 'down' as const },
          },
          dailyBreakdown: [
            { date: '2024-01-01', tasksCompleted: 10, tasksCreated: 12, cost: 5 },
            { date: '2024-01-02', tasksCompleted: 15, tasksCreated: 18, cost: 7 },
          ],
          avgTaskDuration: 120,
          period: { days: 30, startDate: '2024-01-01', endDate: '2024-01-30' },
        },
      };

      const mockLeaderboard = {
        data: {
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
          generatedAt: '2024-01-30T00:00:00Z',
        },
      };

      const mockBottlenecks = {
        data: {
          summary: {
            totalBottlenecks: 0,
            highSeverityCount: 0,
            totalBlockedTasks: 0,
            avgWaitTime: 0,
          },
          bottlenecks: [],
          pipelineSnapshot: {
            queued: 5,
            in_progress: 10,
            blocked: 0,
            review: 2,
          },
          timeInStage: {
            queued: { count: 5, avgTime: 300, maxTime: 600 },
            in_progress: { count: 10, avgTime: 1200, maxTime: 3600 },
            blocked: { count: 0, avgTime: 0, maxTime: 0 },
            review: { count: 2, avgTime: 600, maxTime: 1200 },
          },
          tasksWaitingLongest: [],
          agentWorkload: [],
          dependencyDelays: [],
          recommendations: [],
          period: { hours: 24 },
          generatedAt: '2024-01-30T00:00:00Z',
        },
      };

      const mockROI = {
        data: {
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
            costPerTask: -2,
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
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockOverview })
        .mockResolvedValueOnce({ ok: true, json: async () => mockLeaderboard })
        .mockResolvedValueOnce({ ok: true, json: async () => mockBottlenecks })
        .mockResolvedValueOnce({ ok: true, json: async () => mockROI });

      const result = await fetchPerformanceData('30d' as DateRange, TEST_TOKEN);

      expect(result.dateRange).toBe('30d');
      expect(result.metrics.tasksCompleted.value).toBe(100);
      expect(result.agentLeaderboard).toHaveLength(1);
      expect(result.roi.totalTasksCompleted).toBe(1000);
      expect(result.taskStageMetrics).toHaveLength(4);
    });
  });
});
