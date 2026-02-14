/**
 * Cost Tracker
 * 
 * Records LLM API costs for billing and analytics
 * Uses the llm_costs table from migration 017
 */

import { createAdminClient, createLogger, RuntimeResponse } from '../_shared/utils.ts';

const logger = createLogger('cost-tracker');

interface CostRecordParams {
  tenant_id: string;
  agent_id: string;
  task_id?: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  request_type?: string;
  status?: 'success' | 'error' | 'cached';
  error_message?: string;
}

interface CostSummary {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_cost_per_request: number;
  avg_tokens_per_request: number;
}

interface AgentCostSummary {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  last_request_at: string | null;
}

export class CostTracker {
  private supabase: ReturnType<typeof createAdminClient>;

  constructor(supabase: ReturnType<typeof createAdminClient>) {
    this.supabase = supabase;
  }

  /**
   * Record a new LLM cost entry
   * Uses the record_llm_cost database function
   */
  async recordCost(params: CostRecordParams): Promise<string | null> {
    try {
      const {
        tenant_id,
        agent_id,
        task_id,
        model,
        provider,
        input_tokens,
        output_tokens,
        request_type = 'task_execution',
        status = 'success',
        error_message,
      } = params;

      // Calculate costs using pricing
      const { inputCost, outputCost } = this.calculateCosts(
        model,
        input_tokens,
        output_tokens
      );

      // Call the database function to record cost
      const { data, error } = await this.supabase.rpc('record_llm_cost', {
        p_tenant_id: tenant_id,
        p_agent_id: agent_id,
        p_task_id: task_id || null,
        p_model: model,
        p_provider: provider,
        p_input_tokens: input_tokens,
        p_output_tokens: output_tokens,
        p_input_cost_usd: inputCost,
        p_output_cost_usd: outputCost,
        p_request_type: request_type,
        p_status: status,
        p_error_message: error_message,
      });

      if (error) {
        logger.error('Failed to record cost', error, { agent_id, task_id });
        return null;
      }

      logger.debug('Cost recorded', {
        cost_id: data,
        agent_id,
        task_id,
        total_cost: inputCost + outputCost,
      });

      return data as string;
    } catch (error) {
      logger.error('Error recording cost', error, { agent_id: task_id: params.task_id });
      return null;
    }
  }

  /**
   * Get cost summary for a tenant
   */
  async getTenantCostSummary(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RuntimeResponse<CostSummary>> {
    try {
      const { data, error } = await this.supabase.rpc('get_tenant_cost_summary', {
        p_tenant_id: tenantId,
        p_start_date: startDate?.toISOString(),
        p_end_date: endDate?.toISOString(),
      });

      if (error) {
        return {
          success: false,
          error: {
            code: 'QUERY_FAILED',
            message: error.message,
            retryable: true,
          },
        };
      }

      return {
        success: true,
        data: data as CostSummary,
      };
    } catch (error) {
      logger.error('Get tenant cost summary failed', error, { tenantId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Get cost breakdown by model for a tenant
   */
  async getCostByModel(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RuntimeResponse<Array<{ model: string; provider: string; request_count: number; total_tokens: number; total_cost_usd: number }>>> {
    try {
      const { data, error } = await this.supabase.rpc('get_tenant_cost_by_model', {
        p_tenant_id: tenantId,
        p_start_date: startDate?.toISOString(),
        p_end_date: endDate?.toISOString(),
      });

      if (error) {
        return {
          success: false,
          error: {
            code: 'QUERY_FAILED',
            message: error.message,
            retryable: true,
          },
        };
      }

      return {
        success: true,
        data: data as Array<{ model: string; provider: string; request_count: number; total_tokens: number; total_cost_usd: number }>,
      };
    } catch (error) {
      logger.error('Get cost by model failed', error, { tenantId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Get daily costs for a tenant
   */
  async getDailyCosts(
    tenantId: string,
    days: number = 30
  ): Promise<RuntimeResponse<Array<{ date: string; request_count: number; total_tokens: number; total_cost_usd: number }>>> {
    try {
      const { data, error } = await this.supabase.rpc('get_tenant_daily_costs', {
        p_tenant_id: tenantId,
        p_days: days,
      });

      if (error) {
        return {
          success: false,
          error: {
            code: 'QUERY_FAILED',
            message: error.message,
            retryable: true,
          },
        };
      }

      return {
        success: true,
        data: data as Array<{ date: string; request_count: number; total_tokens: number; total_cost_usd: number }>,
      };
    } catch (error) {
      logger.error('Get daily costs failed', error, { tenantId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Get cost summary for an agent
   */
  async getAgentCostSummary(agentId: string): Promise<RuntimeResponse<AgentCostSummary>> {
    try {
      const { data, error } = await this.supabase.rpc('get_agent_cost_summary', {
        p_agent_id: agentId,
      });

      if (error) {
        return {
          success: false,
          error: {
            code: 'QUERY_FAILED',
            message: error.message,
            retryable: true,
          },
        };
      }

      return {
        success: true,
        data: data as AgentCostSummary,
      };
    } catch (error) {
      logger.error('Get agent cost summary failed', error, { agentId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Get task execution costs
   */
  async getTaskCosts(taskId: string): Promise<RuntimeResponse<{ total_cost_usd: number; total_tokens: number; request_count: number }>> {
    try {
      const { data, error } = await this.supabase
        .from('llm_costs')
        .select('total_cost_usd, total_tokens')
        .eq('task_id', taskId);

      if (error) {
        return {
          success: false,
          error: {
            code: 'QUERY_FAILED',
            message: error.message,
            retryable: true,
          },
        };
      }

      const summary = (data || []).reduce(
        (acc, row) => ({
          total_cost_usd: acc.total_cost_usd + (row.total_cost_usd || 0),
          total_tokens: acc.total_tokens + (row.total_tokens || 0),
          request_count: acc.request_count + 1,
        }),
        { total_cost_usd: 0, total_tokens: 0, request_count: 0 }
      );

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      logger.error('Get task costs failed', error, { taskId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Check if agent has exceeded budget
   */
  async checkBudget(
    agentId: string,
    taskId: string,
    maxCostUsd?: number,
    maxTokens?: number
  ): Promise<{ exceeded: boolean; reason?: string; current_cost: number; current_tokens: number }> {
    try {
      const { data: taskCosts } = await this.getTaskCosts(taskId);
      const { data: agentCosts } = await this.getAgentCostSummary(agentId);

      const currentCost = taskCosts?.total_cost_usd || 0;
      const currentTokens = taskCosts?.total_tokens || 0;

      // Check task budget
      if (maxCostUsd && currentCost > maxCostUsd) {
        return {
          exceeded: true,
          reason: `Task cost $${currentCost.toFixed(4)} exceeds budget $${maxCostUsd}`,
          current_cost: currentCost,
          current_tokens: currentTokens,
        };
      }

      if (maxTokens && currentTokens > maxTokens) {
        return {
          exceeded: true,
          reason: `Task tokens ${currentTokens} exceeds budget ${maxTokens}`,
          current_cost: currentCost,
          current_tokens: currentTokens,
        };
      }

      return {
        exceeded: false,
        current_cost: currentCost,
        current_tokens: currentTokens,
      };
    } catch (error) {
      logger.error('Budget check failed', error, { agentId, taskId });
      return {
        exceeded: false,
        current_cost: 0,
        current_tokens: 0,
      };
    }
  }

  /**
   * Calculate costs from token usage
   */
  private calculateCosts(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): { inputCost: number; outputCost: number } {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
      'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
      'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
      'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
    };

    const p = pricing[model] || pricing['claude-3-5-sonnet-20241022'];
    const inputCost = parseFloat(((inputTokens / 1_000_000) * p.input).toFixed(8));
    const outputCost = parseFloat(((outputTokens / 1_000_000) * p.output).toFixed(8));

    return { inputCost, outputCost };
  }
}
