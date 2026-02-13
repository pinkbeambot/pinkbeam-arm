/**
 * LLM Router - Type definitions
 * Defines types for LLM providers and routing
 */

// Supported LLM providers
export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'local';

// Model information
export interface LLMModel {
  id: string;
  provider: LLMProvider;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsFunctions: boolean;
  supportsVision: boolean;
  costPer1KInput: number; // USD
  costPer1KOutput: number; // USD
  latencyProfile: 'fast' | 'balanced' | 'slow';
}

// Message types
export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

export interface LLMMessage {
  role: MessageRole;
  content: string;
  name?: string; // For function messages
  function_call?: {
    name: string;
    arguments: string;
  };
}

// Function calling
export interface LLMFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Request configuration
export interface LLMRequestConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  functions?: LLMFunction[];
  functionCall?: 'auto' | 'none' | { name: string };
  timeoutMs?: number;
  retries?: number;
}

// Request payload
export interface LLMRequest {
  messages: LLMMessage[];
  config?: LLMRequestConfig;
  agentId?: string;
  tenantId?: string;
  taskId?: string;
  trackCost?: boolean;
}

// Response from LLM
export interface LLMResponse {
  content: string;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
  };
  model: string;
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'function_call' | 'error';
}

// Router configuration
export interface RouterConfig {
  defaultProvider: LLMProvider;
  defaultModel: string;
  fallbackEnabled: boolean;
  fallbackProviders: LLMProvider[];
  costOptimization: boolean;
  latencyTarget: 'fast' | 'balanced' | 'quality';
}

// Routing decision
export interface RoutingDecision {
  provider: LLMProvider;
  model: string;
  reason: string;
  estimatedCost: number;
  estimatedLatency: number;
}

// Provider-specific configurations
export interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
}

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  defaultModel: string;
}

export interface GoogleConfig {
  apiKey: string;
  defaultModel: string;
}

export interface LocalConfig {
  baseUrl: string;
  defaultModel: string;
}

// Provider configurations map
export interface ProviderConfigs {
  anthropic?: AnthropicConfig;
  openai?: OpenAIConfig;
  google?: GoogleConfig;
  local?: LocalConfig;
}

// Error types
export class LLMError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean = false,
    public provider?: LLMProvider
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// Cost tracking
export interface CostTrackingEntry {
  id: string;
  agentId?: string;
  tenantId?: string;
  taskId?: string;
  provider: LLMProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: Date;
  latencyMs: number;
}

// Agent LLM preferences
export interface AgentLLMPreferences {
  preferredProvider?: LLMProvider;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  costBudget?: number;
  latencyPreference?: 'fast' | 'balanced' | 'quality';
}

// Streaming response (for future implementation)
export interface LLMStreamChunk {
  content: string;
  functionCall?: Partial<{
    name: string;
    arguments: string;
  }>;
  isComplete: boolean;
}
