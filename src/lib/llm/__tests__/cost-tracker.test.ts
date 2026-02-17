/**
 * Cost Tracker Tests
 * Tests for cost tracking and budget enforcement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CostTracker,
  getCostTracker,
  resetCostTracker,
  trackCost,
} from '../cost-tracker';
import { LLMError } from '../types';

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}));

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    resetCostTracker();
    tracker = getCostTracker({ enabled: true, enforceBudgets: true, debug: false });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should track cost successfully', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'cost-123' },
      error: null,
    });

    const entry = {
      id: 'test-id',
      agentId: 'agent-123',
      tenantId: 'tenant-123',
      taskId: 'task-123',
      provider: 'anthropic' as const,
      model: 'claude-3-5-sonnet-20241022',
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.00105,
      timestamp: new Date(),
      latencyMs: 1000,
    };

    const result = await tracker.trackCost(entry);

    expect(result.success).toBe(true);
    expect(result.costId).toBe('cost-123');
  });

  it('should track error when cost tracking fails', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const entry = {
      id: 'test-id',
      provider: 'anthropic' as const,
      model: 'claude-3-5-sonnet-20241022',
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.001,
      timestamp: new Date(),
      latencyMs: 1000,
    };

    const result = await tracker.trackCost(entry);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should skip tracking when disabled', async () => {
    tracker.updateConfig({ enabled: false });

    const entry = {
      id: 'test-id',
      provider: 'anthropic' as const,
      model: 'claude-3-5-sonnet-20241022',
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.001,
      timestamp: new Date(),
      latencyMs: 1000,
    };

    const result = await tracker.trackCost(entry);

    expect(result.success).toBe(true);
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('should track error requests', async () => {
    mockSupabaseClient.insert.mockResolvedValueOnce({ error: null });

    const result = await tracker.trackError(
      {
        id: 'test-id',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        inputTokens: 100,
        outputTokens: 0,
        timestamp: new Date(),
        latencyMs: 1000,
      },
      'API timeout'
    );

    expect(result.success).toBe(true);
  });

  it('should get tenant cost summary', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: [{
        total_requests: '100',
        total_tokens: '50000',
        total_cost_usd: '1.50',
        avg_cost_per_request: '0.015',
        avg_tokens_per_request: '500',
      }],
      error: null,
    });

    const summary = await tracker.getTenantCostSummary('tenant-123');

    expect(summary.totalRequests).toBe(100);
    expect(summary.totalTokens).toBe(50000);
    expect(summary.totalCostUsd).toBe(1.50);
    expect(summary.avgCostPerRequest).toBe(0.015);
  });

  it('should get cost breakdown by model', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: [
        {
          model: 'claude-3-5-sonnet-20241022',
          provider: 'anthropic',
          request_count: '50',
          total_tokens: '25000',
          total_cost_usd: '1.00',
        },
        {
          model: 'gpt-4o',
          provider: 'openai',
          request_count: '50',
          total_tokens: '25000',
          total_cost_usd: '0.50',
        },
      ],
      error: null,
    });

    const breakdown = await tracker.getCostByModel('tenant-123');

    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].model).toBe('claude-3-5-sonnet-20241022');
    expect(breakdown[1].model).toBe('gpt-4o');
  });

  it('should get daily costs', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: [
        {
          date: '2025-02-17',
          request_count: '10',
          total_tokens: '5000',
          total_cost_usd: '0.15',
        },
        {
          date: '2025-02-16',
          request_count: '8',
          total_tokens: '4000',
          total_cost_usd: '0.12',
        },
      ],
      error: null,
    });

    const dailyCosts = await tracker.getDailyCosts('tenant-123', 7);

    expect(dailyCosts).toHaveLength(2);
    expect(dailyCosts[0].date).toBe('2025-02-17');
    expect(dailyCosts[0].totalCostUsd).toBe(0.15);
  });

  it('should get agent cost summary', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: [{
        total_requests: '25',
        total_tokens: '10000',
        total_cost_usd: '0.30',
        last_request_at: '2025-02-17T10:00:00Z',
      }],
      error: null,
    });

    const summary = await tracker.getAgentCostSummary('agent-123');

    expect(summary.totalRequests).toBe(25);
    expect(summary.totalCostUsd).toBe(0.30);
    expect(summary.lastRequestAt).toBe('2025-02-17T10:00:00Z');
  });

  it('should clear budget cache', () => {
    tracker.clearCache();
    // Should not throw
    expect(true).toBe(true);
  });

  it('should update configuration', () => {
    tracker.updateConfig({ debug: true, warningThreshold: 0.9 });
    const config = tracker.getConfig();
    
    expect(config.debug).toBe(true);
    expect(config.warningThreshold).toBe(0.9);
  });

  it('should handle singleton pattern correctly', () => {
    const tracker1 = getCostTracker();
    const tracker2 = getCostTracker();
    
    expect(tracker1).toBe(tracker2);
  });

  it('should use global trackCost function', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'cost-123' },
      error: null,
    });

    resetCostTracker();

    const entry = {
      id: 'test-id',
      provider: 'anthropic' as const,
      model: 'claude-3-5-sonnet-20241022',
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.001,
      timestamp: new Date(),
      latencyMs: 1000,
    };

    const result = await trackCost(entry);

    expect(result.success).toBe(true);
  });
});
