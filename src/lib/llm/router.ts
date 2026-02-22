/**
 * Enhanced LLM Router
 * Routes requests to appropriate LLM providers with:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Cost optimization and token tracking
 * - Streaming support
 * - Multi-model support (Claude, GPT-4, Ollama)
 */

import {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMModel,
  RouterConfig,
  RoutingDecision,
  LLMError,
  AgentLLMPreferences,
} from './types';

import {
  ClaudeProvider,
} from './claude';

import {
  OpenAIProvider,
  OllamaProvider,
  ALL_MODELS,
  createProvider,
  ProviderConfig,
} from './providers';

import {
  withRetry,
  CircuitBreakerRegistry,
  RetryableError,
  DEFAULT_RETRY_CONFIG,
} from './retry';

import {
  CostTrackingService,
  globalCostTrackingService,
  selectModelWithCostOptimization,
  calculateEstimatedCost,
  CostLimitExceededError,
  ModelSelectionConfig,
} from './cost-tracking';

import {
  StreamHandler,
  StreamCallbacks,
  StreamConfig,
} from './streaming';

import {
  globalPromptRegistry,
  renderPrompt,
} from './prompts';

// ============================================================================
// Enhanced Router Configuration
// ============================================================================

export interface EnhancedRouterConfig extends RouterConfig {
  retryConfig?: Partial<typeof DEFAULT_RETRY_CONFIG>;
  costTracking?: {
    enabled: boolean;
    enableBuffering: boolean;
    defaultWarningThreshold: number;
  };
  streaming?: {
    enabled: boolean;
    defaultShowTypingIndicator: boolean;
  };
  circuitBreaker?: {
    failureThreshold: number;
    successThreshold: number;
    timeoutMs: number;
  };
}

const DEFAULT_ENHANCED_CONFIG: EnhancedRouterConfig = {
  defaultProvider: 'anthropic',
  defaultModel: 'claude-3-5-sonnet-20241022',
  fallbackEnabled: true,
  fallbackProviders: ['anthropic', 'openai'],
  costOptimization: true,
  latencyTarget: 'balanced',
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 1000,
  },
  costTracking: {
    enabled: true,
    enableBuffering: true,
    defaultWarningThreshold: 80,
  },
  streaming: {
    enabled: true,
    defaultShowTypingIndicator: true,
  },
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 3,
    timeoutMs: 60000,
  },
};

// ============================================================================
// Enhanced LLM Router
// ============================================================================

export class EnhancedLLMRouter {
  private config: EnhancedRouterConfig;
  private providers = new Map<LLMProvider, ClaudeProvider | OpenAIProvider | OllamaProvider | null>();
  private circuitBreakers: CircuitBreakerRegistry;
  private costTracking: CostTrackingService;
  private providerConfigs: ProviderConfig;

  constructor(config?: Partial<EnhancedRouterConfig>, providerConfigs?: ProviderConfig) {
    this.config = { ...DEFAULT_ENHANCED_CONFIG, ...config };
    this.providerConfigs = providerConfigs || {};
    
    // Initialize circuit breakers
    this.circuitBreakers = new CircuitBreakerRegistry(this.config.circuitBreaker);
    
    // Initialize cost tracking
    this.costTracking = new CostTrackingService({
      enableBuffering: this.config.costTracking?.enableBuffering ?? true,
      defaultWarningThreshold: this.config.costTracking?.defaultWarningThreshold ?? 80,
    });

    // Initialize providers
    this.initializeProviders();
  }

  /**
   * Initialize available providers
   */
  private initializeProviders(): void {
    // Initialize Anthropic
    try {
      const provider = createProvider('anthropic', this.providerConfigs);
      this.providers.set('anthropic', provider as ClaudeProvider);
    } catch {
      this.providers.set('anthropic', null);
    }

    // Initialize OpenAI
    try {
      const provider = createProvider('openai', this.providerConfigs);
      this.providers.set('openai', provider as OpenAIProvider);
    } catch {
      this.providers.set('openai', null);
    }

    // Initialize Ollama (local)
    try {
      const provider = createProvider('local', this.providerConfigs);
      this.providers.set('local', provider as OllamaProvider);
    } catch {
      this.providers.set('local', null);
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): LLMModel[] {
    return ALL_MODELS.filter(model => {
      const provider = this.providers.get(model.provider);
      return provider !== null;
    });
  }

  /**
   * Get all models (including unavailable)
   */
  getAllModels(): LLMModel[] {
    return ALL_MODELS;
  }

  /**
   * Get provider instance
   */
  getProvider(provider: LLMProvider): ClaudeProvider | OpenAIProvider | OllamaProvider | null {
    return this.providers.get(provider) || null;
  }

  /**
   * Execute completion with full resilience stack
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const decision = this.makeRoutingDecision(request);
    const provider = this.providers.get(decision.provider);

    if (!provider) {
      throw new LLMError(
        'PROVIDER_UNAVAILABLE',
        `Provider ${decision.provider} is not available`,
        false
      );
    }

    // Check cost limits before making request
    if (this.config.costTracking?.enabled && request.tenantId) {
      const limits = this.costTracking.getLimits(request.tenantId);
      for (const limit of limits) {
        if (limit.hardLimit && limit.currentValue >= limit.limitValue) {
          throw new CostLimitExceededError(
            `Cost limit exceeded: ${limit.limitType}`,
            limit
          );
        }
      }
    }

    // Execute with retry and circuit breaker
    return withRetry(
      async (retryContext) => {
        // Check circuit breaker
        return this.circuitBreakers.execute(decision.provider, async () => {
          try {
            const response = await provider.complete({
              ...request,
              config: {
                ...request.config,
                model: decision.model,
              },
            });

            // Track cost if enabled
            if (this.config.costTracking?.enabled && request.trackCost !== false) {
              this.costTracking.track({
                tenantId: request.tenantId || 'unknown',
                agentId: request.agentId,
                taskId: request.taskId,
                provider: decision.provider,
                model: decision.model,
                inputTokens: response.usage.inputTokens,
                outputTokens: response.usage.outputTokens,
                totalTokens: response.usage.totalTokens,
                costUsd: response.usage.costUsd,
                latencyMs: response.latencyMs,
                requestType: 'completion',
              });
            }

            return response;
          } catch (error) {
            // Convert to RetryableError if needed
            if (error instanceof LLMError && error.retryable) {
              throw new RetryableError(
                error.message,
                error.code,
                true
              );
            }
            throw error;
          }
        });
      },
      {
        ...DEFAULT_RETRY_CONFIG,
        ...this.config.retryConfig,
      },
      (context, nextDelay) => {
        console.log(
          `[LLM Router] Retry attempt ${context.attempt} for ${decision.provider}, ` +
          `waiting ${nextDelay}ms`
        );
      }
    );
  }

  /**
   * Stream completion
   */
  async stream(
    request: LLMRequest,
    callbacks: StreamCallbacks,
    config?: Partial<StreamConfig>
  ): Promise<void> {
    const decision = this.makeRoutingDecision(request);
    
    const streamConfig: StreamConfig = {
      enabled: true,
      showTypingIndicator: this.config.streaming?.defaultShowTypingIndicator ?? true,
      partialResponseIntervalMs: 50,
      ...config,
    };

    const handler = new StreamHandler(streamConfig, callbacks);

    // Start typing indicator
    if (streamConfig.showTypingIndicator && request.agentId) {
      const { globalTypingIndicatorManager } = await import('./streaming');
      globalTypingIndicatorManager.startTyping(request.agentId);
    }

    try {
      // For now, only Anthropic supports streaming in our implementation
      if (decision.provider === 'anthropic') {
        const { streamAnthropicCompletion } = await import('./streaming');
        const provider = this.providers.get('anthropic') as ClaudeProvider;
        
        // This is a simplified implementation
        // Full implementation would need provider-specific streaming
        console.log('[LLM Router] Streaming not fully implemented for', decision.provider);
      } else {
        // Fallback to regular completion for non-streaming providers
        const response = await this.complete(request);
        handler.start(request.messages.reduce((acc, m) => acc + m.content.length / 4, 0));
        handler.processChunk(response.content);
        handler.complete(decision.model, response.finishReason);
      }
    } catch (error) {
      handler.handleError(
        'STREAM_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        true
      );
    } finally {
      if (streamConfig.showTypingIndicator && request.agentId) {
        const { globalTypingIndicatorManager } = await import('./streaming');
        globalTypingIndicatorManager.stopTyping(request.agentId);
      }
    }
  }

  /**
   * Make intelligent routing decision
   */
  makeRoutingDecision(request: LLMRequest): RoutingDecision {
    // Check if model is explicitly specified
    if (request.config?.model) {
      const model = ALL_MODELS.find(m => m.id === request.config?.model);
      if (model) {
        const provider = this.providers.get(model.provider);
        if (provider) {
          return {
            provider: model.provider,
            model: model.id,
            reason: 'Explicit model selection',
            estimatedCost: 0,
            estimatedLatency: 0,
          };
        }
      }
    }

    // Use cost optimization if enabled
    if (this.config.costOptimization) {
      // Estimate tokens
      const estimatedInputTokens = request.messages.reduce(
        (acc, m) => acc + Math.ceil(m.content.length / 4),
        0
      );
      const estimatedOutputTokens = request.config?.maxTokens || 1024;

      // Select optimal model
      const selectionConfig: ModelSelectionConfig = {
        budgetPriority: this.config.latencyTarget === 'fast' ? 'speed' :
                       this.config.latencyTarget === 'quality' ? 'quality' : 'balanced',
        preferredProviders: [this.config.defaultProvider],
      };

      const selected = selectModelWithCostOptimization(
        this.getAvailableModels(),
        estimatedInputTokens,
        estimatedOutputTokens,
        selectionConfig
      );

      if (selected) {
        return {
          provider: selected.model.provider,
          model: selected.model.id,
          reason: selected.reason,
          estimatedCost: selected.costEstimate,
          estimatedLatency: selected.latencyEstimate,
        };
      }
    }

    // Fall back to default
    const defaultModel = this.config.defaultModel;
    const model = ALL_MODELS.find(m => m.id === defaultModel) || ALL_MODELS[0];

    return {
      provider: this.config.defaultProvider,
      model: model?.id || defaultModel,
      reason: 'Default provider selection',
      estimatedCost: 0,
      estimatedLatency: 0,
    };
  }

  /**
   * Select optimal model based on requirements
   */
  selectOptimalModel(
    requirements: {
      contextLength?: number;
      requiresVision?: boolean;
      requiresFunctions?: boolean;
      latencyPreference?: 'fast' | 'balanced' | 'quality';
      costBudget?: number;
      estimatedInputTokens?: number;
      estimatedOutputTokens?: number;
    }
  ): { model: LLMModel; reason: string } | null {
    let candidates = this.getAvailableModels();

    // Filter by context length
    if (requirements.contextLength) {
      candidates = candidates.filter(m => m.contextWindow >= requirements.contextLength!);
    }

    // Filter by vision support
    if (requirements.requiresVision) {
      candidates = candidates.filter(m => m.supportsVision);
    }

    // Filter by function support
    if (requirements.requiresFunctions) {
      candidates = candidates.filter(m => m.supportsFunctions);
    }

    if (candidates.length === 0) {
      return null;
    }

    // Use cost-aware selection
    const selectionConfig: ModelSelectionConfig = {
      budgetPriority: requirements.latencyPreference === 'fast' ? 'speed' :
                     requirements.latencyPreference === 'quality' ? 'quality' : 'balanced',
      maxCostPerRequest: requirements.costBudget,
    };

    const selected = selectModelWithCostOptimization(
      candidates,
      requirements.estimatedInputTokens || 1000,
      requirements.estimatedOutputTokens || 1000,
      selectionConfig
    );

    if (selected) {
      return {
        model: selected.model,
        reason: selected.reason,
      };
    }

    return null;
  }

  /**
   * Create request config from agent preferences
   */
  createConfigFromPreferences(preferences: AgentLLMPreferences): import('./types').LLMRequestConfig {
    return {
      model: preferences.preferredModel,
      temperature: preferences.temperature,
      maxTokens: preferences.maxTokens,
    };
  }

  /**
   * Health check all providers
   */
  async healthCheck(): Promise<Record<LLMProvider, { healthy: boolean; latency: number }>> {
    const results: Record<string, { healthy: boolean; latency: number }> = {};

    for (const [name, provider] of this.providers.entries()) {
      if (provider) {
        results[name] = await provider.healthCheck();
      } else {
        results[name] = { healthy: false, latency: 0 };
      }
    }

    return results as Record<LLMProvider, { healthy: boolean; latency: number }>;
  }

  /**
   * Get circuit breaker metrics
   */
  getCircuitBreakerMetrics(): Record<string, ReturnType<import('./retry').CircuitBreaker['getMetrics']>> {
    return this.circuitBreakers.getAllMetrics();
  }

  /**
   * Reset circuit breaker for a provider
   */
  resetCircuitBreaker(provider: LLMProvider): void {
    this.circuitBreakers.reset(provider);
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const model = ALL_MODELS.find(m => m.id === modelId);
    if (!model) return 0;

    return calculateEstimatedCost(model, inputTokens, outputTokens);
  }

  /**
   * Estimate tokens for text
   */
  estimateTokens(text: string, provider?: LLMProvider): number {
    const p = provider || this.config.defaultProvider;
    const providerInstance = this.providers.get(p);
    
    if (providerInstance) {
      return providerInstance.estimateTokens(text);
    }

    // Default approximation
    return Math.ceil(text.length / 4);
  }

  /**
   * Update router configuration
   */
  updateConfig(config: Partial<EnhancedRouterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EnhancedRouterConfig {
    return { ...this.config };
  }

  /**
   * Get cost tracking service
   */
  getCostTrackingService(): CostTrackingService {
    return this.costTracking;
  }

  /**
   * Set cost limit for a tenant
   */
  setCostLimit(
    tenantId: string,
    limitType: 'monthly_spend' | 'daily_spend' | 'monthly_tokens' | 'daily_tokens',
    limitValue: number,
    options?: {
      warningThreshold?: number;
      hardLimit?: boolean;
    }
  ): void {
    this.costTracking.setLimit({
      id: `${tenantId}:${limitType}`,
      tenantId,
      limitType,
      limitValue,
      currentValue: 0,
      periodStart: new Date(),
      periodEnd: new Date(),
      warningThreshold: options?.warningThreshold ?? 80,
      hardLimit: options?.hardLimit ?? false,
      alertsEnabled: true,
    });
  }

  /**
   * Render a prompt template
   */
  renderPrompt(
    promptId: string,
    variables: Record<string, unknown>,
    version?: number
  ): ReturnType<typeof renderPrompt> {
    const template = globalPromptRegistry.getTemplate(promptId);
    if (!template) {
      throw new Error(`Prompt template not found: ${promptId}`);
    }

    const promptVersion = version 
      ? globalPromptRegistry.getVersion(promptId, version)
      : template.currentVersion;

    if (!promptVersion) {
      throw new Error(`Prompt version not found: ${promptId} v${version}`);
    }

    return renderPrompt(promptVersion, variables);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalRouter: EnhancedLLMRouter | null = null;

/**
 * Get or create global router instance
 */
export function getLLMRouter(
  config?: Partial<EnhancedRouterConfig>,
  providerConfigs?: ProviderConfig
): EnhancedLLMRouter {
  if (!globalRouter) {
    globalRouter = new EnhancedLLMRouter(config, providerConfigs);
  }
  return globalRouter;
}

/**
 * Reset global router (useful for testing)
 */
export function resetLLMRouter(): void {
  globalRouter = null;
}

/**
 * Quick complete function using global router
 */
export async function complete(request: LLMRequest): Promise<LLMResponse> {
  const router = getLLMRouter();
  return router.complete(request);
}

/**
 * Quick stream function using global router
 */
export async function stream(
  request: LLMRequest,
  callbacks: StreamCallbacks,
  config?: Partial<StreamConfig>
): Promise<void> {
  const router = getLLMRouter();
  return router.stream(request, callbacks, config);
}

// ============================================================================
// Exports
// ============================================================================

export * from './types';
export * from './retry';
export * from './cost-tracking';
export * from './streaming';
export * from './prompts';
export * from './providers';

// Export Claude provider for backward compatibility
export { createClaudeProvider } from './claude';
