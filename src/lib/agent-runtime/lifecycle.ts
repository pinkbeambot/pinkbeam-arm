/**
 * Agent Lifecycle Manager
 * 
 * Manages agent state transitions through the lifecycle:
 * initializing → idle → active → paused/blocked/error → terminated
 * 
 * @module src/lib/agent-runtime/lifecycle
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Agent } from '@/types';

export type LifecycleState = 
  | 'initializing' 
  | 'idle' 
  | 'active' 
  | 'busy'
  | 'paused' 
  | 'blocked' 
  | 'error' 
  | 'offline'
  | 'escaped' 
  | 'terminated';

export interface TransitionRequest {
  agentId: string;
  newState: LifecycleState;
  reason?: string;
  triggeredBy: {
    type: 'agent' | 'parent' | 'system' | 'user';
    id: string;
  };
}

export interface TransitionResult {
  success: boolean;
  agent?: Agent;
  previousState?: LifecycleState;
  newState?: LifecycleState;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface LifecycleConfig {
  logTransitions: boolean;
  requireReasonFor: LifecycleState[];
}

export const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  logTransitions: true,
  requireReasonFor: ['error', 'terminated', 'blocked', 'paused'],
};

// Valid state transitions
const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  initializing: ['idle', 'error'],
  idle: ['active', 'paused', 'terminated'],
  active: ['idle', 'busy', 'blocked', 'paused', 'error'],
  busy: ['active', 'blocked', 'error'],
  blocked: ['active', 'idle', 'escaped'],
  paused: ['idle', 'terminated'],
  error: ['idle', 'terminated'],
  escaped: ['active', 'terminated'],
  offline: ['idle'],
  terminated: [],
};

// Who can trigger transitions
const TRANSITION_AUTH: Record<string, string[]> = {
  'initializing->idle': ['agent', 'parent', 'system'],
  'initializing->error': ['agent', 'parent', 'system'],
  'idle->active': ['agent', 'parent', 'system'],
  'idle->paused': ['parent', 'system'],
  'idle->terminated': ['parent', 'system'],
  'active->idle': ['agent', 'parent', 'system'],
  'active->busy': ['agent', 'parent', 'system'],
  'active->blocked': ['agent', 'parent', 'system'],
  'active->paused': ['parent', 'system'],
  'active->error': ['agent', 'parent', 'system'],
  'blocked->active': ['parent', 'system'],
  'blocked->idle': ['parent', 'system'],
  'blocked->escaped': ['system'],
  'paused->idle': ['parent', 'system'],
  'paused->terminated': ['parent', 'system'],
  'error->idle': ['parent', 'system'],
  'error->terminated': ['parent', 'system'],
  'escaped->active': ['system'],
  'escaped->terminated': ['system'],
};

export class AgentLifecycleManager {
  private config: LifecycleConfig;

  constructor(config?: Partial<LifecycleConfig>) {
    this.config = { ...DEFAULT_LIFECYCLE_CONFIG, ...config };
  }

  async transition(
    supabase: SupabaseClient,
    request: TransitionRequest
  ): Promise<TransitionResult> {
    try {
      // Get current agent state
      const { data: agent, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', request.agentId)
        .single();

      if (fetchError || !agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent ${request.agentId} not found`,
            retryable: false,
          },
        };
      }

      const currentState = agent.status as LifecycleState;
      const newState = request.newState;

      // Check if transition is valid
      if (!VALID_TRANSITIONS[currentState]?.includes(newState)) {
        return {
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot transition from "${currentState}" to "${newState}"`,
            retryable: false,
          },
        };
      }

      // Check authorization
      const transitionKey = `${currentState}->${newState}`;
      const authorized = TRANSITION_AUTH[transitionKey]?.includes(request.triggeredBy.type);
      if (!authorized) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: `${request.triggeredBy.type} is not authorized for this transition`,
            retryable: false,
          },
        };
      }

      // Check reason requirement
      if (this.config.requireReasonFor.includes(newState) && !request.reason) {
        return {
          success: false,
          error: {
            code: 'REASON_REQUIRED',
            message: `Transition to "${newState}" requires a reason`,
            retryable: false,
          },
        };
      }

      // Special: can't terminate with active task
      if (newState === 'terminated' && agent.current_task_id) {
        return {
          success: false,
          error: {
            code: 'TERMINATION_BLOCKED',
            message: 'Cannot terminate agent with active task',
            retryable: false,
          },
        };
      }

      // Perform transition
      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = {
        status: newState,
        status_reason: request.reason || null,
        updated_at: now,
      };

      if (newState === 'terminated') {
        updateData.terminated_at = now;
      }

      if (newState === 'idle' && currentState === 'initializing') {
        updateData.activated_at = now;
      }

      const { data: updatedAgent, error: updateError } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', request.agentId)
        .select('*')
        .single();

      if (updateError) {
        return {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: updateError.message,
            retryable: true,
          },
        };
      }

      // Log activity
      if (this.config.logTransitions) {
        try {
          await supabase.from('activities').insert({
            tenant_id: agent.tenant_id,
            type: 'agent_status_changed',
            category: 'agent',
            actor_type: request.triggeredBy.type,
            actor_id: request.triggeredBy.id,
            target_type: 'agent',
            target_id: agent.id,
            title: `Agent "${agent.name}" status changed`,
            description: `Changed from "${currentState}" to "${newState}"`,
            metadata: {
              agent_id: agent.id,
              previous_state: currentState,
              new_state: newState,
              reason: request.reason,
            },
            agent_id: agent.id,
          });
        } catch {
          // Activity logging is non-critical
        }
      }

      return {
        success: true,
        agent: updatedAgent as Agent,
        previousState: currentState,
        newState,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during transition',
          retryable: true,
        },
      };
    }
  }

  async bulkTransition(
    supabase: SupabaseClient,
    agentIds: string[],
    newState: LifecycleState,
    triggeredBy: TransitionRequest['triggeredBy'],
    reason?: string
  ): Promise<{ successful: string[]; failed: { id: string; error: string }[] }> {
    const results = {
      successful: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const agentId of agentIds) {
      const result = await this.transition(supabase, {
        agentId,
        newState,
        triggeredBy,
        reason,
      });

      if (result.success) {
        results.successful.push(agentId);
      } else {
        results.failed.push({
          id: agentId,
          error: result.error?.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  getValidTransitions(fromState: LifecycleState): LifecycleState[] {
    return VALID_TRANSITIONS[fromState] || [];
  }

  isValidTransition(from: LifecycleState, to: LifecycleState): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) || false;
  }

  getConfig(): LifecycleConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<LifecycleConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

let globalLifecycleManager: AgentLifecycleManager | null = null;

export function getLifecycleManager(config?: Partial<LifecycleConfig>): AgentLifecycleManager {
  if (!globalLifecycleManager) {
    globalLifecycleManager = new AgentLifecycleManager(config);
  }
  return globalLifecycleManager;
}

export function resetLifecycleManager(): void {
  globalLifecycleManager = null;
}

export default AgentLifecycleManager;
