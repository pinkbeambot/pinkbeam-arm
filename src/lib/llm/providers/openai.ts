/**
 * OpenAI Provider Implementation
 * Handles API calls to OpenAI's GPT models
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

// OpenAI model definitions
export const OPENAI_MODELS: LLMModel[] = [
  {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsFunctions: true,
    supportsVision: true,
    costPer1KInput: 0.005,
    costPer1KOutput: 0.015,
    latencyProfile: 'balanced',
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    displayName: 'GPT-4o Mini',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsFunctions: true,
    supportsVision: true,
    costPer1KInput: 0.00015,
    costPer1KOutput: 0.0006,
    latencyProfile: 'fast',
  },
  {
    id: 'gpt-4-turbo',
    provider: 'openai',
    displayName: 'GPT-4 Turbo',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsFunctions: true,
    supportsVision: true,
    costPer1KInput: 0.01,
    costPer1KOutput: 0.03,
    latencyProfile: 'slow',
  },
  {
    id: 'gpt-3.5-turbo',
    provider: 'openai',
    displayName: 'GPT-3.5 Turbo',
    contextWindow: 16385,
    maxOutputTokens: 4096,
    supportsFunctions: true,
    supportsVision: false,
    costPer1KInput: 0.0005,
    costPer1KOutput: 0.0015,
    latencyProfile: 'fast',
  },
];

// OpenAI API types
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string | OpenAIContentBlock[] | null;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: OpenAIToolCall[];
}

interface OpenAIContentBlock {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: {
    index: number;
    message: OpenAIMessage;
    finish_reason: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter';
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string | null;
  }[];
}

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  defaultModel?: string;
}

export class OpenAIProvider extends BaseProvider {
  readonly name: LLMProvider = 'openai';
  readonly models = OPENAI_MODELS;
  
  private apiKey: string;
  private baseUrl: string;
  private organization?: string;
  private defaultModel: string;

  constructor(config: OpenAIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.organization = config.organization;
    this.defaultModel = config.defaultModel || 'gpt-4o';
  }

  /**
   * Convert generic messages to OpenAI format
   */
  private convertMessages(messages: LLMMessage[]): OpenAIMessage[] {
    return messages.map(msg => {
      const openaiMsg: OpenAIMessage = {
        role: msg.role === 'function' ? 'function' : 
              msg.role === 'system' ? 'system' : 
              msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      };

      if (msg.name) {
        openaiMsg.name = msg.name;
      }

      if (msg.function_call) {
        openaiMsg.function_call = {
          name: msg.function_call.name,
          arguments: msg.function_call.arguments,
        };
      }

      return openaiMsg;
    });
  }

  /**
   * Convert functions to OpenAI tool format
   */
  protected convertTools(functions?: LLMFunction[]): OpenAITool[] | undefined {
    if (!functions || functions.length === 0) return undefined;

    return functions.map(fn => ({
      type: 'function' as const,
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      },
    }));
  }

  /**
   * Send completion request to OpenAI
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const messages = this.convertMessages(request.messages);
      const tools = this.convertTools(request.config?.functions);
      const model = request.config?.model || this.defaultModel;

      const requestBody: Record<string, unknown> = {
        model,
        messages,
        max_tokens: request.config?.maxTokens || 4096,
      };

      if (tools && tools.length > 0) {
        requestBody.tools = tools;
        if (request.config?.functionCall) {
          requestBody.tool_choice = request.config.functionCall === 'auto' ? 'auto' :
            request.config.functionCall === 'none' ? 'none' :
            { type: 'function', function: { name: request.config.functionCall.name } };
        }
      }

      if (request.config?.temperature !== undefined) {
        requestBody.temperature = request.config.temperature;
      }

      if (request.config?.topP !== undefined) {
        requestBody.top_p = request.config.topP;
      }

      if (request.config?.frequencyPenalty !== undefined) {
        requestBody.frequency_penalty = request.config.frequencyPenalty;
      }

      if (request.config?.presencePenalty !== undefined) {
        requestBody.presence_penalty = request.config.presencePenalty;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        
        throw new Error(`OPENAI_${response.status}: ${errorMessage}`);
      }

      const data: OpenAIResponse = await response.json();
      const latencyMs = Date.now() - startTime;

      const choice = data.choices[0];
      const message = choice.message;

      // Extract content and potential function call
      let content = '';
      let functionCall: LLMResponse['functionCall'] | undefined;

      if (typeof message.content === 'string') {
        content = message.content;
      }

      // Handle tool calls (newer OpenAI API)
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        if (toolCall.type === 'function') {
          try {
            functionCall = {
              name: toolCall.function.name,
              arguments: JSON.parse(toolCall.function.arguments),
            };
          } catch {
            functionCall = {
              name: toolCall.function.name,
              arguments: { raw: toolCall.function.arguments },
            };
          }
        }
      }

      // Handle legacy function_call
      if (message.function_call) {
        try {
          functionCall = {
            name: message.function_call.name,
            arguments: JSON.parse(message.function_call.arguments),
          };
        } catch {
          functionCall = {
            name: message.function_call.name,
            arguments: { raw: message.function_call.arguments },
          };
        }
      }

      // Calculate cost
      const costUsd = this.calculateCost(
        model,
        data.usage.prompt_tokens,
        data.usage.completion_tokens
      );

      return {
        content,
        functionCall,
        usage: {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
          costUsd,
        },
        model: data.model,
        latencyMs,
        finishReason: choice.finish_reason === 'tool_calls' ? 'function_call' :
                     choice.finish_reason === 'length' ? 'length' :
                     choice.finish_reason === 'stop' ? 'stop' : 'error',
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Stream completion from OpenAI
   */
  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const messages = this.convertMessages(request.messages);
    const tools = this.convertTools(request.config?.functions);
    const model = request.config?.model || this.defaultModel;

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      max_tokens: request.config?.maxTokens || 4096,
      stream: true,
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
    }

    if (request.config?.temperature !== undefined) {
      requestBody.temperature = request.config.temperature;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OPENAI_STREAM_ERROR: Stream failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('STREAM_ERROR: No response body');
    }

    let buffer = '';
    let functionName = '';
    let functionArgs = '';

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
              const chunk: OpenAIStreamChunk = JSON.parse(data);
              const delta = chunk.choices[0]?.delta;

              if (delta?.content) {
                yield {
                  content: delta.content,
                  isComplete: false,
                };
              }

              if (delta?.tool_calls) {
                const toolCall = delta.tool_calls[0];
                if (toolCall?.function?.name) {
                  functionName += toolCall.function.name;
                }
                if (toolCall?.function?.arguments) {
                  functionArgs += toolCall.function.arguments;
                }
              }

              if (chunk.choices[0]?.finish_reason) {
                yield {
                  content: '',
                  functionCall: functionName ? {
                    name: functionName,
                    arguments: functionArgs,
                  } : undefined,
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
   * Count tokens using tiktoken approximation
   * OpenAI models generally use ~4 chars per token
   */
  estimateTokens(text: string): number {
    // More accurate approximation for OpenAI models
    // GPT models use roughly 4 characters per token on average for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if provider is healthy
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const startTime = Date.now();
    
    try {
      // OpenAI doesn't have a simple health endpoint, so we check models
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
 * Factory function to create OpenAI provider
 */
export function createOpenAIProvider(config?: Partial<OpenAIConfig>): OpenAIProvider {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('CONFIG_MISSING: OPENAI_API_KEY environment variable is required');
  }

  return new OpenAIProvider({
    apiKey,
    baseUrl: config?.baseUrl,
    organization: config?.organization,
    defaultModel: config?.defaultModel || 'gpt-4o',
  });
}
