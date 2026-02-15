/**
 * useRealtimeActivities Hook Tests
 *
 * Verifies the hook sends the Authorization header when fetching activities
 * and gracefully handles missing auth sessions.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

// Mock useAuth to provide session tokens
const mockUseAuth = vi.fn();
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the Supabase browser client (used for Realtime subscriptions)
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

// Import after mocks are set up
import { useRealtimeActivities } from '@/components/dashboard/activity/useRealtimeActivities';

describe('useRealtimeActivities', () => {
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

  it('should include Authorization header when fetching activities', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'test-token-123' },
    });

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ activities: [], meta: { hasMore: false, cursor: null, total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useRealtimeActivities({ enabled: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/activities');
    expect(options).toBeDefined();
    expect((options as RequestInit).headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer test-token-123',
      })
    );
  });

  it('should not fetch when session has no access_token', async () => {
    mockUseAuth.mockReturnValue({
      session: null,
    });

    const { result } = renderHook(() => useRealtimeActivities({ enabled: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.events).toEqual([]);
  });

  it('should return empty events on successful response with no activities', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'test-token-123' },
    });

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ activities: [], meta: { hasMore: false, cursor: null, total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useRealtimeActivities({ enabled: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });

  it('should set error when fetch returns non-OK response', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'test-token-123' },
    });

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useRealtimeActivities({ enabled: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain('Unauthorized');
  });

  it('should pass filter params as query parameters', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'test-token-123' },
    });

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ activities: [], meta: { hasMore: false, cursor: null, total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    renderHook(() =>
      useRealtimeActivities({
        enabled: true,
        filter: { type: 'tasks', agentId: 'agent-1', timeRange: '24h', search: 'deploy' },
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('category=tasks');
    expect(url).toContain('agent_id=agent-1');
    expect(url).toContain('time_range=24h');
    expect(url).toContain('search=deploy');
  });

  it('should not fetch when enabled is false', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'test-token-123' },
    });

    const { result } = renderHook(() => useRealtimeActivities({ enabled: false }));

    // Give it time to potentially fetch
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true); // Never transitions since enabled=false
  });
});
