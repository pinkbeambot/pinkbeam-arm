/**
 * Agent Lifecycle Edge Function
 * Manages agent state transitions (pause, resume, terminate, etc.)
 */

import { createAdminClient, nowISO, createLogger, RuntimeResponse, logActivity, updateAgentStatus } from './_shared/utils.ts';

const logger = createLogger('lifecycle');

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  'initializing': ['idle', 'error', 'terminated'],
  'idle': ['active', 'paused', 'error', 'terminated'],
  'active': ['idle', 'paused', 'blocked', 'error', 'terminated'],
  'paused': ['idle', 'active', 'terminated'],
  'blocked': ['active', 'error', 'terminated'],
  'error': ['idle', 'paused', 'terminated'],
  'escaped': ['idle', 'terminated'],
  'terminated': [], // Terminal state
};

// Lifecycle action types
type LifecycleAction = 
  | 'pause'
  | 'resume'
  | 'terminate'
  | 'error'
  | 'escape'
  | 'block'
  | 'unblock';

interface LifecycleRequest {
  action: LifecycleAction;
  agent_id: string;
  tenant_id: string;
  triggered_by?: string; // Agent or user ID
  triggered_by_type?: 'agent' | 'user' | 'system';
  reason?: string;
  metadata?: Record<string, unknown>;
}

interface LifecycleResponse {
  success: boolean;
  agent_id: string;
  previous_state: string;
  new_state: string;
  timestamp: string;
}

/**
 * Check if state transition is valid
 */
function isValidTransition(currentState: string, newState: string): boolean {
  const allowed = VALID_TRANSITIONS[currentState] || [];
  return allowed.includes(newState);
}

/**
 * Get target state for action
 */
function getTargetState(currentState: string, action: LifecycleAction): string | null {
  const actionMap: Record<LifecycleAction, Record<string, string>> = {
    'pause': {
      'idle': 'paused',
      'active': 'paused',
    },
    'resume': {
      'paused': 'idle',
      'blocked': 'active',
      'error': 'idle',
      'escaped': 'idle',
    },
    'terminate': {
      'initializing': 'terminated',
      'idle': 'terminated',
      'active': 'terminated',
      'paused': 'terminated',
      'blocked': 'terminated',
      'error': 'terminated',
      'escaped': 'terminated',
    },
    'error': {
      'initializing': 'error',
      'idle': 'error',
      'active': 'error',
      'blocked': 'error',
    },
    'escape': {
      'idle': 'escaped',
      'active': 'escaped',
      'paused': 'escaped',
      'blocked': 'escaped',
    },
    'block': {
      'idle': 'blocked',
      'active': 'blocked',
    },
    'unblock': {
      'blocked': 'active',
    },
  };

  return actionMap[action]?.[currentState] || null;
}

/**
 * Process lifecycle action
 */
async function processLifecycleAction(
  request: LifecycleRequest
): Promise<RuntimeResponse<LifecycleResponse>> {
  const supabase = createAdminClient();
  
  try {
    // Get current agent state
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select('id, tenant_id, status, name, parent_id')
      .eq('id', request.agent_id)
      .eq('tenant_id', request.tenant_id)
      .single();

    if (fetchError || !agent) {
      return {
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or tenant mismatch',
          retryable: false,
        },
      };
    }

    const currentState = agent.status;
    const targetState = getTargetState(currentState, request.action);

    if (!targetState) {
      return {
        success: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot ${request.action} from ${currentState} state`,
          retryable: false,
        },
      };
    }

    if (!isValidTransition(currentState, targetState)) {
      return {
        success: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: `Transition from ${currentState} to ${targetState} is not allowed`,
          retryable: false,
        },
      };
    }

    // Special handling for terminate - cascade to children
    if (request.action === 'terminate') {
      await terminateAgentCascade(supabase, request.agent_id, request.tenant_id, request.reason);
    } else {
      // Update agent status
      const updateResult = await updateAgentStatus(
        supabase,
        request.agent_id,
        targetState,
        request.reason
      );

      if (!updateResult.success) {
        return updateResult as RuntimeResponse<LifecycleResponse>;
      }
    }

    // Log the lifecycle event
    await logActivity(
      supabase,
      request.tenant_id,
      `agent.status_changed`,
      'agent',
      request.triggered_by || 'system',
      request.triggered_by_type || 'system',
      `Agent ${request.action}d`,
      `State changed from ${currentState} to ${targetState}`,
      {
        action: request.action,
        previous_state: currentState,
        new_state: targetState,
        reason: request.reason,
        ...request.metadata,
      },
      request.agent_id
    );

    // Record lifecycle event
    await supabase.from('agent_lifecycle_events').insert({
      tenant_id: request.tenant_id,
      agent_id: request.agent_id,
      event_type: request.action === 'terminate' ? 'terminated' : 
                  request.action === 'escape' ? 'error' : 
                  request.action === 'error' ? 'error' :
                  request.action === 'pause' ? 'paused' : 
                  request.action === 'resume' ? 'resumed' : 'resumed',
      previous_state: currentState,
      new_state: targetState,
      triggered_by: request.triggered_by,
      triggered_by_type: request.triggered_by_type || 'system',
      reason: request.reason,
      metadata: request.metadata || {},
    });

    logger.info(`Agent ${request.action}d`, {
      agentId: request.agent_id,
      fromState: currentState,
      toState: targetState,
    });

    return {
      success: true,
      data: {
        success: true,
        agent_id: request.agent_id,
        previous_state: currentState,
        new_state: targetState,
        timestamp: nowISO(),
      },
    };

  } catch (error) {
    logger.error('Lifecycle action failed', error, { 
      agentId: request.agent_id, 
      action: request.action 
    });
    return {
      success: false,
      error: {
        code: 'LIFECYCLE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

/**
 * Terminate agent and all children recursively
 */
async function terminateAgentCascade(
  supabase: ReturnType<typeof createAdminClient>,
  agentId: string,
  tenantId: string,
  reason?: string
): Promise<void> {
  // Get all descendants
  const { data: descendants } = await supabase
    .from('agents')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .or(`parent_id.eq.${agentId},root_id.eq.${agentId}`);

  // Terminate children first (bottom-up)
  if (descendants && descendants.length > 0) {
    const children = descendants.filter(d => d.id !== agentId);
    
    for (const child of children) {
      if (child.status !== 'terminated') {
        await supabase
          .from('agents')
          .update({
            status: 'terminated',
            status_reason: `Parent agent terminated: ${reason || 'No reason given'}`,
            terminated_at: nowISO(),
            updated_at: nowISO(),
          })
          .eq('id', child.id);

        // End session
        await supabase
          .from('agent_sessions')
          .update({ ended_at: nowISO() })
          .eq('agent_id', child.id);
      }
    }
  }

  // Terminate the agent itself
  await supabase
    .from('agents')
    .update({
      status: 'terminated',
      status_reason: reason,
      terminated_at: nowISO(),
      updated_at: nowISO(),
    })
    .eq('id', agentId);

  // End session
  await supabase
    .from('agent_sessions')
    .update({ ended_at: nowISO() })
    .eq('agent_id', agentId);

  // Clean up any pending tasks
  await supabase
    .from('tasks')
    .update({
      status: 'cancelled',
      updated_at: nowISO(),
    })
    .eq('assignee_id', agentId)
    .eq('tenant_id', tenantId)
    .in('status', ['queued', 'in_progress', 'blocked']);
}

/**
 * Get agent status
 */
async function getAgentStatus(
  tenantId: string,
  agentId: string
): Promise<RuntimeResponse<{ agent_id: string; status: string; state_details: Record<string, unknown> }>> {
  const supabase = createAdminClient();

  try {
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, status, status_reason, current_task_id, session_id, stats, depth, role, parent_id')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !agent) {
      return {
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found',
          retryable: false,
        },
      };
    }

    return {
      success: true,
      data: {
        agent_id: agent.id,
        status: agent.status,
        state_details: {
          reason: agent.status_reason,
          current_task_id: agent.current_task_id,
          session_id: agent.session_id,
          stats: agent.stats,
          depth: agent.depth,
          role: agent.role,
          parent_id: agent.parent_id,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'STATUS_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
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
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // GET request - fetch status
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const agentId = url.searchParams.get('agent_id');
      const tenantId = url.searchParams.get('tenant_id');

      if (!agentId || !tenantId) {
        return new Response(
          JSON.stringify({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing agent_id or tenant_id', retryable: false } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await getAgentStatus(tenantId, agentId);
      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // POST request - lifecycle action
    if (req.method === 'POST') {
      const body = await req.json();
      const result = await processLifecycleAction(body);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : (result.error?.code === 'INVALID_TRANSITION' || result.error?.code === 'AGENT_NOT_FOUND' ? 400 : 500),
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET/POST allowed', retryable: false } }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
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
