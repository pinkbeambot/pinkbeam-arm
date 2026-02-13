/**
 * Unit tests for LLM Router
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMRouter, getLLMRouter, resetLLMRouter } from '@/lib/llm/router';
import { LLMError } from '@/lib/llm/types';

// Mock the Claude provider
vi.mock('@/lib/llm/claude', () => ({
  createClaudeProvider: vi.fn(() => ({
    complete: vi.fn(),
    getModels: vi.fn(() => [
      {
        id: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
        displayName: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        supportsFunctions: true,
        supportsVision: true,
        costPer1KInput: 0.003,
        costPer1KOutput: 0.015,
        latencyProfile: 'balanced',
      },
    ]),
    estimateTokens: vi.fn((text: string) => Math.ceil(text.length / 4)),
    healthCheck: vi.fn(() => Promise.resolve({ healthy: true, latency: 100 })),
  })),
  CLAUDE_MODELS: [
    {
      id: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      displayName: 'Claude 3.5 Sonnet',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsFunctions: true,
      supportsVision: true,
      costPer1KInput: 0.003,
      costPer1KOutput: 0.015,
      latencyProfile: 'balanced',
    },
  ],
}));

describe('LLMRouter', () => {
  beforeEach(() => {
    resetLLMRouter();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const router = getLLMRouter();
      expect(router).toBeInstanceOf(LLMRouter);
      expect(router.getConfig().defaultProvider).toBe('anthropic');
    });

    it('should initialize with custom config', () => {
      const router = getLLMRouter({
        defaultProvider: 'anthropic',
        defaultModel: 'claude-3-opus-20240229',
      });
      expect(router.getConfig().defaultModel).toBe('claude-3-opus-20240229');
    });

    it('should return singleton instance', () => {
      const router1 = getLLMRouter();
      const router2 = getLLMRouter();
      expect(router1).toBe(router2);
    });
  });

  describe('getAvailableModels', () => {
    it('should return available models', () => {
      const router = getLLMRouter();
      const models = router.getAvailableModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].provider).toBe('anthropic');
    });
  });

  describe('makeRoutingDecision', () => {
    it('should use default provider when no model specified', () => {
      const router = getLLMRouter();
      const decision = router.makeRoutingDecision({
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(decision.provider).toBe('anthropic');
      expect(decision.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should use explicitly specified model', () => {
      const router = getLLMRouter();
      const decision = router.makeRoutingDecision({
        messages: [{ role: 'user', content: 'Hello' }],
        config: { model: 'claude-3-opus-20240229' },
      });
      expect(decision.model).toBe('claude-3-opus-20240229');
    });
  });

  describe('selectOptimalModel', () => {
    it('should filter by context length', () => {
      const router = getLLMRouter();
      const model = router.selectOptimalModel({
        contextLength: 150000,
      });
      expect(model).not.toBeNull();
      expect(model!.contextWindow).toBeGreaterThanOrEqual(150000);
    });

    it('should filter by vision support', () => {
      const router = getLLMRouter();
      const model = router.selectOptimalModel({
        requiresVision: true,
      });
      expect(model).not.toBeNull();
      expect(model!.supportsVision).toBe(true);
    });

    it('should return null when no models match', () => {
      const router = getLLMRouter();
      const model = router.selectOptimalModel({
        contextLength: 1000000, // Impossibly large
      });
      expect(model).toBeNull();
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost correctly', () => {
      const router = getLLMRouter();
      const cost = router.estimateCost('claude-3-5-sonnet-20241022', 1000, 500);
      // Claude 3.5 Sonnet: $0.003/1K input, $0.015/1K output
      // Expected: (1000/1000)*0.003 + (500/1000)*0.015 = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 4);
    });

    it('should return 0 for unknown model', () => {
      const router = getLLMRouter();
      const cost = router.estimateCost('unknown-model', 1000, 500);
      expect(cost).toBe(0);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens for text', () => {
      const router = getLLMRouter();
      const tokens = router.estimateTokens('Hello world');
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('createConfigFromPreferences', () => {
    it('should create config from agent preferences', () => {
      const router = getLLMRouter();
      const config = router.createConfigFromPreferences({
        preferredModel: 'claude-3-opus-20240229',
        temperature: 0.5,
        maxTokens: 2000,
      });
      expect(config.model).toBe('claude-3-opus-20240229');
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(2000);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const router = getLLMRouter();
      router.updateConfig({ defaultModel: 'claude-3-haiku-20240307' });
      expect(router.getConfig().defaultModel).toBe('claude-3-haiku-20240307');
    });
  });
});
