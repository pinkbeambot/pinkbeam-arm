/**
 * LLM Router Module
 * 
 * Provides unified interface for routing LLM requests to multiple providers
<<<<<<< HEAD
 * with support for:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Cost optimization and token tracking
 * - Streaming responses
 * - Prompt management and A/B testing
 * - Multi-model support (Claude, GPT-4, Ollama)
 * 
 * @example
 * ```typescript
 * import { getLLMRouter, complete, stream } from '@/lib/llm';
 * 
 * // Using the router directly
 * const router = getLLMRouter();
 * 
 * // Regular completion
 * const response = await router.complete({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   config: { model: 'claude-3-5-sonnet-20241022' },
 * });
 * 
 * // Streaming completion
 * await router.stream(
 *   { messages: [{ role: 'user', content: 'Hello!' }] },
 *   {
 *     onChunk: (chunk) => console.log(chunk),
 *     onComplete: (response) => console.log('Done:', response),
 *   }
 * );
 * 
 * // Using convenience functions
 * const response2 = await complete({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */

// ============================================================================
// Core Router Exports
// ============================================================================

export {
  EnhancedLLMRouter,
  getLLMRouter,
  resetLLMRouter,
  complete,
  stream,
  type EnhancedRouterConfig,
} from './router';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  LLMProvider,
  LLMModel,
  MessageRole,
  LLMMessage,
  LLMFunction,
  LLMRequestConfig,
  LLMRequest,
  LLMResponse,
  RouterConfig,
  RoutingDecision,
  AnthropicConfig,
  OpenAIConfig,
  GoogleConfig,
  ProviderConfigs,
  CostTrackingEntry,
  AgentLLMPreferences,
  LLMStreamChunk,
} from './types';

// ============================================================================
// Error Exports
// ============================================================================

export { LLMError } from './types';

// ============================================================================
// Retry & Circuit Breaker Exports
// ============================================================================

export {
  withRetry,
  CircuitBreaker,
  CircuitBreakerRegistry,
  RetryableError,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  CircuitBreakerConfig,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  calculateDelay,
  sleep,
  isRetryableError,
  getRetryAfterMs,
  createRetryWrapper,
} from './retry';

// ============================================================================
// Cost Tracking Exports
// ============================================================================

export {
  CostTrackingService,
  globalCostTrackingService,
  selectModelWithCostOptimization,
  calculateEstimatedCost,
  estimateLatency,
  estimateTokenCount,
  estimateMessageTokens,
  formatCost,
  formatTokenCount,
  type TokenUsageEntry,
  type UsageAggregate,
  type UsageLimit,
  type UsageAlert,
  type ModelSelectionConfig,
  type ModelScore,
  CostLimitExceededError,
} from './cost-tracking';

// ============================================================================
// Streaming Exports
// ============================================================================

export {
  StreamHandler,
  TypingIndicatorManager,
  globalTypingIndicatorManager,
  useStreaming,
  parseAnthropicStream,
  streamAnthropicCompletion,
  type StreamConfig,
  type StreamChunk,
  type StreamEvent,
  type StreamFunctionCall,
  type StreamError,
  type StreamCallbacks,
  type StreamedResponse,
  type TypingIndicator,
  type UseStreamingOptions,
  type UseStreamingReturn,
} from './streaming';

// ============================================================================
// Prompt Management Exports
// ============================================================================

export {
  globalPromptRegistry,
  globalABTestEngine,
  renderPrompt,
  BUILTIN_PROMPTS,
  type PromptVersion,
  type PromptVariable,
  type PromptMetadata,
  type PromptTemplate,
  type PromptCategory,
  type RenderedPrompt,
  type RenderOptions,
  type ABTest,
  type ABTestConfig,
  type ABTestResults,
  type VariantResults,
  type MetricResult,
  PromptRenderError,
} from './prompts';

// ============================================================================
// Provider Exports
// ============================================================================

export {
  // Claude
  createClaudeProvider,
  CLAUDE_MODELS,
  type ClaudeProvider,
  
  // OpenAI
  createOpenAIProvider,
  OpenAIProvider,
  OPENAI_MODELS,
  type OpenAIConfig,
  
  // Ollama
  createOllamaProvider,
  OllamaProvider,
  OLLAMA_MODELS,
  type OllamaConfig,
  
  // Google
  GOOGLE_MODELS,
  
  // Factory
  createProvider,
  ALL_MODELS,
  type ProviderConfig,
  type ProviderInstance,
} from './providers';

// ============================================================================
// Model Catalog Exports
// ============================================================================

export { ALL_MODELS as MODEL_CATALOG } from './providers';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick helper to estimate cost for a request
 */
export function quickEstimateCost(
  modelId: string,
  inputText: string,
  outputText?: string
): number {
  const { calculateEstimatedCost, estimateTokenCount } = require('./cost-tracking');
  const { ALL_MODELS } = require('./providers');
  
  const model = ALL_MODELS.find((m: LLMModel) => m.id === modelId);
  if (!model) return 0;
  
  const inputTokens = estimateTokenCount(inputText);
  const outputTokens = outputText ? estimateTokenCount(outputText) : Math.floor(inputTokens * 0.5);
  
  return calculateEstimatedCost(model, inputTokens, outputTokens);
}

/**
 * Quick helper to select best model for a task
 */
export function quickSelectModel(
  requirements: {
    contextLength?: number;
    requiresVision?: boolean;
    requiresFunctions?: boolean;
    latencyPreference?: 'fast' | 'balanced' | 'quality';
    costBudget?: number;
  },
  availableModels?: LLMModel[]
): LLMModel | null {
  const { selectModelWithCostOptimization, estimateTokenCount } = require('./cost-tracking');
  const { ALL_MODELS } = require('./providers');
  
  const models = availableModels || ALL_MODELS;
  
  // Filter by requirements
  let candidates = [...models];
  
  if (requirements.contextLength) {
    candidates = candidates.filter(m => m.contextWindow >= requirements.contextLength!);
  }
  if (requirements.requiresVision) {
    candidates = candidates.filter(m => m.supportsVision);
  }
  if (requirements.requiresFunctions) {
    candidates = candidates.filter(m => m.supportsFunctions);
  }
  
  if (candidates.length === 0) return null;
  
  // Default to first if only one
  if (candidates.length === 1) return candidates[0];
  
  // Use cost optimization
  const result = selectModelWithCostOptimization(
    candidates,
    1000, // Default estimate
    1000, // Default estimate
    {
      budgetPriority: requirements.latencyPreference === 'fast' ? 'speed' :
                     requirements.latencyPreference === 'quality' ? 'quality' : 'balanced',
      maxCostPerRequest: requirements.costBudget,
    }
  );
  
  return result?.model || candidates[0];
}

import type { LLMModel } from './types';
=======
 * with support for retry logic, circuit breaker, cost optimization, streaming,
 * prompt management, and multi-model support.
 */

export { EnhancedLLMRouter, getLLMRouter, resetLLMRouter, complete, stream, type EnhancedRouterConfig } from './router';
export type { LLMProvider, LLMModel, MessageRole, LLMMessage, LLMFunction, LLMRequestConfig, LLMRequest, LLMResponse, RouterConfig, RoutingDecision, CostTrackingEntry, AgentLLMPreferences } from './types';
export { LLMError } from './types';
export { withRetry, CircuitBreaker, CircuitBreakerRegistry, RetryableError, type RetryConfig, DEFAULT_RETRY_CONFIG, type CircuitBreakerConfig, DEFAULT_CIRCUIT_BREAKER_CONFIG, calculateDelay, sleep, isRetryableError } from './retry';
export { CostTrackingService, globalCostTrackingService, selectModelWithCostOptimization, calculateEstimatedCost, estimateLatency, estimateTokenCount, formatCost, formatTokenCount, type TokenUsageEntry, type UsageLimit, type UsageAlert, type ModelSelectionConfig, CostLimitExceededError } from './cost-tracking';
export { StreamHandler, TypingIndicatorManager, globalTypingIndicatorManager, type StreamConfig, type StreamError, type StreamCallbacks, type StreamedResponse, type TypingIndicator } from './streaming';
export { globalPromptRegistry, globalABTestEngine, renderPrompt, type PromptVersion, type PromptVariable, type PromptMetadata, type PromptTemplate, type PromptCategory, type RenderedPrompt, type ABTest, type ABTestConfig, PromptRenderError } from './prompts';
export { createOpenAIProvider, OpenAIProvider, OPENAI_MODELS, createOllamaProvider, OllamaProvider, OLLAMA_MODELS, GOOGLE_MODELS, ALL_MODELS, type OpenAIConfig, type OllamaConfig, type ProviderConfig } from './providers';
export { ALL_MODELS as MODEL_CATALOG } from './providers';
export { createClaudeProvider, CLAUDE_MODELS } from './claude';

import type { LLMModel } from './types';

export function quickEstimateCost(modelId: string, inputText: string, outputText?: string): number {
  const model = ALL_MODELS.find((m: LLMModel) => m.id === modelId);
  if (!model) return 0;
  const inputTokens = Math.ceil(inputText.length / 4);
  const outputTokens = outputText ? Math.ceil(outputText.length / 4) : Math.floor(inputTokens * 0.5);
  return (inputTokens / 1000) * model.costPer1KInput + (outputTokens / 1000) * model.costPer1KOutput;
}

export function quickSelectModel(requirements: { contextLength?: number; requiresVision?: boolean; requiresFunctions?: boolean }, availableModels?: LLMModel[]): LLMModel | null {
  let candidates = availableModels || ALL_MODELS;
  if (requirements.contextLength) candidates = candidates.filter(m => m.contextWindow >= requirements.contextLength!);
  if (requirements.requiresVision) candidates = candidates.filter(m => m.supportsVision);
  if (requirements.requiresFunctions) candidates = candidates.filter(m => m.supportsFunctions);
  return candidates[0] || null;
}
>>>>>>> eng-ai/llm-improvements
