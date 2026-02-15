/**
 * useAgentAnalytics Hook Tests
 * 
 * Tests for the useAgentAnalytics hook that fetches agent analytics data.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAgentAnalytics } from '@/lib/hooks/useAgentAnalytics';

// Mock Supabase client
const mockGetSession = vi.fn();
const mockCreateClient = vi.fn(() => ({
  auth: {
    getSession: mockGetSession,
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockCreateClient(),
}));

// Mock fetch
global.fetch = vi.fn();

const mockAnalyticsResponse = {
  data: {
    agent: {
      id: 'agent-123',
      name: 'Test Agent',
      role: 'worker',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
    },
    summary: {
      totalTasksCompleted: 150,
      totalTasksFailed: 10,
      totalTasksCreated: 160,
      successRate: 0.9375,
      avgTaskDuration: 120,
      totalCost: 45.5,
      totalEscalations: 5,
      totalDecisions: 50,
      totalOverridden: 2,
      overrideRate: 4,
      avgConfidence: 0.85,
    },
    taskTypeBreakdown: [
      { type: 'research', count: 60, completed: 55, failed: 5, cost: 18, successRate: 91.67 },
    ],
    workloadDistribution: Array(24).fill(0).map((_, i) => ({ hour: i, tasks: 0 })),
    dailyTrend: [
      { date: '2024-02-01', tasksCompleted: 10, tasksFailed: 1, successRate: 0.91, cost: 3, escalations: 0, avgDuration: 120, confidence: 0.85 },
    ],
    decisionConfidenceTrend: [],
    escalationResolutionTrend: [],
    recentTasks: [],
    period: { days: 30 },
  },
};

describe('useAgentAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsResponse),
    });

    const { result } = renderHook(() => 
      useAgentAnalytics({ agentId: 'agent-123', enabled: true })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should fetch analytics data successfully', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsResponse),
    });

    const { result } = renderHook(() => 
      useAgentAnalytics({ agentId: 'agent-123', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockAnalyticsResponse.data);
    expect(result.current.error).toBeNull();
  });

  it('should not fetch when disabled', () => {
    const { result } = renderHook(() => 
      useAgentAnalytics({ agentId: 'agent-123', enabled: false })
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('should not fetch when agentId is not provided', () => {
    const { result } = renderHook(() => 
      useAgentAnalytics({ enabled: true })
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle fetch error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: 'Failed to fetch' }),
    });

    const { result } = renderHook(() => 
      useAgentAnalytics({ agentId: 'agent-123', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('Failed to fetch');
  });

  it('should handle authentication error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    const { result } = renderHook(() => 
      useAgentAnalytics({ agentId: 'agent-123', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Not authenticated');
  });

  it('should use correct days parameter', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsResponse),
    });

    renderHook(() => 
      useAgentAnalytics({ agentId: 'agent-123', days: 7, enabled: true })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics/agents/agent-123?days=7',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token',
          },
        })
      );
    });
  });

  it('should refetch data when refetch is called', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsResponse),
    });

    const { result } = renderHook(() => 
      useAgentAnalytics({ agentId: 'agent-123', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear mock to check refetch
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();

    result.current.refetch();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should include authorization header in request', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsResponse),
    });

    renderHook(() => 
      useAgentAnalytics({ agentId: 'agent-123', enabled: true })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token',
          },
        })
      );
    });
  });
});
