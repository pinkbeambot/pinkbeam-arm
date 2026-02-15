/**
 * useRealtimeMetrics Hook Tests
 * Issue: #64 - Fix metrics error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((callback) => {
      callback('SUBSCRIBED');
      return { unsubscribe: vi.fn() };
    }),
  })),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Import after mocks
import { useRealtimeMetrics } from '@/components/dashboard/metrics/useRealtimeMetrics';

describe('useRealtimeMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with loading state', () => {
      // Setup mock to return empty data
      mockSupabaseClient.from.mockImplementation((table: string) => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      const { result } = renderHook(() => useRealtimeMetrics());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.agentMetrics).toEqual([]);
    });

    it('should initialize with correct default values', () => {
      mockSupabaseClient.from.mockImplementation((table: string) => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

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

  describe('error handling', () => {
    it('should set error state when agents fetch fails', async () => {
      const errorMessage = 'Failed to fetch agents: Database error';
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'agents') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { message: 'Database error' } 
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            gte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      });

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toContain('Failed to fetch agents');
      expect(result.current.isLoading).toBe(false);
    });

    it('should set error state when tasks fetch fails', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'agents') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          };
        }
        if (table === 'tasks') {
          // tasks query calls .select('status') without .order(), so return
          // a thenable directly from select()
          return {
            select: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Tasks table error' },
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      });

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toContain('Failed to fetch tasks');
    });

    it('should set error state when activities fetch fails', async () => {
      const agentsData = [
        { 
          id: 'agent-1', 
          name: 'Test Agent', 
          status: 'idle',
          current_task_id: null,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'agents') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: agentsData, error: null })),
            })),
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          };
        }
        if (table === 'activities') {
          return {
            select: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: { message: 'Activities error' } 
                })),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      });

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toContain('Failed to fetch activities');
    });

    it('should clear error state on successful refresh', async () => {
      let shouldFail = true;

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (shouldFail) {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { message: 'Database error' } 
              })),
              gte: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            gte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
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

    it('should handle unknown error types gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unknown error');
      });

      const { result } = renderHook(() => useRealtimeMetrics());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Unknown error');
    });
  });

  describe('refresh functionality', () => {
    it('should expose refresh function', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      const { result } = renderHook(() => useRealtimeMetrics());

      expect(typeof result.current.refresh).toBe('function');
    });

    it('should set loading state during refresh', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

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

      const agentsData = [
        { 
          id: 'agent-1', 
          name: 'Test Agent', 
          status: 'idle',
          current_task_id: null,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'agents') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: agentsData, error: null })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            gte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      });

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
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      const { result } = renderHook(() => useRealtimeMetrics({ 
        agentIds: ['agent-1', 'agent-2'] 
      }));

      // Should not throw
      expect(result.current.agentMetrics).toEqual([]);
    });
  });
});
