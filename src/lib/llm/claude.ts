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
  LLMError,
  AnthropicConfig,
  CostTrackingEntry,
} from './types';

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
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
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

interface AnthropicToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: (AnthropicContentBlock | AnthropicToolUse)[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeProvider {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.defaultModel = config.defaultModel || 'claude-3-5-sonnet-20241022';
  }

  /**
   * Get available models
   */
  getModels(): LLMModel[] {
    return CLAUDE_MODELS;
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
      }
      // Note: Claude doesn't support 'function' role directly, it's handled via tool_use
    }

    return { system: systemPrompt, messages: anthropicMessages };
  }

  /**
   * Convert functions to Anthropic tools format
   */
  private convertTools(functions?: import('./types').LLMFunction[]): AnthropicTool[] | undefined {
    if (!functions || functions.length === 0) return undefined;

    return functions.map(fn => ({
      name: fn.name,
      description: fn.description,
      input_schema: fn.parameters,
    }));
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelInfo = CLAUDE_MODELS.find(m => m.id === model);
    if (!modelInfo) return 0;

    const inputCost = (inputTokens / 1000) * modelInfo.costPer1KInput;
    const outputCost = (outputTokens / 1000) * modelInfo.costPer1KOutput;
    return inputCost + outputCost;
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
        
        throw new LLMError(
          `ANTHROPIC_${response.status}`,
          errorMessage,
          response.status >= 500 || response.status === 429,
          'anthropic'
        );
      }

      const data: AnthropicResponse = await response.json();
      const latencyMs = Date.now() - startTime;

      // Extract content and potential function call
      let content = '';
      let functionCall: LLMResponse['functionCall'] | undefined;

      for (const block of data.content) {
        if (block.type === 'text' && 'text' in block) {
          content += block.text;
        } else if (block.type === 'tool_use') {
          const toolUse = block as AnthropicToolUse;
          functionCall = {
            name: toolUse.name,
            arguments: toolUse.input,
          };
        }
      }

      // Calculate cost
      const costUsd = this.calculateCost(
        model,
        data.usage.input_tokens,
        data.usage.output_tokens
      );

      // Track cost if enabled
      if (request.trackCost !== false) {
        await this.trackCost({
          id: crypto.randomUUID(),
          agentId: request.agentId,
          tenantId: request.tenantId,
          taskId: request.taskId,
          provider: 'anthropic',
          model,
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          costUsd,
          timestamp: new Date(),
          latencyMs,
        });
      }

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
      if (error instanceof LLMError) {
        throw error;
      }

      throw new LLMError(
        'ANTHROPIC_ERROR',
        error instanceof Error ? error.message : 'Unknown error calling Claude',
        true,
        'anthropic'
      );
    }
  }

  /**
   * Track cost for analytics
   */
  private async trackCost(entry: CostTrackingEntry): Promise<void> {
    // This would typically insert into a database
    // For now, we just log it
    console.log('[LLM Cost]', JSON.stringify({
      provider: entry.provider,
      model: entry.model,
      costUsd: entry.costUsd,
      tokens: entry.inputTokens + entry.outputTokens,
      latencyMs: entry.latencyMs,
    }));
  }

  /**
   * Count tokens in text (approximate)
   * Note: This is a rough estimate. For accurate counts, use the API.
   */
  estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
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

// Factory function to create Claude provider
export function createClaudeProvider(config?: Partial<AnthropicConfig>): ClaudeProvider {
  const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new LLMError(
      'CONFIG_MISSING',
      'ANTHROPIC_API_KEY environment variable is required',
      false,
      'anthropic'
    );
  }

  return new ClaudeProvider({
    apiKey,
    baseUrl: config?.baseUrl,
    defaultModel: config?.defaultModel || 'claude-3-5-sonnet-20241022',
  });
}
