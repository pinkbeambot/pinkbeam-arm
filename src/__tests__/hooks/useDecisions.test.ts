/**
 * Tests for useDecisions hook
 * Tests the hook's filtering, pagination, and API integration logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock must be before imports
const mockSession = {
  access_token: 'test-token',
  user: { id: 'test-user' },
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: mockSession } }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  }),
}));

import { useDecisionsRealtime } from '@/lib/hooks/useDecisions';

describe('useDecisionsRealtime Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should construct correct API URL with agent filter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });
    global.fetch = mockFetch;

    renderHook(() =>
      useDecisionsRealtime({
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        page: 1,
        limit: 20,
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain('agent_id=550e8400-e29b-41d4-a716-446655440000');
  });

  it('should construct correct API URL with status filter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });
    global.fetch = mockFetch;

    renderHook(() =>
      useDecisionsRealtime({
        status: 'approved',
        page: 1,
        limit: 20,
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain('status=approved');
  });

  it('should construct correct API URL with date range filters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });
    global.fetch = mockFetch;

    renderHook(() =>
      useDecisionsRealtime({
        dateFrom: '2026-01-01T00:00:00Z',
        dateTo: '2026-12-31T23:59:59Z',
        page: 1,
        limit: 20,
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain('date_from=2026-01-01T00%3A00%3A00Z');
    expect(callUrl).toContain('date_to=2026-12-31T23%3A59%3A59Z');
  });

  it('should construct correct API URL with confidence filter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });
    global.fetch = mockFetch;

    renderHook(() =>
      useDecisionsRealtime({
        confidenceMin: 0.8,
        page: 1,
        limit: 20,
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain('confidence_min=0.8');
  });

  it('should construct correct API URL with search query', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });
    global.fetch = mockFetch;

    renderHook(() =>
      useDecisionsRealtime({
        search: 'pricing strategy',
        page: 1,
        limit: 20,
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain('search=pricing+strategy');
  });

  it('should construct correct API URL with sort parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });
    global.fetch = mockFetch;

    renderHook(() =>
      useDecisionsRealtime({
        sort: 'confidence',
        order: 'asc',
        page: 1,
        limit: 20,
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain('sort=confidence');
    expect(callUrl).toContain('order=asc');
  });

  it('should construct correct API URL with pagination', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 3, limit: 50, total: 0, totalPages: 0 },
      }),
    });
    global.fetch = mockFetch;

    renderHook(() =>
      useDecisionsRealtime({
        page: 3,
        limit: 50,
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain('page=3');
    expect(callUrl).toContain('limit=50');
  });

  it('should include authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });
    global.fetch = mockFetch;

    renderHook(() => useDecisionsRealtime({ page: 1, limit: 20 }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callOptions = mockFetch.mock.calls[0][1];
    expect(callOptions.headers).toHaveProperty('Authorization');
    expect(callOptions.headers.Authorization).toBe('Bearer test-token');
  });

  it('should handle API errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDecisionsRealtime({ page: 1, limit: 20 }));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toContain('Internal server error');
  });

  it('should return pagination info from response', async () => {
    const mockResponse = {
      data: [{ id: '1', title: 'Test Decision' }],
      pagination: {
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDecisionsRealtime({ page: 2, limit: 20 }));

    await waitFor(() => {
      expect(result.current.decisions.length).toBeGreaterThan(0);
    });

    expect(result.current.pagination).toEqual(mockResponse.pagination);
  });
});

describe('useDecisionsRealtime - Filter Combinations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });
  });

  it('should combine multiple filters correctly', async () => {
    renderHook(() =>
      useDecisionsRealtime({
        agentId: 'agent-123',
        status: 'approved',
        category: 'strategy',
        confidenceMin: 0.8,
        search: 'pricing',
        page: 2,
        limit: 25,
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const callUrl = (global.fetch as any).mock.calls[0][0];
    expect(callUrl).toContain('agent_id=agent-123');
    expect(callUrl).toContain('status=approved');
    expect(callUrl).toContain('category=strategy');
    expect(callUrl).toContain('confidence_min=0.8');
    expect(callUrl).toContain('search=pricing');
    expect(callUrl).toContain('page=2');
    expect(callUrl).toContain('limit=25');
  });
});
