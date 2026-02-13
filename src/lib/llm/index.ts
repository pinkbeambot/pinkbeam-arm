/**
 * LLM Router Module
 * 
 * Provides unified interface for routing LLM requests to multiple providers
 * with support for fallback, cost optimization, and intelligent routing.
 * 
 * @example
 * ```typescript
 * import { getLLMRouter, complete } from '@/lib/llm';
 * 
 * // Using the router directly
 * const router = getLLMRouter();
 * const response = await router.complete({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   config: { model: 'claude-3-5-sonnet-20241022' },
 * });
 * 
 * // Using the convenience function
 * const response2 = await complete({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */

// Main exports
export { LLMRouter, getLLMRouter, resetLLMRouter, complete } from './router';
export { createClaudeProvider, CLAUDE_MODELS } from './claude';

// Type exports
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
  LocalConfig,
  ProviderConfigs,
  CostTrackingEntry,
  AgentLLMPreferences,
  LLMStreamChunk,
} from './types';

// Error export
export { LLMError } from './types';
