/**
 * Enhanced LLM Router
 */

import { LLMProvider, LLMRequest, LLMResponse, LLMModel, RouterConfig, RoutingDecision, LLMError, AgentLLMPreferences, LLMRequestConfig } from './types';
import { ALL_MODELS, createProvider, ProviderConfig, OpenAIProvider, OllamaProvider } from './providers';
import { withRetry, CircuitBreakerRegistry, RetryableError, DEFAULT_RETRY_CONFIG } from './retry';
import { CostTrackingService, selectModelWithCostOptimization, calculateEstimatedCost, CostLimitExceededError, ModelSelectionConfig } from './cost-tracking';
import { StreamHandler, StreamCallbacks, StreamConfig } from './streaming';
import { globalPromptRegistry, renderPrompt, PromptVersion } from './prompts';
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
    this.circuitBreakers = new CircuitBreakerRegistry();
    this.costTracking = new CostTrackingService();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    for (const provider of ['anthropic', 'openai', 'local'] as LLMProvider[]) {
      try { 
        const p = provider === 'openai' ? require('./providers').createOpenAIProvider(this.providerConfigs.openai) :
                   provider === 'local' ? require('./providers').createOllamaProvider(this.providerConfigs.ollama) :
                   require('./claude').createClaudeProvider(this.providerConfigs.anthropic);
        this.providers.set(provider, p);
      } catch { this.providers.set(provider, null); }
    }
  }

  getAvailableModels(): LLMModel[] { return ALL_MODELS.filter(m => this.providers.get(m.provider) !== null); }
  getAllModels(): LLMModel[] { return ALL_MODELS; }
  getProvider(provider: LLMProvider) { return this.providers.get(provider) || null; }

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
    try { const response = await this.complete(request); handler.start(); handler.processChunk(response.content); handler.complete(decision.model, response.finishReason); }
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
      if (selected) return { provider: selected.model.provider, model: selected.model.id, reason: selected.reason, estimatedCost: selected.costEstimate, estimatedLatency: 0 };
    }
    return { provider: this.config.defaultProvider, model: this.config.defaultModel, reason: 'Default provider selection', estimatedCost: 0, estimatedLatency: 0 };
  }

  async healthCheck(): Promise<Record<LLMProvider, { healthy: boolean; latency: number }>> {
    const results: Record<string, { healthy: boolean; latency: number }> = {};
    for (const [name, provider] of Array.from(this.providers.entries())) results[name] = provider ? await provider.healthCheck() : { healthy: false, latency: 0 };
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
    this.costTracking.setLimit({ id: `${tenantId}:${limitType}`, tenantId, limitType, limitValue, periodStart: new Date(), periodEnd: new Date(), warningThreshold: options?.warningThreshold ?? 80, hardLimit: options?.hardLimit ?? false, alertsEnabled: true });
  }

  selectOptimalModel(requirements: { contextLength?: number; requiresVision?: boolean; requiresFunctions?: boolean }): LLMModel | null {
    let candidates = this.getAvailableModels();
    if (requirements.contextLength) candidates = candidates.filter(m => m.contextWindow >= requirements.contextLength!);
    if (requirements.requiresVision) candidates = candidates.filter(m => m.supportsVision);
    if (requirements.requiresFunctions) candidates = candidates.filter(m => m.supportsFunctions);
    return candidates[0] || null;
  }

  createConfigFromPreferences(preferences: AgentLLMPreferences): LLMRequestConfig {
    return {
      model: preferences.preferredModel || this.config.defaultModel,
      temperature: preferences.temperature,
      maxTokens: preferences.maxTokens,
    };
  }
  renderPrompt(promptId: string, variables: Record<string, unknown>) {
    const template = globalPromptRegistry.getTemplate(promptId);
    if (!template) throw new Error(`Prompt template not found: ${promptId}`);
    return renderPrompt(template.currentVersion, variables);
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
// Re-export from providers except OpenAIConfig which is defined in types
export { 
  createOpenAIProvider, OpenAIProvider, OPENAI_MODELS, 
  createOllamaProvider, OllamaProvider, OLLAMA_MODELS, 
  GOOGLE_MODELS, ALL_MODELS,
  type OllamaConfig, type ProviderConfig 
} from './providers';
export { createClaudeProvider } from './claude';
