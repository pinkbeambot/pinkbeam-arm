/**
 * LLM Router
 * Routes requests to appropriate LLM providers with fallback and cost optimization
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
  ProviderConfigs,
} from './types';

import { ClaudeProvider, createClaudeProvider, CLAUDE_MODELS } from './claude';

// Default router configuration
const DEFAULT_CONFIG: RouterConfig = {
  defaultProvider: 'anthropic',
  defaultModel: 'claude-3-5-sonnet-20241022',
  fallbackEnabled: true,
  fallbackProviders: ['anthropic'],
  costOptimization: true,
  latencyTarget: 'balanced',
};

// Model catalog
const ALL_MODELS: LLMModel[] = [
  ...CLAUDE_MODELS,
  // OpenAI models would be added here
  // Google models would be added here
  // Local models would be added here
];

export class LLMRouter {
  private config: RouterConfig;
  private providers: Map<LLMProvider, ClaudeProvider | null> = new Map();
  private providerConfigs: ProviderConfigs;

  constructor(config?: Partial<RouterConfig>, providerConfigs?: ProviderConfigs) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.providerConfigs = providerConfigs || {};
    
    // Initialize providers
    this.initializeProviders();
  }

  /**
   * Initialize available providers
   */
  private initializeProviders(): void {
    // Initialize Anthropic if API key is available
    try {
      const anthropic = createClaudeProvider(this.providerConfigs.anthropic);
      this.providers.set('anthropic', anthropic);
    } catch {
      this.providers.set('anthropic', null);
    }

    // Other providers would be initialized here
    // this.providers.set('openai', ...);
    // this.providers.set('google', ...);
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
   * Get provider instance
   */
  getProvider(provider: LLMProvider): ClaudeProvider | null {
    return this.providers.get(provider) || null;
  }

  /**
   * Route and execute request
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

    try {
      return await provider.complete({
        ...request,
        config: {
          ...request.config,
          model: decision.model,
        },
      });
    } catch (error) {
      // Attempt fallback if enabled
      if (this.config.fallbackEnabled && error instanceof LLMError && error.retryable) {
        return this.fallback(request, decision.provider);
      }
      throw error;
    }
  }

  /**
   * Make routing decision based on request and preferences
   */
  makeRoutingDecision(request: LLMRequest): RoutingDecision {
    // Check if model is explicitly specified
    if (request.config?.model) {
      const model = ALL_MODELS.find(m => m.id === request.config?.model);
      if (model && this.providers.get(model.provider)) {
        return {
          provider: model.provider,
          model: model.id,
          reason: 'Explicit model selection',
          estimatedCost: 0,
          estimatedLatency: 0,
        };
      }
    }

    // Use default provider and model
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
   * Attempt fallback to alternative provider
   */
  private async fallback(request: LLMRequest, failedProvider: LLMProvider): Promise<LLMResponse> {
    const fallbackProviders = this.config.fallbackProviders.filter(p => p !== failedProvider);
    
    for (const providerName of fallbackProviders) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        return await provider.complete(request);
      } catch {
        // Continue to next fallback
        continue;
      }
    }

    throw new LLMError(
      'FALLBACK_EXHAUSTED',
      'All fallback providers failed',
      false
    );
  }

  /**
   * Select optimal model based on task requirements
   */
  selectOptimalModel(
    requirements: {
      contextLength?: number;
      requiresVision?: boolean;
      requiresFunctions?: boolean;
      latencyPreference?: 'fast' | 'balanced' | 'quality';
      costBudget?: number;
    }
  ): LLMModel | null {
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

    // Sort by preference
    const latencyPreference = requirements.latencyPreference || this.config.latencyTarget;
    
    candidates.sort((a, b) => {
      // Prioritize latency preference
      if (latencyPreference === 'fast') {
        const latencyOrder = { fast: 0, balanced: 1, slow: 2 };
        return latencyOrder[a.latencyProfile] - latencyOrder[b.latencyProfile];
      }
      
      // Prioritize quality (slower is often better)
      if (latencyPreference === 'quality') {
        const latencyOrder = { slow: 0, balanced: 1, fast: 2 };
        return latencyOrder[a.latencyProfile] - latencyOrder[b.latencyProfile];
      }

      // Balanced - consider cost if optimization enabled
      if (this.config.costOptimization) {
        const aCost = a.costPer1KInput + a.costPer1KOutput;
        const bCost = b.costPer1KInput + b.costPer1KOutput;
        return aCost - bCost;
      }

      return 0;
    });

    return candidates[0];
  }

  /**
   * Create request config based on agent preferences
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
   * Estimate cost for a request
   */
  estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const model = ALL_MODELS.find(m => m.id === modelId);
    if (!model) return 0;

    const inputCost = (inputTokens / 1000) * model.costPer1KInput;
    const outputCost = (outputTokens / 1000) * model.costPer1KOutput;
    return inputCost + outputCost;
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
  updateConfig(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RouterConfig {
    return { ...this.config };
  }
}

// Singleton instance
let globalRouter: LLMRouter | null = null;

/**
 * Get or create global router instance
 */
export function getLLMRouter(
  config?: Partial<RouterConfig>,
  providerConfigs?: ProviderConfigs
): LLMRouter {
  if (!globalRouter) {
    globalRouter = new LLMRouter(config, providerConfigs);
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
 * Export types
 */
export * from './types';
export { createClaudeProvider, CLAUDE_MODELS } from './claude';
