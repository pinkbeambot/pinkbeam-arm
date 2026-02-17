import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useAgentPerformance,
  useTaskPipeline,
  useDecisionAnalytics,
  useCostAnalytics,
  useActivityTimeline,
  analyticsKeys,
} from '../useAnalytics';
import type { DateRange } from '@/types/analytics';

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

const mockDateRange: DateRange = {
  from: new Date('2024-01-01'),
  to: new Date('2024-01-31'),
};

describe('Analytics Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAgentPerformance', () => {
    it('fetches agent performance data', async () => {
      const mockData = {
        data: [
          { agentId: '1', agentName: 'Agent 1', tasksCompleted: 10, successRate: 90 },
        ],
        summary: { totalAgents: 1, totalTasksCompleted: 10 },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const { result } = renderHook(
        () => useAgentPerformance(mockDateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/agents?')
      );
    });

    it('includes agentIds in query when provided', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { data: [], summary: {} } }),
      });

      renderHook(
        () => useAgentPerformance(mockDateRange, { agentIds: ['1', '2'] }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callUrl).toContain('agentIds=1%2C2');
    });
  });

  describe('useTaskPipeline', () => {
    it('fetches task pipeline data', async () => {
      const mockData = {
        stages: [],
        statusBreakdown: [],
        summary: { totalTasks: 100 },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const { result } = renderHook(
        () => useTaskPipeline(mockDateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useDecisionAnalytics', () => {
    it('fetches decision analytics data', async () => {
      const mockData = {
        categories: [],
        trends: [],
        summary: { totalDecisions: 50 },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const { result } = renderHook(
        () => useDecisionAnalytics(mockDateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useCostAnalytics', () => {
    it('fetches cost analytics data', async () => {
      const mockData = {
        trends: [],
        breakdown: [],
        byAgent: [],
        summary: { totalCost: 100 },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const { result } = renderHook(
        () => useCostAnalytics(mockDateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useActivityTimeline', () => {
    it('fetches activity timeline data', async () => {
      const mockData = {
        activities: [],
        summary: { totalEvents: 0 },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const { result } = renderHook(
        () => useActivityTimeline(mockDateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
    });

    it('includes pagination params', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { activities: [], summary: {} } }),
      });

      renderHook(
        () => useActivityTimeline(mockDateRange, {}, { limit: 25, offset: 50 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callUrl).toContain('limit=25');
      expect(callUrl).toContain('offset=50');
    });
  });

  describe('analyticsKeys', () => {
    it('generates correct query keys', () => {
      const params = {
        from: '2024-01-01',
        to: '2024-01-31',
      };

      expect(analyticsKeys.all).toEqual(['analytics']);
      expect(analyticsKeys.agents(params)).toEqual(['analytics', 'agents', params]);
      expect(analyticsKeys.tasks(params)).toEqual(['analytics', 'tasks', params]);
    });
  });
});
