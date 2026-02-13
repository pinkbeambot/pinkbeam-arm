/**
 * Agent Executor Edge Function
 * Handles task execution and decision processing
 */

import { createAdminClient, nowISO, createLogger, RuntimeResponse, logActivity, validateCapability, updateAgentStatus, ANTHROPIC_API_KEY } from './_shared/utils.ts';

const logger = createLogger('executor');

// Task execution types
interface TaskExecutionRequest {
  task_id: string;
  agent_id: string;
  tenant_id: string;
  action: 'claim' | 'start' | 'progress' | 'complete' | 'fail';
  payload?: {
    progress_percent?: number;
    current_step?: string;
    outputs?: Record<string, unknown>;
    error_message?: string;
    cost_usd?: number;
    tokens_used?: number;
  };
}

interface TaskExecutionResponse {
  success: boolean;
  task_id: string;
  status: string;
  timestamp: string;
}

// Decision execution types
interface DecisionExecutionRequest {
  decision_id: string;
  agent_id: string;
  tenant_id: string;
  action: 'propose' | 'confirm' | 'override' | 'execute';
  payload?: {
    approved?: boolean;
    override_reason?: string;
    executed_action?: Record<string, unknown>;
    outcome?: Record<string, unknown>;
  };
}

/**
 * Execute task action
 */
async function executeTaskAction(
  request: TaskExecutionRequest
): Promise<RuntimeResponse<TaskExecutionResponse>> {
  const supabase = createAdminClient();
  
  try {
    // Verify task exists and belongs to tenant
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, tenant_id, status, assignee_id, title')
      .eq('id', request.task_id)
      .eq('tenant_id', request.tenant_id)
      .single();

    if (taskError || !task) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found or tenant mismatch',
          retryable: false,
        },
      };
    }

    // Verify agent assignment
    if (task.assignee_id !== request.agent_id && request.action !== 'claim') {
      return {
        success: false,
        error: {
          code: 'NOT_ASSIGNED',
          message: 'Task is not assigned to this agent',
          retryable: false,
        },
      };
    }

    const now = nowISO();
    let newStatus = task.status;
    let updateData: Record<string, unknown> = { updated_at: now };

    switch (request.action) {
      case 'claim':
        if (task.status !== 'queued') {
          return {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: `Cannot claim task in ${task.status} status`,
              retryable: false,
            },
          };
        }
        newStatus = 'queued';
        updateData = {
          ...updateData,
          assignee_id: request.agent_id,
        };
        
        // Add to queue
        await supabase.from('agent_task_queue').insert({
          tenant_id: request.tenant_id,
          task_id: request.task_id,
          agent_id: request.agent_id,
          status: 'claimed',
          claimed_at: now,
        });
        break;

      case 'start':
        if (task.status !== 'queued') {
          return {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: `Cannot start task in ${task.status} status`,
              retryable: false,
            },
          };
        }
        newStatus = 'in_progress';
        updateData = {
          ...updateData,
          status: 'in_progress',
          started_at: now,
          progress_percent: 0,
        };
        
        // Update agent status
        await updateAgentStatus(supabase, request.agent_id, 'active');
        await supabase
          .from('agents')
          .update({ current_task_id: request.task_id })
          .eq('id', request.agent_id);
        break;

      case 'progress':
        if (task.status !== 'in_progress') {
          return {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: `Cannot update progress for task in ${task.status} status`,
              retryable: false,
            },
          };
        }
        updateData = {
          ...updateData,
          progress_percent: request.payload?.progress_percent ?? task.status,
          current_step: request.payload?.current_step,
        };
        break;

      case 'complete':
        if (task.status !== 'in_progress' && task.status !== 'review') {
          return {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: `Cannot complete task in ${task.status} status`,
              retryable: false,
            },
          };
        }
        newStatus = 'completed';
        updateData = {
          ...updateData,
          status: 'completed',
          completed_at: now,
          progress_percent: 100,
          outputs: request.payload?.outputs ?? {},
          cost_usd: request.payload?.cost_usd ?? 0,
          tokens_used: request.payload?.tokens_used ?? 0,
        };
        
        // Update agent status back to idle
        await updateAgentStatus(supabase, request.agent_id, 'idle');
        await supabase
          .from('agents')
          .update({ current_task_id: null })
          .eq('id', request.agent_id);
        
        // Update queue
        await supabase
          .from('agent_task_queue')
          .update({ status: 'completed', completed_at: now })
          .eq('task_id', request.task_id)
          .eq('tenant_id', request.tenant_id);
        break;

      case 'fail':
        newStatus = 'failed';
        updateData = {
          ...updateData,
          status: 'failed',
          current_step: request.payload?.error_message || 'Task failed',
        };
        
        // Update agent status to error
        await updateAgentStatus(supabase, request.agent_id, 'error', request.payload?.error_message);
        await supabase
          .from('agents')
          .update({ current_task_id: null })
          .eq('id', request.agent_id);
        
        // Update queue
        await supabase
          .from('agent_task_queue')
          .update({ 
            status: 'failed', 
            completed_at: now,
            last_error: request.payload?.error_message,
          })
          .eq('task_id', request.task_id)
          .eq('tenant_id', request.tenant_id);
        break;
    }

    // Update task
    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', request.task_id);

    if (updateError) {
      logger.error('Task update failed', updateError, { taskId: request.task_id });
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: updateError.message,
          retryable: true,
        },
      };
    }

    // Log execution history
    await supabase.from('agent_execution_history').insert({
      tenant_id: request.tenant_id,
      agent_id: request.agent_id,
      task_id: request.task_id,
      execution_type: 'task',
      execution_id: request.task_id,
      input_payload: { action: request.action },
      output_payload: request.payload,
      status: request.action === 'fail' ? 'failure' : 'success',
      error_message: request.payload?.error_message,
      started_at: now,
      completed_at: nowISO(),
      cost_usd: request.payload?.cost_usd ?? 0,
      tokens_input: request.payload?.tokens_used ? Math.floor(request.payload.tokens_used / 2) : 0,
      tokens_output: request.payload?.tokens_used ? Math.ceil(request.payload.tokens_used / 2) : 0,
    });

    logger.info(`Task ${request.action} executed`, {
      taskId: request.task_id,
      agentId: request.agent_id,
      newStatus,
    });

    return {
      success: true,
      data: {
        success: true,
        task_id: request.task_id,
        status: newStatus,
        timestamp: nowISO(),
      },
    };

  } catch (error) {
    logger.error('Task execution failed', error, { taskId: request.task_id, action: request.action });
    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

/**
 * Execute decision action
 */
async function executeDecisionAction(
  request: DecisionExecutionRequest
): Promise<RuntimeResponse> {
  const supabase = createAdminClient();
  
  try {
    const now = nowISO();

    switch (request.action) {
      case 'confirm': {
        // Update decision status
        const { error } = await supabase
          .from('decisions')
          .update({
            status: request.payload?.approved ? 'approved' : 'rejected',
            decided_at: now,
            updated_at: now,
          })
          .eq('id', request.decision_id)
          .eq('tenant_id', request.tenant_id);

        if (error) {
          return {
            success: false,
            error: { code: 'UPDATE_FAILED', message: error.message, retryable: true },
          };
        }
        break;
      }

      case 'override': {
        const { error } = await supabase
          .from('decisions')
          .update({
            status: 'overridden',
            overridden_by: request.payload?.override_reason ? 'user' : null,
            override_reason: request.payload?.override_reason,
            overridden_at: now,
            updated_at: now,
          })
          .eq('id', request.decision_id)
          .eq('tenant_id', request.tenant_id);

        if (error) {
          return {
            success: false,
            error: { code: 'UPDATE_FAILED', message: error.message, retryable: true },
          };
        }
        break;
      }

      case 'execute': {
        const { error } = await supabase
          .from('decisions')
          .update({
            status: 'executed',
            executed_action: request.payload?.executed_action,
            outcome: request.payload?.outcome,
            executed_at: now,
            updated_at: now,
          })
          .eq('id', request.decision_id)
          .eq('tenant_id', request.tenant_id);

        if (error) {
          return {
            success: false,
            error: { code: 'UPDATE_FAILED', message: error.message, retryable: true },
          };
        }

        // Log decision execution
        await supabase.from('agent_decision_log').insert({
          tenant_id: request.tenant_id,
          agent_id: request.agent_id,
          decision_id: request.decision_id,
          category: 'action',
          action_type: 'execute',
          action_params: request.payload?.executed_action || {},
          outcome: request.payload?.outcome,
          success: true,
          created_at: now,
        });
        break;
      }

      default:
        return {
          success: false,
          error: { code: 'INVALID_ACTION', message: 'Unknown decision action', retryable: false },
        };
    }

    return {
      success: true,
      data: {
        decision_id: request.decision_id,
        action: request.action,
        timestamp: now,
      },
    };

  } catch (error) {
    logger.error('Decision execution failed', error);
    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

/**
 * Process LLM call for agent reasoning
 */
async function processAgentReasoning(
  tenantId: string,
  agentId: string,
  taskId: string,
  prompt: string
): Promise<RuntimeResponse<{ content: string; tokens_used: number }>> {
  try {
    const supabase = createAdminClient();
    
    // Get agent LLM config
    const { data: agent } = await supabase
      .from('agents')
      .select('llm_config, capabilities')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    if (!agent) {
      return { success: false, error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found', retryable: false } };
    }

    // Call Anthropic Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: agent.llm_config?.model || 'claude-3-5-sonnet-20241022',
        max_tokens: agent.llm_config?.max_tokens || 4096,
        temperature: agent.llm_config?.temperature || 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${error}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      data: {
        content: result.content[0]?.text || '',
        tokens_used: result.usage?.input_tokens + result.usage?.output_tokens || 0,
      },
    };

  } catch (error) {
    logger.error('LLM reasoning failed', error);
    return {
      success: false,
      error: {
        code: 'LLM_ERROR',
        message: error instanceof Error ? error.message : 'LLM call failed',
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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed', retryable: false } }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { type } = body;

    let result: RuntimeResponse;

    switch (type) {
      case 'task':
        result = await executeTaskAction(body);
        break;
      case 'decision':
        result = await executeDecisionAction(body);
        break;
      case 'reasoning':
        result = await processAgentReasoning(body.tenant_id, body.agent_id, body.task_id, body.prompt);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: { code: 'BAD_REQUEST', message: 'Unknown execution type', retryable: false } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : (result.error?.code === 'TASK_NOT_FOUND' || result.error?.code === 'NOT_ASSIGNED' ? 400 : 500),
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
