/**
 * LLM Router Module
 * 
 * Provides unified interface for routing LLM requests to multiple providers
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
// OpenAIConfig is defined in types.ts, not re-exported from providers
export { createOpenAIProvider, OpenAIProvider, OPENAI_MODELS, createOllamaProvider, OllamaProvider, OLLAMA_MODELS, GOOGLE_MODELS, ALL_MODELS, type OllamaConfig, type ProviderConfig } from './providers';
export { ALL_MODELS as MODEL_CATALOG } from './providers';
export { createClaudeProvider, CLAUDE_MODELS } from './claude';

import type { LLMModel } from './types';
import { ALL_MODELS } from './providers';

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
