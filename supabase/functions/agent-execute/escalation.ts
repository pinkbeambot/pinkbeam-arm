/**
 * Escalation Manager
 * 
 * Handles creation and management of escalations
 */

import { createAdminClient, createLogger, RuntimeResponse, nowISO } from '../_shared/utils.ts';

const logger = createLogger('escalation-manager');

interface EscalationParams {
  tenant_id: string;
  agent_id: string;
  task_id?: string;
  type: 'clarification' | 'approval' | 'error' | 'edge_case' | 'policy_violation';
  urgency: 'low' | 'normal' | 'high' | 'critical';
  title: string;
  description: string;
  situation_context: {
    current_task_id?: string;
    relevant_history?: string[];
  };
  question: {
    title: string;
    details: string;
    options?: string[];
  };
  agent_analysis: {
    what_i_know: string;
    what_i_dont_know: string;
    what_i_tried: string[];
    suggested_resolution?: string;
  };
}

interface Escalation {
  id: string;
  tenant_id: string;
  agent_id: string;
  task_id: string | null;
  type: string;
  urgency: string;
  status: string;
  title: string;
  description: string;
  situation_context: Record<string, unknown>;
  question: Record<string, unknown>;
  agent_analysis: Record<string, unknown>;
  created_at: string;
}

export class EscalationManager {
  private supabase: ReturnType<typeof createAdminClient>;

  constructor(supabase: ReturnType<typeof createAdminClient>) {
    this.supabase = supabase;
  }

  /**
   * Create a new escalation
   */
  async createEscalation(params: EscalationParams): Promise<RuntimeResponse<{ escalation_id: string; escalation: Escalation }>> {
    try {
      const escalationId = crypto.randomUUID();
      const now = nowISO();

      // Calculate SLA deadline based on urgency
      const slaDeadline = this.calculateSLADeadline(params.urgency);

      const escalationData = {
        id: escalationId,
        tenant_id: params.tenant_id,
        agent_id: params.agent_id,
        task_id: params.task_id || null,
        type: params.type,
        urgency: params.urgency,
        status: 'open',
        title: params.title,
        description: params.description,
        situation_context: params.situation_context,
        question: params.question,
        agent_analysis: params.agent_analysis,
        sla_deadline_at: slaDeadline,
        created_at: now,
        updated_at: now,
      };

      const { error } = await this.supabase
        .from('escalations')
        .insert(escalationData);

      if (error) {
        logger.error('Failed to create escalation', error, { agent_id: params.agent_id, task_id: params.task_id });
        return {
          success: false,
          error: {
            code: 'ESCALATION_CREATE_FAILED',
            message: error.message,
            retryable: true,
          },
        };
      }

      // Log the escalation
      await this.supabase.from('activities').insert({
        tenant_id: params.tenant_id,
        type: 'escalation.created',
        category: 'escalation',
        actor_type: 'agent',
        actor_id: params.agent_id,
        title: `Escalation: ${params.title}`,
        description: params.description,
        metadata: {
          escalation_id: escalationId,
          escalation_type: params.type,
          urgency: params.urgency,
        },
        agent_id: params.agent_id,
        task_id: params.task_id,
      });

      // Update agent stats
      await this.supabase.rpc('increment_agent_stat', {
        p_agent_id: params.agent_id,
        p_stat_name: 'escalations_raised',
      });

      logger.info('Escalation created', {
        escalation_id: escalationId,
        agent_id: params.agent_id,
        task_id: params.task_id,
        type: params.type,
        urgency: params.urgency,
      });

      return {
        success: true,
        data: {
          escalation_id: escalationId,
          escalation: escalationData as Escalation,
        },
      };
    } catch (error) {
      logger.error('Create escalation failed', error, { agent_id: params.agent_id });
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
   * Get escalation by ID
   */
  async getEscalation(escalationId: string, tenantId: string): Promise<RuntimeResponse<Escalation>> {
    try {
      const { data, error } = await this.supabase
        .from('escalations')
        .select('*')
        .eq('id', escalationId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'ESCALATION_NOT_FOUND',
            message: error.message,
            retryable: false,
          },
        };
      }

      return {
        success: true,
        data: data as Escalation,
      };
    } catch (error) {
      logger.error('Get escalation failed', error, { escalationId });
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
   * Resolve an escalation
   */
  async resolveEscalation(
    escalationId: string,
    tenantId: string,
    resolution: {
      resolved_by: string;
      resolution_type: string;
      resolution_answer: string;
      resolution_resources?: Record<string, unknown>;
      learning_notes?: string;
    }
  ): Promise<RuntimeResponse<Escalation>> {
    try {
      const now = nowISO();

      // Get escalation for time calculation
      const { data: existing } = await this.supabase
        .from('escalations')
        .select('created_at')
        .eq('id', escalationId)
        .eq('tenant_id', tenantId)
        .single();

      const createdAt = existing?.created_at ? new Date(existing.created_at) : new Date();
      const resolvedAt = new Date(now);
      const timeToResolve = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 1000);

      const { data, error } = await this.supabase
        .from('escalations')
        .update({
          status: 'resolved',
          resolved_by: resolution.resolved_by,
          resolution_type: resolution.resolution_type,
          resolution_answer: resolution.resolution_answer,
          resolution_resources: resolution.resolution_resources || {},
          learning_notes: resolution.learning_notes,
          resolved_at: now,
          time_to_resolve_seconds: timeToResolve,
          updated_at: now,
        })
        .eq('id', escalationId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'RESOLVE_FAILED',
            message: error.message,
            retryable: true,
          },
        };
      }

      // Log resolution
      await this.supabase.from('activities').insert({
        tenant_id: tenantId,
        type: 'escalation.resolved',
        category: 'escalation',
        actor_type: 'user',
        actor_id: resolution.resolved_by,
        title: 'Escalation resolved',
        description: resolution.resolution_answer,
        metadata: {
          escalation_id: escalationId,
          resolution_type: resolution.resolution_type,
          time_to_resolve_seconds: timeToResolve,
        },
      });

      return {
        success: true,
        data: data as Escalation,
      };
    } catch (error) {
      logger.error('Resolve escalation failed', error, { escalationId });
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
   * Get open escalations for a tenant
   */
  async getOpenEscalations(
    tenantId: string,
    options?: {
      agentId?: string;
      urgency?: string;
      limit?: number;
    }
  ): Promise<RuntimeResponse<Escalation[]>> {
    try {
      let query = this.supabase
        .from('escalations')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['open', 'in_progress']);

      if (options?.agentId) {
        query = query.eq('agent_id', options.agentId);
      }

      if (options?.urgency) {
        query = query.eq('urgency', options.urgency);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      // Order by urgency (critical first) then creation time
      query = query.order('urgency', { ascending: false }).order('created_at', { ascending: true });

      const { data, error } = await query;

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
        data: (data || []) as Escalation[],
      };
    } catch (error) {
      logger.error('Get open escalations failed', error, { tenantId });
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
   * Check if an agent has exceeded escalation threshold
   */
  async checkEscalationThreshold(agentId: string, threshold: number): Promise<RuntimeResponse<{ exceeded: boolean; recent_count: number }>> {
    try {
      // Get count of recent escalations (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { count, error } = await this.supabase
        .from('escalations')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .gte('created_at', oneDayAgo);

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

      const recentCount = count || 0;
      const exceeded = recentCount >= threshold;

      return {
        success: true,
        data: {
          exceeded,
          recent_count: recentCount,
        },
      };
    } catch (error) {
      logger.error('Check escalation threshold failed', error, { agentId });
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
   * Calculate SLA deadline based on urgency
   */
  private calculateSLADeadline(urgency: string): string {
    const now = new Date();
    const hours = {
      critical: 1,
      high: 4,
      normal: 24,
      low: 72,
    }[urgency] || 24;

    now.setHours(now.getHours() + hours);
    return now.toISOString();
  }
}
