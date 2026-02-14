/**
 * useDashboardStats Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboardStats } from '@/components/dashboard/useDashboardStats';

// Mock supabase client
const mockSelect = vi.fn();
const mockIn = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLt = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    // Reset mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      in: mockIn,
      eq: mockEq,
    });
    mockIn.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      gte: mockGte,
    });
    mockGte.mockReturnValue({
      lt: mockLt,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setupMockQueries(results: Array<{ count: number | null; error?: Error | null }>) {
    let callIndex = 0;
    mockLt.mockImplementation(() => {
      const result = results[callIndex] || { count: 0, error: null };
      callIndex++;
      return Promise.resolve(result);
    });
  }

  it('should fetch stats successfully', async () => {
    setupMockQueries([
      { count: 5 },   // agents
      { count: 12 },  // tasks
      { count: 3 },   // escalations
    ]);

    const { result } = renderHook(() => useDashboardStats());

    // Should start loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.stats).toEqual({
      activeAgents: 5,
      tasksCompletedToday: 12,
      pendingEscalations: 3,
      avgResponseTime: null,
    });
    expect(result.current.error).toBeNull();
  }, 10000);

  it('should handle loading state', async () => {
    setupMockQueries([
      { count: 5 },
      { count: 12 },
      { count: 3 },
    ]);

    const { result } = renderHook(() => useDashboardStats());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats.activeAgents).toBe(0);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });
  }, 10000);

  it('should handle errors', async () => {
    const mockError = new Error('Database error');
    setupMockQueries([
      { count: null, error: mockError },
      { count: 12 },
      { count: 3 },
    ]);

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.error).toBeTruthy();
  }, 10000);

  it('should refetch when called', async () => {
    let callCount = 0;
    const results = [
      { count: 5 }, { count: 12 }, { count: 3 },   // First fetch
      { count: 10 }, { count: 20 }, { count: 1 },  // Refetch
    ];
    
    mockLt.mockImplementation(() => {
      const result = results[callCount] || { count: 0 };
      callCount++;
      return Promise.resolve(result);
    });

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.stats.activeAgents).toBe(5);

    // Refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.stats.activeAgents).toBe(10);
    expect(result.current.stats.tasksCompletedToday).toBe(20);
    expect(result.current.stats.pendingEscalations).toBe(1);
  }, 10000);

  it('should handle null counts gracefully', async () => {
    setupMockQueries([
      { count: null },
      { count: null },
      { count: null },
    ]);

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.stats).toEqual({
      activeAgents: 0,
      tasksCompletedToday: 0,
      pendingEscalations: 0,
      avgResponseTime: null,
    });
  }, 10000);

  it('should clear interval on unmount', async () => {
    setupMockQueries([
      { count: 5 },
      { count: 12 },
      { count: 3 },
    ]);

    const { result, unmount } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  }, 10000);
});
