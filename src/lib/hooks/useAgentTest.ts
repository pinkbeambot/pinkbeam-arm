'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import type { ConfigTestResult } from '@/types';

interface TestRunResult {
  id: string;
  input: string;
  output: string;
  success: boolean;
  responseTimeMs: number;
  tokensUsed?: number;
  costUsd?: number;
  modelUsed: string;
  errorMessage?: string;
  timestamp: Date;
}

interface UseAgentTestOptions {
  agentId: string;
  autoLoadHistory?: boolean;
}

interface TestAgentInput {
  testInput: string;
  config?: Record<string, unknown>;
  useCurrent?: boolean;
}

interface TestAgentResponse {
  test_input: string;
  result: {
    success: boolean;
    output: string;
    response_time_ms: number;
    tokens_used?: number;
    cost_usd?: number;
    model_used: string;
    error_message?: string;
  };
  config_tested: {
    system_prompt_preview: string;
    model: string;
    temperature: number;
    max_tokens?: number;
  };
}

/**
 * Hook for testing agent configurations with real LLM execution
 */
export function useAgentTest({ agentId, autoLoadHistory = true }: UseAgentTestOptions) {
  const [testHistory, setTestHistory] = useState<TestRunResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentResult, setCurrentResult] = useState<TestRunResult | null>(null);
  const { session } = useAuth();

  /**
   * Fetch test history from the API
   */
  const fetchTestHistory = useCallback(async () => {
    if (!session?.access_token || !agentId) return;

    try {
      setIsLoadingHistory(true);
      setError(null);

      const response = await fetch(`/api/agents/${agentId}/config/test`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch test history: ${response.status}`);
      }

      const result = await response.json();
      
      // Map API response to our internal format
      const history: TestRunResult[] = (result.data || []).map((item: ConfigTestResult) => ({
        id: item.id,
        input: item.test_input,
        output: item.test_output || '',
        success: item.success,
        responseTimeMs: item.response_time_ms,
        tokensUsed: item.tokens_used,
        costUsd: item.cost_usd,
        modelUsed: item.model_used || 'unknown',
        errorMessage: item.error_message,
        timestamp: new Date(item.created_at),
      }));

      setTestHistory(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch test history';
      setError(new Error(errorMessage));
      console.error('Error fetching test history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [agentId, session?.access_token]);

  /**
   * Run a test with the provided input
   */
  const runTest = useCallback(async (input: TestAgentInput): Promise<TestRunResult> => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/${agentId}/config/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_input: input.testInput,
          config: input.config,
          use_current: input.useCurrent ?? true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Test failed: ${response.status}`);
      }

      const result: { data: TestAgentResponse; meta?: { simulated?: boolean; message?: string } } = await response.json();
      
      const testResult: TestRunResult = {
        id: crypto.randomUUID(),
        input: result.data.test_input,
        output: result.data.result.output,
        success: result.data.result.success,
        responseTimeMs: result.data.result.response_time_ms,
        tokensUsed: result.data.result.tokens_used,
        costUsd: result.data.result.cost_usd,
        modelUsed: result.data.result.model_used,
        errorMessage: result.data.result.error_message,
        timestamp: new Date(),
      };

      setCurrentResult(testResult);
      setTestHistory(prev => [testResult, ...prev]);

      return testResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Test failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [agentId, session?.access_token]);

  /**
   * Clear test history (client-side only)
   */
  const clearHistory = useCallback(() => {
    setTestHistory([]);
    setCurrentResult(null);
  }, []);

  /**
   * Select a specific test result to view
   */
  const selectResult = useCallback((result: TestRunResult | null) => {
    setCurrentResult(result);
  }, []);

  // Load history on mount if autoLoadHistory is true
  useEffect(() => {
    if (autoLoadHistory && agentId) {
      fetchTestHistory();
    }
  }, [autoLoadHistory, agentId, fetchTestHistory]);

  // Calculate total cost of all tests
  const totalCost = testHistory.reduce((sum, test) => sum + (test.costUsd || 0), 0);

  // Calculate average response time
  const avgResponseTime = testHistory.length > 0
    ? testHistory.reduce((sum, test) => sum + test.responseTimeMs, 0) / testHistory.length
    : 0;

  // Calculate success rate
  const successRate = testHistory.length > 0
    ? (testHistory.filter(test => test.success).length / testHistory.length) * 100
    : 0;

  return {
    // State
    testHistory,
    currentResult,
    isLoading,
    isLoadingHistory,
    error,
    
    // Actions
    runTest,
    fetchTestHistory,
    clearHistory,
    selectResult,
    
    // Statistics
    stats: {
      totalTests: testHistory.length,
      totalCost,
      avgResponseTime,
      successRate,
    },
  };
}

export type { TestRunResult, TestAgentInput, TestAgentResponse };
