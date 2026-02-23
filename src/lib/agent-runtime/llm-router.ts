/**
 * LLM Router for Agent Runtime
 * 
 * Provides unified access to LLM providers (Claude, GPT, Gemini)
 * 
 * @module src/lib/agent-runtime/llm-router
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getLLMRouter, type EnhancedRouterConfig } from '@/lib/llm/router';
import type { LLMRequest, LLMResponse } from '@/lib/llm/types';
import type { Agent } from '@/types';

export type LLMProvider = 'anthropic' | 'openai' | 'google';

export interface RouterConfig {
  defaultProvider: LLMProvider;
  defaultModel: string;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  defaultProvider: 'anthropic',
  defaultModel: 'claude-3-5-sonnet-20241022',
  rateLimits: {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
  },
};

export interface RouteRequest {
  agent: Agent;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
}

export interface RouteResult {
  success: boolean;
  response?: LLMResponse;
  provider?: LLMProvider;
  model?: string;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

interface RateLimitState {
  requests: number;
  tokens: number;
  windowStart: number;
}

class TenantRateLimiter {
  private states = new Map<string, RateLimitState>();
  private config: RouterConfig['rateLimits'];

  constructor(config: RouterConfig['rateLimits']) {
    this.config = config;
  }

  checkLimit(tenantId: string, estimatedTokens: number): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000;
    
    let state = this.states.get(tenantId);
    if (!state || state.windowStart !== windowStart) {
      state = { requests: 0, tokens: 0, windowStart };
      this.states.set(tenantId, state);
    }

    if (state.requests >= this.config.requestsPerMinute) {
      return { allowed: false, reason: 'Rate limit exceeded: requests per minute' };
    }

    if (state.tokens + estimatedTokens > this.config.tokensPerMinute) {
      return { allowed: false, reason: 'Rate limit exceeded: tokens per minute' };
    }

    return { allowed: true };
  }

  recordRequest(tenantId: string, tokens: number): void {
    const state = this.states.get(tenantId);
    if (state) {
      state.requests++;
      state.tokens += tokens;
    }
  }

  getUsage(tenantId: string): { requests: number; tokens: number } {
    const state = this.states.get(tenantId);
    return state || { requests: 0, tokens: 0 };
  }
}

export class AgentLLMRouter {
  private config: RouterConfig;
  private rateLimiter: TenantRateLimiter;

  constructor(config?: Partial<RouterConfig>) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
    this.rateLimiter = new TenantRateLimiter(this.config.rateLimits);
  }

  async complete(request: RouteRequest): Promise<RouteResult> {
    try {
      // Get agent's preferred model
      const llmConfig = request.agent.llm_config || {};
      const model = request.options?.model || llmConfig.model || this.config.defaultModel;
      const provider = (llmConfig.provider || this.config.defaultProvider) as LLMProvider;

      // Check rate limits
      const estimatedTokens = request.messages.reduce((acc, m) => 
        acc + Math.ceil(m.content.length / 4), 0
      );
      
      const rateLimitCheck = this.rateLimiter.checkLimit(request.agent.tenant_id, estimatedTokens);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: rateLimitCheck.reason || 'Rate limit exceeded',
            retryable: true,
          },
        };
      }

      // Route to appropriate provider using the existing LLM router
      const router = getLLMRouter();
      
      const llmRequest: LLMRequest = {
        messages: request.messages,
        config: {
          model,
          temperature: request.options?.temperature ?? 0.7,
          maxTokens: request.options?.maxTokens ?? 4096,
        },
        tenantId: request.agent.tenant_id,
        agentId: request.agent.id,
      };

      const response = await router.complete(llmRequest);

      this.rateLimiter.recordRequest(
        request.agent.tenant_id,
        response.usage.totalTokens
      );

      return {
        success: true,
        response,
        provider,
        model,
        cost: {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
          costUsd: response.usage.costUsd,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LLM_ERROR',
          message: error instanceof Error ? error.message : 'Unknown LLM error',
          retryable: true,
        },
      };
    }
  }

  getTenantUsage(tenantId: string): { requests: number; tokens: number } {
    return this.rateLimiter.getUsage(tenantId);
  }

  getConfig(): RouterConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

let globalAgentRouter: AgentLLMRouter | null = null;

export function getAgentLLMRouter(config?: Partial<RouterConfig>): AgentLLMRouter {
  if (!globalAgentRouter) {
    globalAgentRouter = new AgentLLMRouter(config);
  }
  return globalAgentRouter;
}

export function resetAgentLLMRouter(): void {
  globalAgentRouter = null;
}

export default AgentLLMRouter;
