/**
 * Enhanced LLM Router
 */

import { LLMProvider, LLMRequest, LLMResponse, LLMModel, RouterConfig, RoutingDecision, LLMError, AgentLLMPreferences } from './types';
import { ALL_MODELS, createProvider, ProviderConfig, OpenAIProvider, OllamaProvider } from './providers';
import { withRetry, CircuitBreakerRegistry, RetryableError, DEFAULT_RETRY_CONFIG } from './retry';
import { CostTrackingService, selectModelWithCostOptimization, calculateEstimatedCost, CostLimitExceededError, ModelSelectionConfig } from './cost-tracking';
import { StreamHandler, StreamCallbacks, StreamConfig } from './streaming';
import { globalPromptRegistry, renderPrompt } from './prompts';
import { ClaudeProvider } from './claude';

export interface EnhancedRouterConfig extends RouterConfig {
  retryConfig?: Partial<typeof DEFAULT_RETRY_CONFIG>;
  costTracking?: { enabled: boolean; enableBuffering: boolean; defaultWarningThreshold: number };
  streaming?: { enabled: boolean; defaultShowTypingIndicator: boolean };
  circuitBreaker?: { failureThreshold: number; successThreshold: number; timeoutMs: number };
}

const DEFAULT_ENHANCED_CONFIG: EnhancedRouterConfig = {
  defaultProvider: 'anthropic', defaultModel: 'claude-3-5-sonnet-20241022', fallbackEnabled: true,
  fallbackProviders: ['anthropic', 'openai'], costOptimization: true, latencyTarget: 'balanced',
  retryConfig: { maxRetries: 3, baseDelayMs: 1000 },
  costTracking: { enabled: true, enableBuffering: true, defaultWarningThreshold: 80 },
  streaming: { enabled: true, defaultShowTypingIndicator: true },
  circuitBreaker: { failureThreshold: 5, successThreshold: 3, timeoutMs: 60000 },
};

export class EnhancedLLMRouter {
  private config: EnhancedRouterConfig;
  private providers = new Map<LLMProvider, ClaudeProvider | OpenAIProvider | OllamaProvider | null>();
  private circuitBreakers: CircuitBreakerRegistry;
  private costTracking: CostTrackingService;
  private providerConfigs: ProviderConfig;

  constructor(config?: Partial<EnhancedRouterConfig>, providerConfigs?: ProviderConfig) {
    this.config = { ...DEFAULT_ENHANCED_CONFIG, ...config };
    this.providerConfigs = providerConfigs || {};
    this.circuitBreakers = new CircuitBreakerRegistry(this.config.circuitBreaker);
    this.costTracking = new CostTrackingService({ enableBuffering: this.config.costTracking?.enableBuffering ?? true, defaultWarningThreshold: this.config.costTracking?.defaultWarningThreshold ?? 80 });
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    for (const provider of ['anthropic', 'openai', 'local'] as LLMProvider[]) {
      try { this.providers.set(provider, await createProvider(provider, this.providerConfigs) as ClaudeProvider | OpenAIProvider | OllamaProvider); }
      catch { this.providers.set(provider, null); }
    }
  }

  getAvailableModels(): LLMModel[] { return ALL_MODELS.filter(m => this.providers.get(m.provider) !== null); }
  getAllModels(): LLMModel[] { return ALL_MODELS; }
  getProvider(provider: LLMProvider): ClaudeProvider | OpenAIProvider | OllamaProvider | null { return this.providers.get(provider) || null; }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const decision = this.makeRoutingDecision(request);
    const provider = this.providers.get(decision.provider);
    if (!provider) throw new LLMError('PROVIDER_UNAVAILABLE', `Provider ${decision.provider} is not available`, false);
    if (this.config.costTracking?.enabled && request.tenantId) {
      for (const limit of this.costTracking.getLimits(request.tenantId)) {
        if (limit.hardLimit && limit.currentValue >= limit.limitValue) throw new CostLimitExceededError(`Cost limit exceeded: ${limit.limitType}`, limit);
      }
    }
    return withRetry(async () => this.circuitBreakers.execute(decision.provider, async () => {
      try {
        const response = await provider.complete({ ...request, config: { ...request.config, model: decision.model } });
        if (this.config.costTracking?.enabled && request.trackCost !== false) {
          this.costTracking.track({ tenantId: request.tenantId || 'unknown', agentId: request.agentId, taskId: request.taskId, provider: decision.provider, model: decision.model, inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens, totalTokens: response.usage.totalTokens, costUsd: response.usage.costUsd, latencyMs: response.latencyMs, requestType: 'completion' });
        }
        return response;
      } catch (error) { if (error instanceof LLMError && error.retryable) throw new RetryableError(error.message, error.code, true); throw error; }
    }), { ...DEFAULT_RETRY_CONFIG, ...this.config.retryConfig });
  }

  async stream(request: LLMRequest, callbacks: StreamCallbacks, config?: Partial<StreamConfig>): Promise<void> {
    const decision = this.makeRoutingDecision(request);
    const handler = new StreamHandler({ enabled: true, showTypingIndicator: this.config.streaming?.defaultShowTypingIndicator ?? true, partialResponseIntervalMs: 50, ...config }, callbacks);
    if (request.agentId) { const { globalTypingIndicatorManager } = await import('./streaming'); globalTypingIndicatorManager.startTyping(request.agentId); }
    try { const response = await this.complete(request); handler.start(request.messages.reduce((a, m) => a + m.content.length / 4, 0)); handler.processChunk(response.content); handler.complete(decision.model, response.finishReason); }
    catch (error) { handler.handleError('STREAM_ERROR', error instanceof Error ? error.message : 'Unknown', true); }
    finally { if (request.agentId) { const { globalTypingIndicatorManager } = await import('./streaming'); globalTypingIndicatorManager.stopTyping(request.agentId); } }
  }

  makeRoutingDecision(request: LLMRequest): RoutingDecision {
    if (request.config?.model) {
      const model = ALL_MODELS.find(m => m.id === request.config?.model);
      if (model && this.providers.get(model.provider)) return { provider: model.provider, model: model.id, reason: 'Explicit model selection', estimatedCost: 0, estimatedLatency: 0 };
    }
    if (this.config.costOptimization) {
      const inputTokens = request.messages.reduce((a, m) => a + Math.ceil(m.content.length / 4), 0);
      const selected = selectModelWithCostOptimization(this.getAvailableModels(), inputTokens, request.config?.maxTokens || 1024, { budgetPriority: this.config.latencyTarget === 'fast' ? 'speed' : this.config.latencyTarget === 'quality' ? 'quality' : 'balanced', preferredProviders: [this.config.defaultProvider] });
      if (selected) return { provider: selected.model.provider, model: selected.model.id, reason: selected.reason, estimatedCost: selected.costEstimate, estimatedLatency: selected.latencyEstimate };
    }
    return { provider: this.config.defaultProvider, model: this.config.defaultModel, reason: 'Default provider selection', estimatedCost: 0, estimatedLatency: 0 };
  }

  selectOptimalModel(requirements: { contextLength?: number; requiresVision?: boolean; requiresFunctions?: boolean; latencyPreference?: 'fast' | 'balanced' | 'quality'; costBudget?: number; estimatedInputTokens?: number; estimatedOutputTokens?: number }): { model: LLMModel; reason: string } | null {
    let candidates = this.getAvailableModels();
    if (requirements.contextLength) candidates = candidates.filter(m => m.contextWindow >= requirements.contextLength!);
    if (requirements.requiresVision) candidates = candidates.filter(m => m.supportsVision);
    if (requirements.requiresFunctions) candidates = candidates.filter(m => m.supportsFunctions);
    if (candidates.length === 0) return null;
    const selected = selectModelWithCostOptimization(candidates, requirements.estimatedInputTokens || 1000, requirements.estimatedOutputTokens || 1000, { budgetPriority: requirements.latencyPreference === 'fast' ? 'speed' : requirements.latencyPreference === 'quality' ? 'quality' : 'balanced', maxCostPerRequest: requirements.costBudget });
    return selected ? { model: selected.model, reason: selected.reason } : null;
  }

  async healthCheck(): Promise<Record<LLMProvider, { healthy: boolean; latency: number }>> {
    const results: Record<string, { healthy: boolean; latency: number }> = {};
    for (const [name, provider] of this.providers.entries()) results[name] = provider ? await provider.healthCheck() : { healthy: false, latency: 0 };
    return results as Record<LLMProvider, { healthy: boolean; latency: number }>;
  }

  getCircuitBreakerMetrics() { return this.circuitBreakers.getAllMetrics(); }
  resetCircuitBreaker(provider: LLMProvider): void { this.circuitBreakers.reset(provider); }
  estimateCost(modelId: string, inputTokens: number, outputTokens: number): number { const model = ALL_MODELS.find(m => m.id === modelId); return model ? calculateEstimatedCost(model, inputTokens, outputTokens) : 0; }
  estimateTokens(text: string, provider?: LLMProvider): number { const p = this.providers.get(provider || this.config.defaultProvider); return p ? p.estimateTokens(text) : Math.ceil(text.length / 4); }
  updateConfig(config: Partial<EnhancedRouterConfig>): void { this.config = { ...this.config, ...config }; }
  getConfig(): EnhancedRouterConfig { return { ...this.config }; }
  getCostTrackingService(): CostTrackingService { return this.costTracking; }
  setCostLimit(tenantId: string, limitType: 'monthly_spend' | 'daily_spend' | 'monthly_tokens' | 'daily_tokens', limitValue: number, options?: { warningThreshold?: number; hardLimit?: boolean }): void {
    this.costTracking.setLimit({ id: `${tenantId}:${limitType}`, tenantId, limitType, limitValue, currentValue: 0, periodStart: new Date(), periodEnd: new Date(), warningThreshold: options?.warningThreshold ?? 80, hardLimit: options?.hardLimit ?? false, alertsEnabled: true });
  }
  renderPrompt(promptId: string, variables: Record<string, unknown>, version?: number) {
    const template = globalPromptRegistry.getTemplate(promptId);
    if (!template) throw new Error(`Prompt template not found: ${promptId}`);
    const promptVersion = version ? globalPromptRegistry.getVersion(promptId, version) : template.currentVersion;
    if (!promptVersion) throw new Error(`Prompt version not found: ${promptId} v${version}`);
    return renderPrompt(promptVersion, variables);
  }
}

let globalRouter: EnhancedLLMRouter | null = null;
export function getLLMRouter(config?: Partial<EnhancedRouterConfig>, providerConfigs?: ProviderConfig): EnhancedLLMRouter { return globalRouter || (globalRouter = new EnhancedLLMRouter(config, providerConfigs)); }
export function resetLLMRouter(): void { globalRouter = null; }
export async function complete(request: LLMRequest): Promise<LLMResponse> { return getLLMRouter().complete(request); }
export async function stream(request: LLMRequest, callbacks: StreamCallbacks, config?: Partial<StreamConfig>): Promise<void> { return getLLMRouter().stream(request, callbacks, config); }

export * from './types';
export * from './retry';
export * from './cost-tracking';
export * from './streaming';
export * from './prompts';
export * from './providers';
export { createClaudeProvider } from './claude';
