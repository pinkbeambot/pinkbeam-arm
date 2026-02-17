/**
 * LLM Provider Tests
 * Tests for Anthropic, OpenAI, and Google providers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AnthropicProvider,
  OpenAIProvider,
  GoogleProvider,
  CLAUDE_MODELS,
  OPENAI_MODELS,
  GEMINI_MODELS,
  LLMError,
} from '../providers';
import type { LLMRequest } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider({
      apiKey: 'test-api-key',
      defaultModel: 'claude-3-5-sonnet-20241022',
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct configuration', () => {
    expect(provider.name).toBe('anthropic');
    expect(provider.getDefaultModel()).toBe('claude-3-5-sonnet-20241022');
    expect(provider.models).toEqual(CLAUDE_MODELS);
  });

  it('should return correct model info', () => {
    const model = provider.getModel('claude-3-5-sonnet-20241022');
    expect(model).toBeDefined();
    expect(model?.provider).toBe('anthropic');
    expect(model?.supportsFunctions).toBe(true);
  });

  it('should complete a request successfully', async () => {
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

    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Hi!' }],
    };

    const response = await provider.complete(request);

    expect(response.content).toBe('Hello!');
    expect(response.model).toBe('claude-3-5-sonnet-20241022');
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
          id: 'tool_1',
          name: 'get_weather',
          input: { location: 'San Francisco' },
        }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'tool_use',
        usage: { input_tokens: 20, output_tokens: 15 },
      }),
    });

    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'What is the weather?' }],
      config: {
        functions: [{
          name: 'get_weather',
          description: 'Get weather information',
          parameters: {
            type: 'object',
            properties: { location: { type: 'string' } },
            required: ['location'],
          },
        }],
      },
    };

    const response = await provider.complete(request);

    expect(response.functionCall).toBeDefined();
    expect(response.functionCall?.name).toBe('get_weather');
    expect(response.functionCall?.arguments).toEqual({ location: 'San Francisco' });
    expect(response.finishReason).toBe('function_call');
  });

  it('should throw LLMError on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Hi!' }],
    };

    await expect(provider.complete(request)).rejects.toThrow(LLMError);
    await expect(provider.complete(request)).rejects.toThrow('Rate limit exceeded');
  });

  it('should estimate tokens correctly', () => {
    const text = 'Hello world'; // 11 chars
    const tokens = provider.estimateTokens(text);
    expect(tokens).toBe(3); // ceil(11/4)
  });

  it('should perform health check', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const health = await provider.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.latency).toBeGreaterThanOrEqual(0);
  });
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'test-api-key',
      defaultModel: 'gpt-4o',
    });
    mockFetch.mockClear();
  });

  it('should initialize with correct configuration', () => {
    expect(provider.name).toBe('openai');
    expect(provider.models).toEqual(OPENAI_MODELS);
  });

  it('should complete a request successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'chatcmpl_123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    });

    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Hi!' }],
    };

    const response = await provider.complete(request);

    expect(response.content).toBe('Hello!');
    expect(response.model).toBe('gpt-4o');
    expect(response.usage.inputTokens).toBe(10);
    expect(response.finishReason).toBe('stop');
  });

  it('should handle tool calls', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'chatcmpl_123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call_1',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: '{"location":"San Francisco"}',
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
        usage: { prompt_tokens: 20, completion_tokens: 15, total_tokens: 35 },
      }),
    });

    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'What is the weather?' }],
      config: {
        functions: [{
          name: 'get_weather',
          description: 'Get weather information',
          parameters: {
            type: 'object',
            properties: { location: { type: 'string' } },
          },
        }],
      },
    };

    const response = await provider.complete(request);

    expect(response.functionCall?.name).toBe('get_weather');
    expect(response.functionCall?.arguments).toEqual({ location: 'San Francisco' });
  });

  it('should calculate cost correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'chatcmpl_123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
      }),
    });

    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Hi!' }],
      config: { model: 'gpt-4o' },
    };

    const response = await provider.complete(request);

    // GPT-4o: $0.005 per 1K input, $0.015 per 1K output
    // 1000 input tokens = $0.005, 500 output tokens = $0.0075
    expect(response.usage.costUsd).toBeCloseTo(0.0125, 4);
  });
});

describe('GoogleProvider', () => {
  let provider: GoogleProvider;

  beforeEach(() => {
    provider = new GoogleProvider({
      apiKey: 'test-api-key',
      defaultModel: 'gemini-1.5-pro',
    });
    mockFetch.mockClear();
  });

  it('should initialize with correct configuration', () => {
    expect(provider.name).toBe('google');
    expect(provider.models).toEqual(GEMINI_MODELS);
  });

  it('should complete a request successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            role: 'model',
            parts: [{ text: 'Hello!' }],
          },
          finishReason: 'STOP',
          safetyRatings: [],
        }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      }),
    });

    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Hi!' }],
    };

    const response = await provider.complete(request);

    expect(response.content).toBe('Hello!');
    expect(response.usage.inputTokens).toBe(10);
    expect(response.finishReason).toBe('stop');
  });

  it('should handle content blocking', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [],
        promptFeedback: {
          safetyRatings: [{
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            probability: 'HIGH',
          }],
        },
      }),
    });

    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Harmful content' }],
    };

    await expect(provider.complete(request)).rejects.toThrow('Content blocked by safety filters');
  });
});
