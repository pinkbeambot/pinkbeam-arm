/**
 * useDashboardStats Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboardStats } from '@/components/dashboard/useDashboardStats';

// Mock supabase client
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseClient: {
    from: vi.fn((...args: unknown[]) => mockFrom(...args)),
  },
}));

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createMockQuery(count: number | null) {
    return {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ count, error: null }),
    };
  }

  it('should return initial state', () => {
    mockFrom.mockReturnValue(createMockQuery(0));

    const { result } = renderHook(() => useDashboardStats());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats.activeAgents).toBe(0);
    expect(result.current.stats.tasksCompletedToday).toBe(0);
    expect(result.current.stats.pendingEscalations).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should fetch and display stats', async () => {
    let callCount = 0;
    const counts = [5, 12, 3]; // agents, tasks, escalations

    mockFrom.mockImplementation(() => {
      const count = counts[callCount] ?? 0;
      callCount++;
      return createMockQuery(count);
    });

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.stats.activeAgents).toBe(5);
    expect(result.current.stats.tasksCompletedToday).toBe(12);
    expect(result.current.stats.pendingEscalations).toBe(3);
    expect(result.current.error).toBeNull();
  }, 10000);

  it('should handle fetch errors', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ count: null, error: new Error('DB Error') }),
    }));

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.error).toBeTruthy();
  }, 10000);

  it('should refetch when called', async () => {
    let callCount = 0;
    const counts = [5, 12, 3, 10, 20, 1]; // First fetch, then refetch

    mockFrom.mockImplementation(() => {
      const count = counts[callCount] ?? 0;
      callCount++;
      return createMockQuery(count);
    });

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.stats.activeAgents).toBe(5);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.stats.activeAgents).toBe(10);
    expect(result.current.stats.tasksCompletedToday).toBe(20);
    expect(result.current.stats.pendingEscalations).toBe(1);
  }, 10000);

  it('should handle null counts', async () => {
    mockFrom.mockReturnValue(createMockQuery(null));

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.stats.activeAgents).toBe(0);
    expect(result.current.stats.tasksCompletedToday).toBe(0);
    expect(result.current.stats.pendingEscalations).toBe(0);
  }, 10000);

  it('should auto-refresh on interval', async () => {
    let callCount = 0;
    const counts = [5, 12, 3, 10, 20, 1]; // First fetch, then auto-refresh

    mockFrom.mockImplementation(() => {
      const count = counts[callCount] ?? 0;
      callCount++;
      return createMockQuery(count);
    });

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.stats.activeAgents).toBe(5);

    // Fast forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(result.current.stats.activeAgents).toBe(10);
    }, { timeout: 3000 });
  }, 10000);

  it('should clear interval on unmount', async () => {
    mockFrom.mockReturnValue(createMockQuery(0));

    const { result, unmount } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  }, 10000);
});
