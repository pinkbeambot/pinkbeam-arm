/**
 * Agent Spawn Edge Function
 * Handles agent creation and initialization in the ARM runtime
 */

import { createAdminClient, generateUUID, nowISO, createLogger, RuntimeResponse, AgentIdentity, logActivity, getDefaultAgentConfig, validateCapability } from './_shared/utils.ts';

const logger = createLogger('spawn');

// Spawn request payload
interface SpawnRequestPayload {
  name: string;
  role: 'ceo' | 'manager' | 'worker' | 'specialist' | 'system';
  goal: string;
  context: {
    task_description?: string;
    relevant_history?: unknown[];
    parent_context?: Record<string, unknown>;
  };
  config: {
    capabilities?: string[];
    model?: string;
    escalation_threshold?: number;
    max_sub_agents?: number;
    timeout_seconds?: number;
    budget?: {
      max_tokens: number;
      max_cost_usd: number;
    };
  };
  parent_task_id?: string;
}

// Spawn response payload
interface SpawnResponsePayload {
  success: boolean;
  agent?: AgentIdentity & { name: string; status: string };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  context_snapshot?: {
    spawned_at: string;
    initial_state: string;
  };
}

/**
 * Spawn a new agent
 */
async function spawnAgent(
  tenantId: string,
  parentAgentId: string | null,
  payload: SpawnRequestPayload
): Promise<RuntimeResponse<SpawnResponsePayload>> {
  const supabase = createAdminClient();
  
  try {
    // Get parent agent details if applicable
    let parentAgent: { id: string; root_id: string; depth: number; tenant_id: string; capabilities: string[] } | null = null;
    
    if (parentAgentId) {
      const { data, error } = await supabase
        .from('agents')
        .select('id, root_id, depth, tenant_id, capabilities')
        .eq('id', parentAgentId)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'Parent agent not found',
            retryable: false,
          },
        };
      }

      // Verify tenant match
      if (data.tenant_id !== tenantId) {
        return {
          success: false,
          error: {
            code: 'TENANT_MISMATCH',
            message: 'Parent agent belongs to different tenant',
            retryable: false,
          },
        };
      }

      // Check parent has spawn capability
      if (!data.capabilities.includes('spawn')) {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Parent agent lacks spawn capability',
            retryable: false,
          },
        };
      }

      parentAgent = data;
    }

    // Get default config for role
    const defaultConfig = getDefaultAgentConfig(payload.role);
    
    // Merge provided config with defaults
    const capabilities = payload.config.capabilities || defaultConfig.capabilities as string[];
    const maxSubAgents = payload.config.max_sub_agents ?? defaultConfig.max_sub_agents as number;
    const escalationThreshold = payload.config.escalation_threshold ?? defaultConfig.escalation_threshold as number;
    const timeoutSeconds = payload.config.timeout_seconds || 300;

    // Generate agent ID
    const agentId = generateUUID();
    const rootId = parentAgent?.root_id || agentId;
    const depth = (parentAgent?.depth ?? -1) + 1;

    // Create agent record
    const { data: agent, error: insertError } = await supabase
      .from('agents')
      .insert({
        id: agentId,
        tenant_id: tenantId,
        name: payload.name,
        slug: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100),
        role: payload.role,
        description: payload.goal,
        parent_id: parentAgentId,
        root_id: rootId,
        depth,
        status: 'initializing',
        capabilities,
        config: {
          goal: payload.goal,
          context: payload.context,
          ...(payload.parent_task_id ? { parent_task_id: payload.parent_task_id } : {}),
        },
        llm_config: {
          provider: 'anthropic',
          model: payload.config.model || 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          max_tokens: payload.config.budget?.max_tokens || 4096,
        },
        limits: {
          max_sub_agents: maxSubAgents,
          escalation_threshold: escalationThreshold,
          timeout_seconds: timeoutSeconds,
          max_tokens_per_task: payload.config.budget?.max_tokens || 100000,
          max_cost_per_task_usd: payload.config.budget?.max_cost_usd || 5.00,
        },
      })
      .select('*')
      .single();

    if (insertError) {
      logger.error('Failed to create agent', insertError, { tenantId, parentAgentId });
      return {
        success: false,
        error: {
          code: 'AGENT_CREATION_FAILED',
          message: insertError.message,
          retryable: true,
        },
      };
    }

    // Log the spawn activity
    await logActivity(
      supabase,
      tenantId,
      'agent.spawned',
      'agent',
      parentAgentId || 'system',
      agentId,
      `Agent "${payload.name}" spawned`,
      `Created as ${payload.role} under ${parentAgentId ? 'parent agent' : 'root'}`,
      {
        role: payload.role,
        parent_id: parentAgentId,
        depth,
      },
      agentId
    );

    // Create session for the new agent
    const { error: sessionError } = await supabase
      .from('agent_sessions')
      .insert({
        tenant_id: tenantId,
        agent_id: agentId,
        context: {
          goal: payload.goal,
          initial_context: payload.context,
          spawned_at: nowISO(),
        },
        runtime_version: '1.0.0',
        environment: Deno.env.get('ENVIRONMENT') || 'production',
      });

    if (sessionError) {
      logger.error('Failed to create session', sessionError, { agentId });
      // Non-fatal, continue
    }

    // Transition agent to idle status
    await supabase
      .from('agents')
      .update({ status: 'idle', activated_at: nowISO() })
      .eq('id', agentId);

    logger.info('Agent spawned successfully', { 
      agentId, 
      tenantId, 
      role: payload.role,
      parentId: parentAgentId,
    });

    return {
      success: true,
      data: {
        success: true,
        agent: {
          id: agentId,
          tenant_id: tenantId,
          parent_id: parentAgentId,
          root_id: rootId,
          depth,
          role: payload.role,
          capabilities,
          name: payload.name,
          status: 'idle',
        },
        context_snapshot: {
          spawned_at: nowISO(),
          initial_state: 'idle',
        },
      },
    };

  } catch (error) {
    logger.error('Unexpected error spawning agent', error, { tenantId, parentAgentId });
    return {
      success: false,
      error: {
        code: 'SPAWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error during spawn',
        retryable: true,
      },
    };
  }
}

/**
 * Deno Edge Function Handler
 */
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed', retryable: false } }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get JWT from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization', retryable: false } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { tenant_id, parent_agent_id, payload } = body;

    if (!tenant_id || !payload) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields', retryable: false } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Spawn the agent
    const result = await spawnAgent(tenant_id, parent_agent_id || null, payload);

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    logger.error('Handler error', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
          retryable: true,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
