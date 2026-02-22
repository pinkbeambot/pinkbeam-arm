import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CostTrackingService,
  selectModelWithCostOptimization,
  calculateEstimatedCost,
  estimateLatency,
  estimateTokenCount,
  estimateMessageTokens,
  formatCost,
  formatTokenCount,
  type TokenUsageEntry,
  type ModelSelectionConfig,
  CostLimitExceededError,
} from '@/lib/llm/cost-tracking';
import type { LLMModel } from '@/lib/llm/types';

// Test models
const TEST_MODELS: LLMModel[] = [
  {
    id: 'cheap-fast',
    provider: 'anthropic',
    displayName: 'Cheap Fast Model',
    contextWindow: 100000,
    maxOutputTokens: 4096,
    supportsFunctions: true,
    supportsVision: false,
    costPer1KInput: 0.001,
    costPer1KOutput: 0.002,
    latencyProfile: 'fast',
  },
  {
    id: 'expensive-quality',
    provider: 'openai',
    displayName: 'Expensive Quality Model',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    supportsFunctions: true,
    supportsVision: true,
    costPer1KInput: 0.01,
    costPer1KOutput: 0.03,
    latencyProfile: 'slow',
  },
  {
    id: 'balanced-model',
    provider: 'google',
    displayName: 'Balanced Model',
    contextWindow: 150000,
    maxOutputTokens: 4096,
    supportsFunctions: true,
    supportsVision: true,
    costPer1KInput: 0.005,
    costPer1KOutput: 0.015,
    latencyProfile: 'balanced',
  },
];

describe('Cost Tracking Service', () => {
  let service: CostTrackingService;

  beforeEach(() => {
    service = new CostTrackingService({ enableBuffering: false });
  });

  describe('track', () => {
    it('should track usage entry', () => {
      const entry = service.track({
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        provider: 'anthropic',
        model: 'claude-3',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        costUsd: 0.002,
        latencyMs: 1000,
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.tenantId).toBe('tenant-1');
    });

    it('should enforce hard limits', () => {
      // Set a very low limit
      service.setLimit({
        id: 'limit-1',
        tenantId: 'tenant-1',
        limitType: 'daily_spend',
        limitValue: 0.001,
        currentValue: 0,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000),
        warningThreshold: 80,
        hardLimit: true,
        alertsEnabled: true,
      });

      expect(() => {
        service.track({
          tenantId: 'tenant-1',
          provider: 'anthropic',
          model: 'claude-3',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          costUsd: 0.002, // Exceeds limit
          latencyMs: 1000,
        });
      }).toThrow(CostLimitExceededError);
    });
  });

  describe('setLimit', () => {
    it('should create usage limit', () => {
      const limit = service.setLimit({
        id: 'limit-1',
        tenantId: 'tenant-1',
        limitType: 'monthly_spend',
        limitValue: 100,
        currentValue: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
        warningThreshold: 80,
        hardLimit: false,
        alertsEnabled: true,
      });

      expect(limit.id).toBe('limit-1');
      expect(limit.tenantId).toBe('tenant-1');
      expect(limit.limitValue).toBe(100);
    });

    it('should set period dates correctly for monthly limits', () => {
      const now = new Date();
      const limit = service.setLimit({
        id: 'limit-1',
        tenantId: 'tenant-1',
        limitType: 'monthly_spend',
        limitValue: 100,
        currentValue: 0,
        periodStart: now,
        periodEnd: now,
        warningThreshold: 80,
        hardLimit: false,
        alertsEnabled: true,
      });

      expect(limit.periodStart.getDate()).toBe(1);
      expect(limit.periodEnd.getDate()).toBeGreaterThan(27); // Last day of month
    });

    it('should set period dates correctly for daily limits', () => {
      const now = new Date();
      const limit = service.setLimit({
        id: 'limit-1',
        tenantId: 'tenant-1',
        limitType: 'daily_spend',
        limitValue: 10,
        currentValue: 0,
        periodStart: now,
        periodEnd: now,
        warningThreshold: 80,
        hardLimit: false,
        alertsEnabled: true,
      });

      expect(limit.periodStart.getDate()).toBe(now.getDate());
      expect(limit.periodEnd.getDate()).toBe(now.getDate());
    });
  });

  describe('getLimits', () => {
    it('should return limits for a tenant', () => {
      service.setLimit({
        id: 'limit-1',
        tenantId: 'tenant-1',
        limitType: 'monthly_spend',
        limitValue: 100,
        currentValue: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
        warningThreshold: 80,
        hardLimit: false,
        alertsEnabled: true,
      });

      service.setLimit({
        id: 'limit-2',
        tenantId: 'tenant-2',
        limitType: 'monthly_spend',
        limitValue: 200,
        currentValue: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
        warningThreshold: 80,
        hardLimit: false,
        alertsEnabled: true,
      });

      const limits = service.getLimits('tenant-1');
      expect(limits).toHaveLength(1);
      expect(limits[0].id).toBe('limit-1');
    });
  });

  describe('onAlert', () => {
    it('should subscribe to alerts', () => {
      const callback = vi.fn();
      const unsubscribe = service.onAlert(callback);

      // Set limit and trigger usage
      service.setLimit({
        id: 'limit-1',
        tenantId: 'tenant-1',
        limitType: 'monthly_spend',
        limitValue: 100,
        currentValue: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
        warningThreshold: 10, // Low threshold for testing
        hardLimit: false,
        alertsEnabled: true,
      });

      service.track({
        tenantId: 'tenant-1',
        provider: 'anthropic',
        model: 'claude-3',
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        costUsd: 50, // Should trigger warning (> 10%)
        latencyMs: 1000,
      });

      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });
  });
});

describe('Model Selection', () => {
  describe('calculateEstimatedCost', () => {
    it('should calculate cost correctly', () => {
      const model = TEST_MODELS[0];
      const cost = calculateEstimatedCost(model, 1000, 500);
      
      // (1000/1000) * 0.001 + (500/1000) * 0.002 = 0.001 + 0.001 = 0.002
      expect(cost).toBe(0.002);
    });
  });

  describe('estimateLatency', () => {
    it('should return correct latency for fast models', () => {
      const latency = estimateLatency(TEST_MODELS[0]);
      expect(latency).toBe(500);
    });

    it('should return correct latency for slow models', () => {
      const latency = estimateLatency(TEST_MODELS[1]);
      expect(latency).toBe(3000);
    });

    it('should return correct latency for balanced models', () => {
      const latency = estimateLatency(TEST_MODELS[2]);
      expect(latency).toBe(1500);
    });
  });

  describe('selectModelWithCostOptimization', () => {
    it('should select cheapest model when budgetPriority is cost', () => {
      const config: ModelSelectionConfig = {
        budgetPriority: 'cost',
      };

      const result = selectModelWithCostOptimization(
        TEST_MODELS,
        1000,
        500,
        config
      );

      expect(result?.model.id).toBe('cheap-fast');
      expect(result?.costEstimate).toBeLessThan(0.01);
    });

    it('should select fastest model when budgetPriority is speed', () => {
      const config: ModelSelectionConfig = {
        budgetPriority: 'speed',
      };

      const result = selectModelWithCostOptimization(
        TEST_MODELS,
        1000,
        500,
        config
      );

      expect(result?.model.latencyProfile).toBe('fast');
    });

    it('should respect cost budget constraint', () => {
      const config: ModelSelectionConfig = {
        budgetPriority: 'quality',
        maxCostPerRequest: 0.01, // Very low budget
      };

      const result = selectModelWithCostOptimization(
        TEST_MODELS,
        10000, // Large token count
        5000,
        config
      );

      // Should still return cheapest model due to budget constraint
      expect(result?.model.id).toBe('cheap-fast');
    });

    it('should filter out blocked models', () => {
      const config: ModelSelectionConfig = {
        budgetPriority: 'cost',
        blockedModels: ['cheap-fast'],
      };

      const result = selectModelWithCostOptimization(
        TEST_MODELS,
        1000,
        500,
        config
      );

      expect(result?.model.id).not.toBe('cheap-fast');
    });

    it('should filter by provider preference', () => {
      const config: ModelSelectionConfig = {
        budgetPriority: 'cost',
        preferredProviders: ['openai'],
      };

      const result = selectModelWithCostOptimization(
        TEST_MODELS,
        1000,
        500,
        config
      );

      expect(result?.model.provider).toBe('openai');
    });

    it('should return null for empty model list', () => {
      const result = selectModelWithCostOptimization(
        [],
        1000,
        500,
        { budgetPriority: 'balanced' }
      );

      expect(result).toBeNull();
    });
  });
});

describe('Token Estimation', () => {
  describe('estimateTokenCount', () => {
    it('should estimate tokens based on character count', () => {
      const text = 'This is a test message';
      const tokens = estimateTokenCount(text);
      // 22 characters / 4 = 5.5, rounded up = 6
      expect(tokens).toBe(6);
    });

    it('should handle empty string', () => {
      expect(estimateTokenCount('')).toBe(0);
    });

    it('should handle long text', () => {
      const text = 'a'.repeat(1000);
      const tokens = estimateTokenCount(text);
      expect(tokens).toBe(250);
    });
  });

  describe('estimateMessageTokens', () => {
    it('should estimate tokens for multiple messages', () => {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const tokens = estimateMessageTokens(messages);
      
      // Should include overhead (4 tokens per message) + content tokens + completion tokens
      expect(tokens).toBeGreaterThan(0);
    });
  });
});

describe('Formatting Utilities', () => {
  describe('formatCost', () => {
    it('should format small costs in cents', () => {
      expect(formatCost(0.005)).toBe('$0.50¢');
      expect(formatCost(0.0099)).toBe('$0.99¢');
    });

    it('should format larger costs in dollars', () => {
      expect(formatCost(0.01)).toBe('$0.0100');
      expect(formatCost(1.5)).toBe('$1.5000');
    });

    it('should handle zero cost', () => {
      expect(formatCost(0)).toBe('$0.00¢');
    });
  });

  describe('formatTokenCount', () => {
    it('should format small numbers', () => {
      expect(formatTokenCount(500)).toBe('500');
    });

    it('should format thousands with K', () => {
      expect(formatTokenCount(1500)).toBe('1.5K');
      expect(formatTokenCount(1000)).toBe('1.0K');
    });

    it('should format millions with M', () => {
      expect(formatTokenCount(1500000)).toBe('1.5M');
      expect(formatTokenCount(1000000)).toBe('1.0M');
    });
  });
});
