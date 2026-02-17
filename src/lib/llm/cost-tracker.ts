/**
 * LLM Cost Tracker
 * Tracks token usage and costs for LLM requests
 * Stores usage in llm_costs table with budget enforcement per agent
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database';
import {
  LLMProvider,
  CostTrackingEntry,
  LLMError,
} from './types';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export interface CostTrackingConfig {
  /** Enable/disable cost tracking */
  enabled: boolean;
  /** Enable budget enforcement */
  enforceBudgets: boolean;
  /** Default warning threshold (% of budget) */
  warningThreshold: number;
  /** Log to console for debugging */
  debug: boolean;
}

export interface AgentBudget {
  agentId: string;
  tenantId: string;
  maxBudgetUsd: number;
  currentSpendUsd: number;
  warningThreshold: number;
}

export interface CostTrackingResult {
  success: boolean;
  costId?: string;
  error?: string;
  budgetExceeded?: boolean;
  budgetWarning?: boolean;
  remainingBudget?: number;
}

export interface CostSummary {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  avgCostPerRequest: number;
  avgTokensPerRequest: number;
}

export interface CostBreakdownByModel {
  model: string;
  provider: string;
  requestCount: number;
  totalTokens: number;
  totalCostUsd: number;
}

const DEFAULT_CONFIG: CostTrackingConfig = {
  enabled: true,
  enforceBudgets: true,
  warningThreshold: 0.8, // 80%
  debug: false,
};

/**
 * Cost Tracker Service
 * 
 * Tracks LLM usage costs and enforces budgets per agent.
 * Integrates with the llm_costs table in Supabase.
 */
export class CostTracker {
  private config: CostTrackingConfig;
  private supabase: ReturnType<typeof createClient<Database>> | null = null;
  private budgetCache: Map<string, AgentBudget> = new Map();

  constructor(config?: Partial<CostTrackingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase client
   */
  private initializeSupabase(): void {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      if (this.config.debug) {
        console.warn('[CostTracker] Supabase credentials not found. Running in local mode.');
      }
      return;
    }

    try {
      this.supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    } catch (error) {
      console.error('[CostTracker] Failed to initialize Supabase:', error);
    }
  }

  /**
   * Track a cost entry
   */
  async trackCost(entry: CostTrackingEntry): Promise<CostTrackingResult> {
    if (!this.config.enabled) {
      return { success: true };
    }

    try {
      // Check budget before recording
      if (entry.agentId && entry.tenantId && this.config.enforceBudgets) {
        const budgetCheck = await this.checkBudget(entry.agentId, entry.tenantId, entry.costUsd);
        if (budgetCheck.exceeded) {
          return {
            success: false,
            error: `Budget exceeded for agent ${entry.agentId}`,
            budgetExceeded: true,
            remainingBudget: budgetCheck.remaining,
          };
        }
      }

      // Record the cost
      const result = await this.recordCost(entry);

      // Update budget cache
      if (entry.agentId && entry.tenantId) {
        this.updateBudgetCache(entry.agentId, entry.tenantId, entry.costUsd);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error tracking cost';
      
      if (this.config.debug) {
        console.error('[CostTracker] Error tracking cost:', error);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Record cost to database
   */
  private async recordCost(entry: CostTrackingEntry): Promise<CostTrackingResult> {
    // Log to console if no database
    if (!this.supabase) {
      if (this.config.debug) {
        console.log('[LLM Cost]', JSON.stringify({
          provider: entry.provider,
          model: entry.model,
          costUsd: entry.costUsd,
          tokens: entry.inputTokens + entry.outputTokens,
          latencyMs: entry.latencyMs,
          agentId: entry.agentId,
          tenantId: entry.tenantId,
        }));
      }
      return { success: true };
    }

    // Insert into llm_costs table
    const { data, error } = await this.supabase
      .from('llm_costs')
      .insert({
        tenant_id: entry.tenantId,
        agent_id: entry.agentId,
        task_id: entry.taskId,
        model: entry.model,
        provider: entry.provider,
        input_tokens: entry.inputTokens,
        output_tokens: entry.outputTokens,
        total_tokens: entry.inputTokens + entry.outputTokens,
        input_cost_usd: (entry.inputTokens / 1000) * this.getModelInputCost(entry.provider, entry.model),
        output_cost_usd: (entry.outputTokens / 1000) * this.getModelOutputCost(entry.provider, entry.model),
        total_cost_usd: entry.costUsd,
        request_type: entry.requestType || 'task_execution',
        status: 'success',
      })
      .select('id')
      .single();

    if (error) {
      throw new LLMError('COST_TRACKING_ERROR', error.message, false);
    }

    return { success: true, costId: data?.id };
  }

  /**
   * Track an error/failed request
   */
  async trackError(
    entry: Omit<CostTrackingEntry, 'costUsd'>,
    errorMessage: string
  ): Promise<CostTrackingResult> {
    if (!this.config.enabled || !this.supabase) {
      return { success: true };
    }

    try {
      const { error } = await this.supabase
        .from('llm_costs')
        .insert({
          tenant_id: entry.tenantId,
          agent_id: entry.agentId,
          task_id: entry.taskId,
          model: entry.model,
          provider: entry.provider,
          input_tokens: entry.inputTokens,
          output_tokens: 0,
          total_tokens: entry.inputTokens,
          input_cost_usd: 0,
          output_cost_usd: 0,
          total_cost_usd: 0,
          request_type: entry.requestType || 'task_execution',
          status: 'error',
          error_message: errorMessage,
        });

      if (error) {
        throw new LLMError('COST_TRACKING_ERROR', error.message, false);
      }

      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }

  /**
   * Check if agent has budget remaining
   */
  private async checkBudget(
    agentId: string,
    tenantId: string,
    estimatedCost: number
  ): Promise<{ exceeded: boolean; remaining: number }> {
    const budget = await this.getAgentBudget(agentId, tenantId);
    
    if (!budget) {
      // No budget set, allow
      return { exceeded: false, remaining: Infinity };
    }

    const projectedSpend = budget.currentSpendUsd + estimatedCost;
    const remaining = budget.maxBudgetUsd - budget.currentSpendUsd;

    return {
      exceeded: projectedSpend > budget.maxBudgetUsd,
      remaining,
    };
  }

  /**
   * Get agent budget from cache or database
   */
  private async getAgentBudget(agentId: string, tenantId: string): Promise<AgentBudget | null> {
    const cacheKey = `${tenantId}:${agentId}`;
    
    // Check cache first
    const cached = this.budgetCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.supabase) {
      return null;
    }

    // Fetch from database
    const { data: agent, error } = await this.supabase
      .from('agents')
      .select('limits, stats')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !agent) {
      return null;
    }

    const limits = agent.limits as { max_cost_per_task_usd?: number } | null;
    const stats = agent.stats as { total_cost_usd?: number } | null;

    if (!limits?.max_cost_per_task_usd) {
      return null;
    }

    const budget: AgentBudget = {
      agentId,
      tenantId,
      maxBudgetUsd: limits.max_cost_per_task_usd,
      currentSpendUsd: stats?.total_cost_usd || 0,
      warningThreshold: this.config.warningThreshold,
    };

    this.budgetCache.set(cacheKey, budget);
    return budget;
  }

  /**
   * Update budget cache after recording cost
   */
  private updateBudgetCache(agentId: string, tenantId: string, costUsd: number): void {
    const cacheKey = `${tenantId}:${agentId}`;
    const budget = this.budgetCache.get(cacheKey);
    
    if (budget) {
      budget.currentSpendUsd += costUsd;
      this.budgetCache.set(cacheKey, budget);
    }
  }

  /**
   * Get cost per 1K input tokens for a model
   */
  private getModelInputCost(provider: LLMProvider, model: string): number {
    // Import from providers to get accurate pricing
    const { ALL_MODELS } = require('./providers');
    const modelInfo = ALL_MODELS.find((m: { id: string; costPer1KInput: number }) => m.id === model);
    return modelInfo?.costPer1KInput || 0;
  }

  /**
   * Get cost per 1K output tokens for a model
   */
  private getModelOutputCost(provider: LLMProvider, model: string): number {
    const { ALL_MODELS } = require('./providers');
    const modelInfo = ALL_MODELS.find((m: { id: string; costPer1KOutput: number }) => m.id === model);
    return modelInfo?.costPer1KOutput || 0;
  }

  /**
   * Get cost summary for a tenant
   */
  async getTenantCostSummary(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostSummary> {
    if (!this.supabase) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        avgCostPerRequest: 0,
        avgTokensPerRequest: 0,
      };
    }

    const { data, error } = await this.supabase.rpc('get_tenant_cost_summary', {
      p_tenant_id: tenantId,
      p_start_date: startDate?.toISOString(),
      p_end_date: endDate?.toISOString(),
    });

    if (error) {
      throw new LLMError('COST_SUMMARY_ERROR', error.message, false);
    }

    const result = data?.[0];
    return {
      totalRequests: Number(result?.total_requests || 0),
      totalTokens: Number(result?.total_tokens || 0),
      totalCostUsd: Number(result?.total_cost_usd || 0),
      avgCostPerRequest: Number(result?.avg_cost_per_request || 0),
      avgTokensPerRequest: Number(result?.avg_tokens_per_request || 0),
    };
  }

  /**
   * Get cost breakdown by model for a tenant
   */
  async getCostByModel(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostBreakdownByModel[]> {
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase.rpc('get_tenant_cost_by_model', {
      p_tenant_id: tenantId,
      p_start_date: startDate?.toISOString(),
      p_end_date: endDate?.toISOString(),
    });

    if (error) {
      throw new LLMError('COST_BREAKDOWN_ERROR', error.message, false);
    }

    return (data || []).map((row: {
      model: string;
      provider: string;
      request_count: number;
      total_tokens: number;
      total_cost_usd: number;
    }) => ({
      model: row.model,
      provider: row.provider,
      requestCount: Number(row.request_count),
      totalTokens: Number(row.total_tokens),
      totalCostUsd: Number(row.total_cost_usd),
    }));
  }

  /**
   * Get daily costs for a tenant
   */
  async getDailyCosts(
    tenantId: string,
    days: number = 30
  ): Promise<Array<{
    date: string;
    requestCount: number;
    totalTokens: number;
    totalCostUsd: number;
  }>> {
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase.rpc('get_tenant_daily_costs', {
      p_tenant_id: tenantId,
      p_days: days,
    });

    if (error) {
      throw new LLMError('DAILY_COSTS_ERROR', error.message, false);
    }

    return (data || []).map((row: {
      date: string;
      request_count: number;
      total_tokens: number;
      total_cost_usd: number;
    }) => ({
      date: row.date,
      requestCount: Number(row.request_count),
      totalTokens: Number(row.total_tokens),
      totalCostUsd: Number(row.total_cost_usd),
    }));
  }

  /**
   * Get cost summary for an agent
   */
  async getAgentCostSummary(agentId: string): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCostUsd: number;
    lastRequestAt?: string;
  }> {
    if (!this.supabase) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCostUsd: 0,
      };
    }

    const { data, error } = await this.supabase.rpc('get_agent_cost_summary', {
      p_agent_id: agentId,
    });

    if (error) {
      throw new LLMError('AGENT_COST_ERROR', error.message, false);
    }

    const result = data?.[0];
    return {
      totalRequests: Number(result?.total_requests || 0),
      totalTokens: Number(result?.total_tokens || 0),
      totalCostUsd: Number(result?.total_cost_usd || 0),
      lastRequestAt: result?.last_request_at,
    };
  }

  /**
   * Clear budget cache
   */
  clearCache(): void {
    this.budgetCache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CostTrackingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CostTrackingConfig {
    return { ...this.config };
  }
}

// Singleton instance
let globalCostTracker: CostTracker | null = null;

/**
 * Get or create global cost tracker instance
 */
export function getCostTracker(config?: Partial<CostTrackingConfig>): CostTracker {
  if (!globalCostTracker) {
    globalCostTracker = new CostTracker(config);
  }
  return globalCostTracker;
}

/**
 * Reset global cost tracker (useful for testing)
 */
export function resetCostTracker(): void {
  globalCostTracker = null;
}

/**
 * Quick track function using global tracker
 */
export async function trackCost(entry: CostTrackingEntry): Promise<CostTrackingResult> {
  const tracker = getCostTracker();
  return tracker.trackCost(entry);
}
