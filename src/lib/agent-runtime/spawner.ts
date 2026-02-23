/**
 * Agent Spawning Service
 * 
 * Handles creation of child agents with proper hierarchy, tenant inheritance,
 * and depth-based limits.
 * 
 * @module src/lib/agent-runtime/spawner
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Agent, AgentRole, Capability } from '@/types';

// UUID generation using native crypto
const generateUUID = () => crypto.randomUUID();

export interface SpawnerConfig {
  maxDepth: number;
  defaultCapabilities: Capability[];
}

export const DEFAULT_SPAWNER_CONFIG: SpawnerConfig = {
  maxDepth: 5,
  defaultCapabilities: ['decide', 'escalate'],
};

export interface SpawnAgentInput {
  name: string;
  role: AgentRole;
  description?: string;
  capabilities?: Capability[];
  llmConfig?: Record<string, unknown>;
}

export interface SpawnAgentResult {
  success: boolean;
  agent?: Agent;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export class SpawnerError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'SpawnerError';
  }
}

export class AgentSpawner {
  private config: SpawnerConfig;

  constructor(config?: Partial<SpawnerConfig>) {
    this.config = { ...DEFAULT_SPAWNER_CONFIG, ...config };
  }

  async spawnAgent(
    supabase: SupabaseClient,
    parentId: string | null,
    input: SpawnAgentInput
  ): Promise<SpawnAgentResult> {
    try {
      // Get parent context
      let tenantId: string | null = null;
      let rootId = '';
      let depth = 0;

      if (parentId) {
        const { data: parent, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', parentId)
          .single();

        if (error || !parent) {
          return {
            success: false,
            error: {
              code: 'PARENT_NOT_FOUND',
              message: `Parent agent ${parentId} not found`,
              retryable: false,
            },
          };
        }

        // Check spawn capability
        if (!parent.capabilities.includes('spawn')) {
          return {
            success: false,
            error: {
              code: 'SPAWN_CAPABILITY_REQUIRED',
              message: 'Parent agent does not have spawn capability',
              retryable: false,
            },
          };
        }

        // Check depth limit
        depth = parent.depth + 1;
        if (depth > this.config.maxDepth) {
          return {
            success: false,
            error: {
              code: 'MAX_DEPTH_EXCEEDED',
              message: `Maximum agent nesting depth (${this.config.maxDepth}) exceeded`,
              retryable: false,
            },
          };
        }

        tenantId = parent.tenant_id;
        rootId = parent.root_id || parentId;

        // Check role permissions
        if (parent.role === 'worker' || parent.role === 'specialist') {
          return {
            success: false,
            error: {
              code: 'INVALID_ROLE_PERMISSIONS',
              message: `${parent.role} agents cannot spawn child agents`,
              retryable: false,
            },
          };
        }
      } else {
        return {
          success: false,
          error: {
            code: 'PARENT_REQUIRED',
            message: 'Parent agent is required for spawning',
            retryable: false,
          },
        };
      }

      // Build capabilities
      const capabilities = input.capabilities || [...this.config.defaultCapabilities];
      if ((input.role === 'manager' || input.role === 'ceo') && !capabilities.includes('spawn')) {
        capabilities.push('spawn');
      }
      if ((input.role === 'manager' || input.role === 'ceo') && !capabilities.includes('delegate')) {
        capabilities.push('delegate');
      }

      // Create agent
      const agentId = generateUUID();
      const now = new Date().toISOString();

      const { data: agent, error: insertError } = await supabase
        .from('agents')
        .insert({
          id: agentId,
          tenant_id: tenantId,
          parent_id: parentId,
          root_id: rootId,
          depth,
          name: input.name,
          slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100),
          role: input.role,
          description: input.description || null,
          status: 'initializing',
          capabilities,
          llm_config: input.llmConfig || {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            temperature: 0.7,
            max_tokens: 4096,
          },
          limits: {
            max_sub_agents: input.role === 'ceo' ? 20 : input.role === 'manager' ? 10 : 5,
            escalation_threshold: 0.7,
            timeout_seconds: 300,
            max_tokens_per_task: 100000,
            max_cost_per_task_usd: 5.00,
          },
          stats: {
            tasks_completed: 0,
            tasks_failed: 0,
            escalations_raised: 0,
            avg_task_duration_seconds: 0,
            total_cost_usd: 0,
          },
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (insertError) {
        return {
          success: false,
          error: {
            code: 'AGENT_CREATE_FAILED',
            message: insertError.message,
            retryable: true,
          },
        };
      }

      // Log activity
      try {
        await supabase.from('activities').insert({
          tenant_id: tenantId,
          type: 'agent_spawned',
          category: 'agent',
          actor_type: 'agent',
          actor_id: parentId,
          target_type: 'agent',
          target_id: agentId,
          title: `Agent "${input.name}" spawned`,
          description: `New ${input.role} agent created with depth ${depth}`,
          metadata: { agent_id: agentId, parent_id: parentId, depth },
          agent_id: agentId,
        });
      } catch {
        // Activity logging is non-critical
      }

      return {
        success: true,
        agent: agent as Agent,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during spawn',
          retryable: true,
        },
      };
    }
  }

  getConfig(): SpawnerConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<SpawnerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

let globalSpawner: AgentSpawner | null = null;

export function getAgentSpawner(config?: Partial<SpawnerConfig>): AgentSpawner {
  if (!globalSpawner) {
    globalSpawner = new AgentSpawner(config);
  }
  return globalSpawner;
}

export function resetAgentSpawner(): void {
  globalSpawner = null;
}

export default AgentSpawner;
