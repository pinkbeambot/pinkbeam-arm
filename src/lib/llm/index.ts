/**
 * LLM Router Module
 * 
 * Provides unified interface for routing LLM requests to multiple providers
 * with support for retry logic, circuit breaker, cost optimization, streaming,
 * prompt management, and multi-model support.
 * 
 * @example
 * ```typescript
 * import { getLLMRouter, complete, stream } from '@/lib/llm';
 * 
 * const router = getLLMRouter();
 * const response = await router.complete({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   config: { model: 'claude-3-5-sonnet-20241022' },
 * });
 * 
 * await router.stream(
 *   { messages: [{ role: 'user', content: 'Hello!' }] },
 *   { onChunk: (chunk) => console.log(chunk), onComplete: (r) => console.log('Done:', r) }
 * );
 * ```
 */

export { EnhancedLLMRouter, getLLMRouter, resetLLMRouter, complete, stream, type EnhancedRouterConfig } from './router';
export type { LLMProvider, LLMModel, MessageRole, LLMMessage, LLMFunction, LLMRequestConfig, LLMRequest, LLMResponse, RouterConfig, RoutingDecision, AnthropicConfig, ProviderConfigs, CostTrackingEntry, AgentLLMPreferences, LLMStreamChunk } from './types';
export { LLMError } from './types';
export { withRetry, CircuitBreaker, CircuitBreakerRegistry, RetryableError, type RetryConfig, DEFAULT_RETRY_CONFIG, type CircuitBreakerConfig, DEFAULT_CIRCUIT_BREAKER_CONFIG, calculateDelay, sleep, isRetryableError, getRetryAfterMs } from './retry';
export { CostTrackingService, globalCostTrackingService, selectModelWithCostOptimization, calculateEstimatedCost, estimateLatency, estimateTokenCount, estimateMessageTokens, formatCost, formatTokenCount, type TokenUsageEntry, type UsageAggregate, type UsageLimit, type UsageAlert, type ModelSelectionConfig, type ModelScore, CostLimitExceededError } from './cost-tracking';
export { StreamHandler, TypingIndicatorManager, globalTypingIndicatorManager, parseAnthropicStream, streamAnthropicCompletion, type StreamConfig, type StreamChunk, type StreamFunctionCall, type StreamError, type StreamCallbacks, type StreamedResponse, type TypingIndicator } from './streaming';
export { globalPromptRegistry, globalABTestEngine, renderPrompt, type PromptVersion, type PromptVariable, type PromptMetadata, type PromptTemplate, type PromptCategory, type RenderedPrompt, type RenderOptions, type ABTest, type ABTestConfig, type ABTestResults, type VariantResults, type MetricResult, PromptRenderError } from './prompts';
export { createOpenAIProvider, OpenAIProvider, OPENAI_MODELS, createOllamaProvider, OllamaProvider, OLLAMA_MODELS, GOOGLE_MODELS, ALL_MODELS, type OpenAIConfig, type OllamaConfig, type ProviderConfig, type ProviderInstance } from './providers';
export { ALL_MODELS as MODEL_CATALOG } from './providers';

import type { LLMModel } from './types';

export function quickEstimateCost(modelId: string, inputText: string, outputText?: string): number {
  const model = ALL_MODELS.find((m: LLMModel) => m.id === modelId);
  if (!model) return 0;
  const inputTokens = Math.ceil(inputText.length / 4);
  const outputTokens = outputText ? Math.ceil(outputText.length / 4) : Math.floor(inputTokens * 0.5);
  return (inputTokens / 1000) * model.costPer1KInput + (outputTokens / 1000) * model.costPer1KOutput;
}

export function quickSelectModel(requirements: { contextLength?: number; requiresVision?: boolean; requiresFunctions?: boolean; latencyPreference?: 'fast' | 'balanced' | 'quality'; costBudget?: number }, availableModels?: LLMModel[]): LLMModel | null {
  let candidates = availableModels || ALL_MODELS;
  if (requirements.contextLength) candidates = candidates.filter(m => m.contextWindow >= requirements.contextLength!);
  if (requirements.requiresVision) candidates = candidates.filter(m => m.supportsVision);
  if (requirements.requiresFunctions) candidates = candidates.filter(m => m.supportsFunctions);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates[0];
}
