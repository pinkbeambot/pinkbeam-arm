/**
 * useDashboardStats Hook Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock useAuth to provide session tokens
const mockUseAuth = vi.fn();
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Import after mocks
import { useDashboardStats } from '@/components/dashboard/useDashboardStats';

// Helper: create a successful fetch Response
function okResponse(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper: create an error fetch Response
function errorResponse(status: number, body?: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body || { error: `Failed: ${status}` }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useDashboardStats', () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    // Default: authenticated session
    mockUseAuth.mockReturnValue({
      session: { access_token: 'test-token' },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it('should fetch stats successfully', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        activeAgents: 5,
        tasksCompletedToday: 12,
        pendingEscalations: 3,
        avgResponseTime: null,
      })
    );

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
    mockFetch.mockResolvedValue(
      okResponse({
        activeAgents: 5,
        tasksCompletedToday: 12,
        pendingEscalations: 3,
      })
    );

    const { result } = renderHook(() => useDashboardStats());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats.activeAgents).toBe(0);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });
  }, 10000);

  it('should handle errors', async () => {
    mockFetch.mockResolvedValue(
      errorResponse(500, { error: 'Database error' })
    );

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Database error');
  }, 10000);

  it('should refetch when called', async () => {
    let callCount = 0;

    mockFetch.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          okResponse({
            activeAgents: 5,
            tasksCompletedToday: 12,
            pendingEscalations: 3,
          })
        );
      }
      return Promise.resolve(
        okResponse({
          activeAgents: 10,
          tasksCompletedToday: 20,
          pendingEscalations: 1,
        })
      );
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
    mockFetch.mockResolvedValue(
      okResponse({
        activeAgents: null,
        tasksCompletedToday: null,
        pendingEscalations: null,
        avgResponseTime: null,
      })
    );

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
    mockFetch.mockResolvedValue(
      okResponse({
        activeAgents: 5,
        tasksCompletedToday: 12,
        pendingEscalations: 3,
      })
    );

    const { result, unmount } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  }, 10000);
});
