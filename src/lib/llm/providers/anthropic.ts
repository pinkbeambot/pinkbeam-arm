/**
 * Anthropic Claude Provider Implementation
 * Handles API calls to Anthropic's Claude models
 */

import {
  LLMProvider,
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMMessage,
  LLMFunction,
} from '../types';
import { BaseProvider, ProviderTool, LLMStreamChunk } from './base';

// Claude model definitions
export const CLAUDE_MODELS: LLMModel[] = [
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
  {
    id: 'claude-3-opus-20240229',
    provider: 'anthropic',
    displayName: 'Claude 3 Opus',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    supportsFunctions: true,
    supportsVision: true,
    costPer1KInput: 0.015,
    costPer1KOutput: 0.075,
    latencyProfile: 'slow',
  },
  {
    id: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    displayName: 'Claude 3 Haiku',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    supportsFunctions: true,
    supportsVision: true,
    costPer1KInput: 0.00025,
    costPer1KOutput: 0.00125,
    latencyProfile: 'fast',
  },
];

// Anthropic API types
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: 'text' | 'image' | 'tool_use';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface AnthropicToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 
        'content_block_stop' | 'message_delta' | 'message_stop';
  message?: AnthropicResponse;
  index?: number;
  content_block?: AnthropicContentBlock;
  delta?: {
    type?: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
    stop_reason?: string;
  };
  usage?: {
    output_tokens: number;
  };
}

export interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class AnthropicProvider extends BaseProvider {
  readonly name: LLMProvider = 'anthropic';
  readonly models = CLAUDE_MODELS;
  
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: AnthropicConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.defaultModel = config.defaultModel || 'claude-3-5-sonnet-20241022';
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Convert generic messages to Anthropic format
   */
  private convertMessages(messages: LLMMessage[]): { system?: string; messages: AnthropicMessage[] } {
    let systemPrompt: string | undefined;
    const anthropicMessages: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else if (msg.role === 'user') {
        anthropicMessages.push({
          role: 'user',
          content: msg.content,
        });
      } else if (msg.role === 'assistant') {
        anthropicMessages.push({
          role: 'assistant',
          content: msg.content,
        });
      } else if (msg.role === 'function') {
        // Convert function results to tool results
        anthropicMessages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.name || 'unknown',
            content: msg.content,
          } as unknown as AnthropicContentBlock],
        });
      }
    }

    return { system: systemPrompt, messages: anthropicMessages };
  }

  /**
   * Convert functions to Anthropic tool format
   */
  protected convertTools(functions?: LLMFunction[]): AnthropicTool[] | undefined {
    if (!functions || functions.length === 0) return undefined;

    return functions.map(fn => ({
      name: fn.name,
      description: fn.description,
      input_schema: fn.parameters,
    }));
  }

  /**
   * Send completion request to Claude
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const { system, messages } = this.convertMessages(request.messages);
      const tools = this.convertTools(request.config?.functions);
      const model = request.config?.model || this.defaultModel;

      const requestBody: Record<string, unknown> = {
        model,
        max_tokens: request.config?.maxTokens || 4096,
        messages,
      };

      if (system) {
        requestBody.system = system;
      }

      if (tools && tools.length > 0) {
        requestBody.tools = tools;
        if (request.config?.functionCall && request.config.functionCall !== 'auto' && request.config.functionCall !== 'none') {
          requestBody.tool_choice = {
            type: 'tool',
            name: request.config.functionCall.name,
          };
        }
      }

      if (request.config?.temperature !== undefined) {
        requestBody.temperature = request.config.temperature;
      }

      if (request.config?.topP !== undefined) {
        requestBody.top_p = request.config.topP;
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        
        throw new Error(`ANTHROPIC_${response.status}: ${errorMessage}`);
      }

      const data: AnthropicResponse = await response.json();
      const latencyMs = Date.now() - startTime;

      // Extract content and potential function call
      let content = '';
      let functionCall: LLMResponse['functionCall'] | undefined;

      for (const block of data.content) {
        if (block.type === 'text' && block.text) {
          content += block.text;
        } else if (block.type === 'tool_use') {
          functionCall = {
            name: block.name || 'unknown',
            arguments: block.input || {},
          };
        }
      }

      // Calculate cost
      const costUsd = this.calculateCost(
        model,
        data.usage.input_tokens,
        data.usage.output_tokens
      );

      return {
        content,
        functionCall,
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          costUsd,
        },
        model: data.model,
        latencyMs,
        finishReason: data.stop_reason === 'tool_use' ? 'function_call' :
                     data.stop_reason === 'max_tokens' ? 'length' : 'stop',
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Stream completion from Claude
   */
  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const { system, messages } = this.convertMessages(request.messages);
    const tools = this.convertTools(request.config?.functions);
    const model = request.config?.model || this.defaultModel;

    const requestBody: Record<string, unknown> = {
      model,
      max_tokens: request.config?.maxTokens || 4096,
      messages,
      stream: true,
    };

    if (system) {
      requestBody.system = system;
    }

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`ANTHROPIC_STREAM_ERROR: Stream failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('STREAM_ERROR: No response body');
    }

    let buffer = '';
    let currentContent = '';
    let functionName = '';
    let functionArgsBuffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield {
                content: '',
                isComplete: true,
              };
              return;
            }

            try {
              const event: AnthropicStreamEvent = JSON.parse(data);

              if (event.type === 'content_block_delta' && event.delta) {
                if (event.delta.type === 'text_delta' && event.delta.text) {
                  currentContent += event.delta.text;
                  yield {
                    content: event.delta.text,
                    isComplete: false,
                  };
                } else if (event.delta.type === 'input_json_delta' && event.delta.partial_json) {
                  functionArgsBuffer += event.delta.partial_json;
                }
              }

              if (event.type === 'content_block_start' && event.content_block) {
                if (event.content_block.type === 'tool_use') {
                  functionName = event.content_block.name || '';
                }
              }

              if (event.type === 'message_stop') {
                let functionCall: LLMStreamChunk['functionCall'] | undefined;
                
                if (functionName) {
                  try {
                    functionCall = {
                      name: functionName,
                      arguments: functionArgsBuffer,
                    };
                  } catch {
                    // Invalid JSON, pass raw
                  }
                }

                yield {
                  content: '',
                  functionCall,
                  isComplete: true,
                };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if provider is healthy
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });

      return {
        healthy: response.ok,
        latency: Date.now() - startTime,
      };
    } catch {
      return {
        healthy: false,
        latency: Date.now() - startTime,
      };
    }
  }
}

/**
 * Factory function to create Anthropic provider
 */
export function createAnthropicProvider(config?: Partial<AnthropicConfig>): AnthropicProvider {
  const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('CONFIG_MISSING: ANTHROPIC_API_KEY environment variable is required');
  }

  return new AnthropicProvider({
    apiKey,
    baseUrl: config?.baseUrl,
    defaultModel: config?.defaultModel || 'claude-3-5-sonnet-20241022',
  });
}

// Backward compatibility
export const ClaudeProvider = AnthropicProvider;
export const createClaudeProvider = createAnthropicProvider;
