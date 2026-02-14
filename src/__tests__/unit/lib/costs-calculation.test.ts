/**
 * Unit tests for LLM Cost Calculation
 * Issue #117: LLM cost tracking persistence
 */

import { describe, it, expect } from 'vitest';

// Replicate the cost calculation function for testing
function calculateLLMCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCostUsd: number; outputCostUsd: number } {
  // Pricing per 1M tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-3-opus': { input: 15.0, output: 75.0 },
    'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    'gpt-4': { input: 30.0, output: 60.0 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  };

  const modelPricing = pricing[model] || pricing['claude-3-5-sonnet'];
  
  return {
    inputCostUsd: (inputTokens / 1_000_000) * modelPricing.input,
    outputCostUsd: (outputTokens / 1_000_000) * modelPricing.output,
  };
}

describe('LLM Cost Calculation', () => {
  describe('Claude 3.5 Sonnet', () => {
    it('should calculate cost for 1000 input tokens', () => {
      const result = calculateLLMCost('claude-3-5-sonnet', 1000, 0);
      expect(result.inputCostUsd).toBeCloseTo(0.003, 6);
      expect(result.outputCostUsd).toBe(0);
    });

    it('should calculate cost for 1000 output tokens', () => {
      const result = calculateLLMCost('claude-3-5-sonnet', 0, 1000);
      expect(result.inputCostUsd).toBe(0);
      expect(result.outputCostUsd).toBeCloseTo(0.015, 6);
    });

    it('should calculate cost for mixed tokens', () => {
      const result = calculateLLMCost('claude-3-5-sonnet', 2000, 1000);
      expect(result.inputCostUsd).toBeCloseTo(0.006, 6);
      expect(result.outputCostUsd).toBeCloseTo(0.015, 6);
    });

    it('should calculate cost for large token counts', () => {
      const result = calculateLLMCost('claude-3-5-sonnet', 1_000_000, 500_000);
      expect(result.inputCostUsd).toBe(3.0);
      expect(result.outputCostUsd).toBe(7.5);
    });
  });

  describe('Claude 3 Opus', () => {
    it('should calculate cost for 1000 input tokens', () => {
      const result = calculateLLMCost('claude-3-opus', 1000, 0);
      expect(result.inputCostUsd).toBeCloseTo(0.015, 6);
    });

    it('should calculate cost for 1000 output tokens', () => {
      const result = calculateLLMCost('claude-3-opus', 0, 1000);
      expect(result.outputCostUsd).toBeCloseTo(0.075, 6);
    });

    it('should be more expensive than Sonnet', () => {
      const opusResult = calculateLLMCost('claude-3-opus', 10000, 5000);
      const sonnetResult = calculateLLMCost('claude-3-5-sonnet', 10000, 5000);
      
      expect(opusResult.inputCostUsd).toBeGreaterThan(sonnetResult.inputCostUsd);
      expect(opusResult.outputCostUsd).toBeGreaterThan(sonnetResult.outputCostUsd);
    });
  });

  describe('Claude 3 Haiku', () => {
    it('should calculate cost for 1000 input tokens', () => {
      const result = calculateLLMCost('claude-3-haiku', 1000, 0);
      expect(result.inputCostUsd).toBeCloseTo(0.00025, 6);
    });

    it('should calculate cost for 1000 output tokens', () => {
      const result = calculateLLMCost('claude-3-haiku', 0, 1000);
      expect(result.outputCostUsd).toBeCloseTo(0.00125, 6);
    });

    it('should be cheaper than Sonnet', () => {
      const haikuResult = calculateLLMCost('claude-3-haiku', 10000, 5000);
      const sonnetResult = calculateLLMCost('claude-3-5-sonnet', 10000, 5000);
      
      expect(haikuResult.inputCostUsd).toBeLessThan(sonnetResult.inputCostUsd);
      expect(haikuResult.outputCostUsd).toBeLessThan(sonnetResult.outputCostUsd);
    });
  });

  describe('GPT-4', () => {
    it('should calculate cost for 1000 input tokens', () => {
      const result = calculateLLMCost('gpt-4', 1000, 0);
      expect(result.inputCostUsd).toBeCloseTo(0.03, 6);
    });

    it('should calculate cost for 1000 output tokens', () => {
      const result = calculateLLMCost('gpt-4', 0, 1000);
      expect(result.outputCostUsd).toBeCloseTo(0.06, 6);
    });
  });

  describe('GPT-4 Turbo', () => {
    it('should calculate cost for 1000 input tokens', () => {
      const result = calculateLLMCost('gpt-4-turbo', 1000, 0);
      expect(result.inputCostUsd).toBeCloseTo(0.01, 6);
    });

    it('should calculate cost for 1000 output tokens', () => {
      const result = calculateLLMCost('gpt-4-turbo', 0, 1000);
      expect(result.outputCostUsd).toBeCloseTo(0.03, 6);
    });
  });

  describe('GPT-3.5 Turbo', () => {
    it('should calculate cost for 1000 input tokens', () => {
      const result = calculateLLMCost('gpt-3.5-turbo', 1000, 0);
      expect(result.inputCostUsd).toBeCloseTo(0.0005, 6);
    });

    it('should calculate cost for 1000 output tokens', () => {
      const result = calculateLLMCost('gpt-3.5-turbo', 0, 1000);
      expect(result.outputCostUsd).toBeCloseTo(0.0015, 6);
    });

    it('should be cheaper than GPT-4', () => {
      const gpt35Result = calculateLLMCost('gpt-3.5-turbo', 10000, 5000);
      const gpt4Result = calculateLLMCost('gpt-4-turbo', 10000, 5000);
      
      expect(gpt35Result.inputCostUsd).toBeLessThan(gpt4Result.inputCostUsd);
      expect(gpt35Result.outputCostUsd).toBeLessThan(gpt4Result.outputCostUsd);
    });
  });

  describe('Unknown model', () => {
    it('should default to Claude 3.5 Sonnet pricing for unknown models', () => {
      const unknownResult = calculateLLMCost('unknown-model', 1000, 1000);
      const sonnetResult = calculateLLMCost('claude-3-5-sonnet', 1000, 1000);
      
      expect(unknownResult.inputCostUsd).toBe(sonnetResult.inputCostUsd);
      expect(unknownResult.outputCostUsd).toBe(sonnetResult.outputCostUsd);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero tokens', () => {
      const result = calculateLLMCost('claude-3-5-sonnet', 0, 0);
      expect(result.inputCostUsd).toBe(0);
      expect(result.outputCostUsd).toBe(0);
    });

    it('should handle single token', () => {
      const result = calculateLLMCost('claude-3-5-sonnet', 1, 1);
      expect(result.inputCostUsd).toBeCloseTo(0.000003, 9);
      expect(result.outputCostUsd).toBeCloseTo(0.000015, 9);
    });

    it('should handle large token counts', () => {
      const result = calculateLLMCost('claude-3-5-sonnet', 10_000_000, 10_000_000);
      expect(result.inputCostUsd).toBe(30.0);
      expect(result.outputCostUsd).toBe(150.0);
    });

    it('should maintain precision for small calculations', () => {
      const result = calculateLLMCost('claude-3-haiku', 100, 50);
      expect(result.inputCostUsd).toBeCloseTo(0.000025, 9);
      expect(result.outputCostUsd).toBeCloseTo(0.0000625, 9);
    });
  });
});
