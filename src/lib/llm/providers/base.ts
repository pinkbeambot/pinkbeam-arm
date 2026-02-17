/**
 * LLM Provider Types and Base Interface
 * Unified interface for all LLM providers
 */

import {
  LLMProvider,
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMFunction,
} from '../types';

// Provider-specific message formats
export interface ProviderMessage {
  role: string;
  content: string | ProviderContentBlock[];
  name?: string;
}

export interface ProviderContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  tool_use_id?: string;
}

// Tool format for providers
export interface ProviderTool {
  name: string;
  description: string;
  input_schema?: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  parameters?: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Base provider interface
export interface ILLMProvider {
  readonly name: LLMProvider;
  readonly models: LLMModel[];
  
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream?(request: LLMRequest): AsyncGenerator<LLMStreamChunk>;
  healthCheck(): Promise<{ healthy: boolean; latency: number }>;
  estimateTokens(text: string): number;
  getModel(modelId: string): LLMModel | null;
}

// Streaming chunk
export interface LLMStreamChunk {
  content: string;
  functionCall?: Partial<{
    name: string;
    arguments: string;
  }>;
  isComplete: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

// Base provider class with common functionality
export abstract class BaseProvider implements ILLMProvider {
  abstract readonly name: LLMProvider;
  abstract readonly models: LLMModel[];

  abstract complete(request: LLMRequest): Promise<LLMResponse>;
  abstract healthCheck(): Promise<{ healthy: boolean; latency: number }>;

  /**
   * Get model info by ID
   */
  getModel(modelId: string): LLMModel | null {
    return this.models.find(m => m.id === modelId) || null;
  }

  /**
   * Calculate cost based on token usage
   */
  protected calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.getModel(modelId);
    if (!model) return 0;

    const inputCost = (inputTokens / 1000) * model.costPer1KInput;
    const outputCost = (outputTokens / 1000) * model.costPer1KOutput;
    return inputCost + outputCost;
  }

  /**
   * Estimate tokens (default approximation)
   * Override in specific providers if better method available
   */
  estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Convert generic functions to provider tool format
   */
  protected abstract convertTools(functions?: LLMFunction[]): ProviderTool[] | undefined;

  /**
   * Handle API errors consistently
   */
  protected handleError(error: unknown, provider: LLMProvider, retryable: boolean = false): never {
    if (error instanceof Error && error.name === 'LLMError') {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`${provider.toUpperCase()}_ERROR: ${message}`);
  }

  /**
   * Build request URL
   */
  protected buildUrl(baseUrl: string, path: string): string {
    const normalizedBase = baseUrl.replace(/\/$/, '');
    const normalizedPath = path.replace(/^\//, '');
    return `${normalizedBase}/${normalizedPath}`;
  }
}

// Provider factory type
export type ProviderFactory = (config?: Record<string, unknown>) => ILLMProvider;
