import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgentTest } from '@/lib/hooks/useAgentTest';

// Mock the AuthProvider
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: {
      access_token: 'test-token',
    },
  }),
}));

describe('useAgentTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTestHistoryResponse = {
    data: [
      {
        id: 'test-1',
        test_input: 'Hello agent',
        test_output: 'Hello! How can I help you?',
        success: true,
        response_time_ms: 1250,
        tokens_used: 342,
        cost_usd: 0.005,
        model_used: 'claude-3-5-sonnet-20241022',
        created_at: '2026-02-14T10:00:00Z',
      },
      {
        id: 'test-2',
        test_input: 'Analyze this data',
        test_output: '',
        success: false,
        response_time_ms: 500,
        tokens_used: 100,
        cost_usd: 0.002,
        model_used: 'claude-3-5-sonnet-20241022',
        error_message: 'API timeout',
        created_at: '2026-02-14T09:00:00Z',
      },
    ],
    meta: {
      pagination: {
        limit: 50,
        offset: 0,
        total: 2,
        hasMore: false,
      },
    },
  };

  const mockTestRunResponse = {
    data: {
      test_input: 'Test prompt',
      result: {
        success: true,
        output: 'Test response',
        response_time_ms: 1000,
        tokens_used: 250,
        cost_usd: 0.00375,
        model_used: 'claude-3-5-sonnet-20241022',
      },
      config_tested: {
        system_prompt_preview: 'You are a helpful assistant...',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        max_tokens: 1000,
      },
    },
    meta: {
      simulated: false,
    },
  };

  it('should fetch test history on mount when autoLoadHistory is true', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTestHistoryResponse),
    } as Response);

    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: true })
    );

    // Initially loading
    expect(result.current.isLoadingHistory).toBe(true);

    // Wait for history to load
    await waitFor(() => {
      expect(result.current.testHistory).toHaveLength(2);
    });

    expect(result.current.testHistory[0].input).toBe('Hello agent');
    expect(result.current.testHistory[1].input).toBe('Analyze this data');
    expect(result.current.isLoadingHistory).toBe(false);
  });

  it('should not fetch test history when autoLoadHistory is false', async () => {
    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: false })
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.testHistory).toHaveLength(0);
  });

  it('should run a test successfully', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTestRunResponse),
    } as Response);

    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: false })
    );

    await act(async () => {
      await result.current.runTest({
        testInput: 'Test prompt',
        useCurrent: true,
      });
    });

    expect(result.current.currentResult).not.toBeNull();
    expect(result.current.currentResult?.output).toBe('Test response');
    expect(result.current.currentResult?.success).toBe(true);
    expect(result.current.currentResult?.costUsd).toBe(0.00375);
    expect(result.current.testHistory).toHaveLength(1);
  });

  it('should handle test failures', async () => {
    const errorResponse = {
      error: 'Test execution failed',
      details: 'API error: 500',
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve(errorResponse),
    } as Response);

    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: false })
    );

    let thrownError: Error | null = null;
    try {
      await act(async () => {
        await result.current.runTest({
          testInput: 'Test prompt',
          useCurrent: true,
        });
      });
    } catch (e) {
      thrownError = e as Error;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toContain('Test execution failed');
  });

  it('should clear history', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTestHistoryResponse),
    } as Response);

    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: true })
    );

    await waitFor(() => {
      expect(result.current.testHistory).toHaveLength(2);
    });

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.testHistory).toHaveLength(0);
    expect(result.current.currentResult).toBeNull();
  });

  it('should select a result', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTestRunResponse),
    } as Response);

    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: false })
    );

    await act(async () => {
      await result.current.runTest({
        testInput: 'Test prompt',
        useCurrent: true,
      });
    });

    const testResult = result.current.testHistory[0];

    act(() => {
      result.current.selectResult(null);
    });

    expect(result.current.currentResult).toBeNull();

    act(() => {
      result.current.selectResult(testResult);
    });

    expect(result.current.currentResult).toEqual(testResult);
  });

  it('should calculate statistics correctly', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTestHistoryResponse),
    } as Response);

    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: true })
    );

    await waitFor(() => {
      expect(result.current.testHistory).toHaveLength(2);
    });

    // Stats calculations
    expect(result.current.stats.totalTests).toBe(2);
    expect(result.current.stats.totalCost).toBe(0.007); // 0.005 + 0.002
    expect(result.current.stats.avgResponseTime).toBe(875); // (1250 + 500) / 2
    expect(result.current.stats.successRate).toBe(50); // 1 out of 2
  });

  it('should handle network errors when fetching history', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: true })
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Network error');
  });

  it('should handle missing auth token', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    } as Response);

    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: false })
    );

    await expect(
      act(async () => {
        await result.current.runTest({
          testInput: 'Test prompt',
          useCurrent: true,
        });
      })
    ).rejects.toThrow();
  });

  it('should refresh test history', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTestHistoryResponse),
    } as Response);

    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: true })
    );

    await waitFor(() => {
      expect(result.current.testHistory).toHaveLength(2);
    });

    // Mock another fetch for refresh
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ...mockTestHistoryResponse,
        data: [...mockTestHistoryResponse.data, {
          id: 'test-3',
          test_input: 'New test',
          test_output: 'New response',
          success: true,
          response_time_ms: 800,
          tokens_used: 200,
          cost_usd: 0.003,
          model_used: 'claude-3-5-sonnet-20241022',
          created_at: '2026-02-14T11:00:00Z',
        }],
      }),
    } as Response);

    await act(async () => {
      await result.current.fetchTestHistory();
    });

    expect(result.current.testHistory).toHaveLength(3);
  });

  it('should include custom config in test request', async () => {
    const customConfig = {
      basic_info: { name: 'Test Agent' },
      instructions: { system_prompt: 'You are a test agent' },
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTestRunResponse),
    } as Response);

    const { result } = renderHook(() => 
      useAgentTest({ agentId: 'agent-123', autoLoadHistory: false })
    );

    await act(async () => {
      await result.current.runTest({
        testInput: 'Test with custom config',
        config: customConfig,
        useCurrent: false,
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/agents/agent-123/config/test',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Test with custom config'),
      })
    );

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1]?.body as string);
    expect(requestBody.config).toEqual(customConfig);
    expect(requestBody.use_current).toBe(false);
  });
});
