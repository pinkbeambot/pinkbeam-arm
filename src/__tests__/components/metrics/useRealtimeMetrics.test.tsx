/**
 * useRealtimeMetrics Hook Tests
 * Issue: #64 - Fix metrics error handling
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock useAuth to provide session tokens
const mockUseAuth = vi.fn();
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the Supabase browser client (used for Realtime subscriptions only)
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb: (status: string) => void) => {
        cb('SUBSCRIBED');
        return { unsubscribe: vi.fn() };
      }),
      unsubscribe: vi.fn(),
    }),
  }),
}));

// Import after mocks
import { useRealtimeMetrics } from '@/components/dashboard/metrics/useRealtimeMetrics';

// Helper: create a successful fetch Response
function okResponse(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper: create an error fetch Response
function errorResponse(status: number, statusText: string, body?: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body || { error: statusText }), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Default mock responses for agents + activities
function mockSuccessResponses(
  mockFetch: ReturnType<typeof vi.fn>,
  agents: unknown[] = [],
  activities: unknown[] = []
) {
  mockFetch.mockImplementation((url: string) => {
    if (url.startsWith('/api/agents')) {
      return Promise.resolve(okResponse({ data: agents }));
    }
    if (url.startsWith('/api/activities')) {
      return Promise.resolve(okResponse({ activities }));
    }
    return Promise.resolve(okResponse({}));
  });
}

describe('useRealtimeMetrics', () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    // Default: authenticated session
    mockUseAuth.mockReturnValue({
      session: { access_token: 'test-token-123' },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('initial state', () => {
    it('should initialize with loading state', () => {
      mockSuccessResponses(mockFetch);

      const { result } = renderHook(() => useRealtimeMetrics());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.agentMetrics).toEqual([]);
    });

    it('should initialize with correct default values', () => {
      mockSuccessResponses(mockFetch);

      const { result } = renderHook(() => useRealtimeMetrics());

      expect(result.current.agentMetrics).toEqual([]);
      expect(result.current.selectedAgent).toBeNull();
      expect(result.current.systemHealth).toBeNull();
      expect(result.current.aggregated).toBeNull();
      expect(result.current.isConnected).toBe(true); // Connected after subscribe
      expect(result.current.isRealtime).toBe(true);
      expect(result.current.lastUpdateAt).toBeNull();
    });
  });

  describe('data fetching', () => {
    it('should include Authorization header when fetching', async () => {
      mockSuccessResponses(mockFetch);

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have called both /api/agents and /api/activities
      expect(mockFetch).toHaveBeenCalledTimes(2);

      for (const call of mockFetch.mock.calls) {
        const [, options] = call;
        expect((options as RequestInit).headers).toEqual(
          expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          })
        );
      }
    });

    it('should not fetch when session has no access_token', async () => {
      mockUseAuth.mockReturnValue({ session: null });
      mockSuccessResponses(mockFetch);

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should populate agent metrics from API response', async () => {
      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          status: 'active',
          current_task_id: null,
          updated_at: new Date().toISOString(),
        },
      ];

      mockSuccessResponses(mockFetch, agents, []);

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.agentMetrics.length).toBe(1);
      });

      expect(result.current.agentMetrics[0].agentId).toBe('agent-1');
      expect(result.current.agentMetrics[0].agentName).toBe('Test Agent');
      expect(result.current.aggregated).not.toBeNull();
      expect(result.current.systemHealth).not.toBeNull();
    });
  });

  describe('error handling', () => {
    it('should set error state when agents fetch fails', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.startsWith('/api/agents')) {
          return Promise.resolve(errorResponse(500, 'Internal Server Error', { error: 'Database error' }));
        }
        return Promise.resolve(okResponse({ activities: [] }));
      });

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toContain('Failed to fetch agents');
      expect(result.current.isLoading).toBe(false);
    });

    it('should set error state when activities fetch fails', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.startsWith('/api/agents')) {
          return Promise.resolve(okResponse({ data: [] }));
        }
        if (url.startsWith('/api/activities')) {
          return Promise.resolve(errorResponse(500, 'Internal Server Error', { error: 'Activities error' }));
        }
        return Promise.resolve(okResponse({}));
      });

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toContain('Failed to fetch activities');
    });

    it('should clear error state on successful refresh', async () => {
      let shouldFail = true;

      mockFetch.mockImplementation((url: string) => {
        if (shouldFail) {
          if (url.startsWith('/api/agents')) {
            return Promise.resolve(errorResponse(500, 'Internal Server Error'));
          }
        }
        if (url.startsWith('/api/agents')) {
          return Promise.resolve(okResponse({ data: [] }));
        }
        return Promise.resolve(okResponse({ activities: [] }));
      });

      const { result } = renderHook(() => useRealtimeMetrics());

      // Wait for error
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Switch to success mode and refresh
      shouldFail = false;

      await act(async () => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle network error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('refresh functionality', () => {
    it('should expose refresh function', () => {
      mockSuccessResponses(mockFetch);

      const { result } = renderHook(() => useRealtimeMetrics());

      expect(typeof result.current.refresh).toBe('function');
    });

    it('should set loading state during refresh', async () => {
      mockSuccessResponses(mockFetch);

      const { result } = renderHook(() => useRealtimeMetrics());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger refresh
      act(() => {
        result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('agent selection', () => {
    it('should allow selecting and deselecting agents', async () => {
      const mockAgent = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        status: 'idle' as const,
        tasksPerMinute: 0,
        successRate: 100,
        currentLoad: 0,
        avgResponseTime: 100,
        errorRate: 0,
        lastActivityAt: new Date().toISOString(),
      };

      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          status: 'idle',
          current_task_id: null,
          updated_at: new Date().toISOString(),
        },
      ];

      mockSuccessResponses(mockFetch, agents, []);

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.agentMetrics.length).toBeGreaterThan(0);
      });

      // Select agent
      act(() => {
        result.current.setSelectedAgent(mockAgent);
      });

      expect(result.current.selectedAgent).toEqual(mockAgent);

      // Deselect agent
      act(() => {
        result.current.setSelectedAgent(null);
      });

      expect(result.current.selectedAgent).toBeNull();
    });
  });

  describe('options', () => {
    it('should respect enabled option', () => {
      const { result } = renderHook(() => useRealtimeMetrics({ enabled: false }));

      // Should not be loading when disabled
      expect(result.current.isLoading).toBe(false);
    });

    it('should accept agentIds filter', async () => {
      mockSuccessResponses(mockFetch);

      const { result } = renderHook(() =>
        useRealtimeMetrics({
          agentIds: ['agent-1', 'agent-2'],
        })
      );

      // Should not throw
      expect(result.current.agentMetrics).toEqual([]);
    });
  });
});
