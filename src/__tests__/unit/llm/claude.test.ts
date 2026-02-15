/**
 * Unit tests for Claude Provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeProvider, createClaudeProvider } from '@/lib/llm/claude';
import { LLMError } from '@/lib/llm/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClaudeProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      const provider = new ClaudeProvider({
        apiKey: 'test-api-key',
        defaultModel: 'claude-3-5-sonnet-20241022',
      });
      expect(provider).toBeInstanceOf(ClaudeProvider);
      expect(provider.getDefaultModel()).toBe('claude-3-5-sonnet-20241022');
    });

    it('should use custom base URL', () => {
      const provider = new ClaudeProvider({
        apiKey: 'test-api-key',
        baseUrl: 'https://custom.anthropic.com',
        defaultModel: 'claude-3-5-sonnet-20241022',
      });
      expect(provider).toBeInstanceOf(ClaudeProvider);
    });
  });

  describe('getModels', () => {
    it('should return available models', () => {
      const provider = new ClaudeProvider({ apiKey: 'test', defaultModel: 'claude-3-5-sonnet-20241022' });
      const models = provider.getModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].provider).toBe('anthropic');
    });
  });

  describe('complete', () => {
    it('should successfully complete a request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello!' }],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const provider = new ClaudeProvider({ apiKey: 'test', defaultModel: 'claude-3-5-sonnet-20241022' });
      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.content).toBe('Hello!');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(5);
      expect(response.finishReason).toBe('stop');
    });

    it('should handle function calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: 'tool_123',
            name: 'get_weather',
            input: { location: 'San Francisco' },
          }],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'tool_use',
          usage: { input_tokens: 20, output_tokens: 15 },
        }),
      });

      const provider = new ClaudeProvider({ apiKey: 'test', defaultModel: 'claude-3-5-sonnet-20241022' });
      const response = await provider.complete({
        messages: [{ role: 'user', content: 'What is the weather?' }],
        config: {
          functions: [{
            name: 'get_weather',
            description: 'Get weather for a location',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
            },
          }],
        },
      });

      expect(response.functionCall).toBeDefined();
      expect(response.functionCall!.name).toBe('get_weather');
      expect(response.functionCall!.arguments).toEqual({ location: 'San Francisco' });
      expect(response.finishReason).toBe('function_call');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      });

      const provider = new ClaudeProvider({ apiKey: 'invalid', defaultModel: 'claude-3-5-sonnet-20241022' });

      await expect(provider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow(LLMError);
    });

    it('should handle max tokens reached', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Partial response...' }],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'max_tokens',
          usage: { input_tokens: 10, output_tokens: 100 },
        }),
      });

      const provider = new ClaudeProvider({ apiKey: 'test', defaultModel: 'claude-3-5-sonnet-20241022' });
      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Write a long story' }],
      });

      expect(response.finishReason).toBe('length');
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly for Sonnet', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello!' }],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'end_turn',
          usage: { input_tokens: 1000, output_tokens: 500 },
        }),
      });

      const provider = new ClaudeProvider({ apiKey: 'test', defaultModel: 'claude-3-5-sonnet-20241022' });
      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      // Sonnet: $0.003/1K input, $0.015/1K output
      // (1000/1000)*0.003 + (500/1000)*0.015 = 0.003 + 0.0075 = 0.0105
      expect(response.usage.costUsd).toBeCloseTo(0.0105, 4);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when API responds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const provider = new ClaudeProvider({ apiKey: 'test', defaultModel: 'claude-3-5-sonnet-20241022' });
      const health = await provider.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const provider = new ClaudeProvider({ apiKey: 'test', defaultModel: 'claude-3-5-sonnet-20241022' });
      const health = await provider.healthCheck();

      expect(health.healthy).toBe(false);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens correctly', () => {
      const provider = new ClaudeProvider({ apiKey: 'test', defaultModel: 'claude-3-5-sonnet-20241022' });
      const tokens = provider.estimateTokens('Hello world');
      expect(tokens).toBe(3); // 11 chars / 4 = 2.75, ceil = 3
    });

    it('should handle empty string', () => {
      const provider = new ClaudeProvider({ apiKey: 'test', defaultModel: 'claude-3-5-sonnet-20241022' });
      const tokens = provider.estimateTokens('');
      expect(tokens).toBe(0);
    });
  });
});

describe('createClaudeProvider', () => {
  it('should create provider with environment variable', () => {
    process.env.ANTHROPIC_API_KEY = 'env-api-key';
    const provider = createClaudeProvider();
    expect(provider).toBeInstanceOf(ClaudeProvider);
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should throw error when API key is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => createClaudeProvider()).toThrow(LLMError);
  });

  it('should use provided config over environment', () => {
    process.env.ANTHROPIC_API_KEY = 'env-api-key';
    const provider = createClaudeProvider({ apiKey: 'provided-key', defaultModel: 'claude-3-5-sonnet-20241022' });
    expect(provider).toBeInstanceOf(ClaudeProvider);
    delete process.env.ANTHROPIC_API_KEY;
  });
});
