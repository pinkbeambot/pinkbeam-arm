/**
 * Task Executor Edge Function
 * Handles task execution lifecycle: claim, start, progress updates, completion
 * 
 * POST /claim   : Claim a pending task
 * POST /start   : Start working on a claimed task
 * POST /progress: Update task progress
 * POST /complete: Complete a task
 * POST /fail    : Mark task as failed
 * POST /create  : Create a new task
 * GET  /queue   : Get tasks in queue
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';
import {
  createAdminClient,
  generateUUID,
  nowISO,
  createLogger,
  logActivity,
  validateCapability,
  taskExecuteRequestSchema,
  taskCreateRequestSchema,
  uuidSchema,
  tenantIdSchema,
  taskStatusSchema,
  taskPrioritySchema,
  type TaskExecuteRequest,
  type TaskCreateRequest,
} from '../_shared/utils.ts';

const logger = createLogger('task-executor');

// ============================================================================
// JWT Authentication
// ============================================================================

interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
}

async function verifyJWT(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.error('JWT verification failed', error);
      return null;
    }

    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      logger.error('No tenant in user metadata', null);
      return null;
    }

    return {
      userId: user.id,
      tenantId,
      role: user.user_metadata?.role || 'member',
    };
  } catch (err) {
    logger.error('JWT verification error', err);
    return null;
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}

function errorResponse(code: string, message: string, status = 400, retryable = false): Response {
  return jsonResponse({
    success: false,
    error: { code, message, retryable },
  }, status);
}

// ============================================================================
// Queue Handler
// ============================================================================

async function handleGetQueue(
  auth: AuthContext,
  params: URLSearchParams
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    const status = params.get('status') || 'queued';
    const limit = parseInt(params.get('limit') || '20');
    const agentId = params.get('agent_id');

    let query = supabase
      .from('tasks')
      .select('*, assignee:assignee_id(id, name, role)')
      .eq('tenant_id', auth.tenantId);

    if (status === 'available') {
      // Tasks that can be claimed
      query = query.in('status', ['queued', 'blocked']).is('assignee_id', null);
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (agentId) {
      query = query.eq('assignee_id', agentId);
    }

    const { data: tasks, error } = await query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch queue', error);
      return errorResponse('FETCH_FAILED', error.message, 500, true);
    }

    // Get suggested agents for unassigned tasks
    const tasksWithSuggestions = await Promise.all(
      (tasks || []).map(async (task) => {
        if (task.assignee_id) return task;

        const { data: suggestions } = await supabase
          .rpc('suggest_agent_for_task', { p_task_id: task.id })
          .limit(3);

        return {
          ...task,
          suggested_agents: suggestions || [],
        };
      })
    );

    return jsonResponse({
      success: true,
      data: {
        tasks: tasksWithSuggestions,
        count: tasksWithSuggestions.length,
      },
    });
  } catch (err) {
    logger.error('Queue handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Claim Handler
// ============================================================================

async function handleClaim(
  auth: AuthContext,
  body: { task_id?: string; agent_id: string }
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    const { task_id, agent_id } = body;

    // Verify agent belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status, capabilities')
      .eq('id', agent_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (agentError || !agent) {
      return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404, false);
    }

    // Check agent can work on tasks
    if (agent.status === 'paused' || agent.status === 'terminated') {
      return errorResponse(
        'AGENT_UNAVAILABLE',
        `Agent is ${agent.status} and cannot claim tasks`,
        400,
        false
      );
    }

    let taskId = task_id;

    // If no task_id, try to claim next from queue
    if (!taskId) {
      const { data: claimed, error: claimError } = await supabase
        .rpc('claim_next_task', {
          p_agent_id: agent_id,
          p_tenant_id: auth.tenantId,
        });

      if (claimError || !claimed || claimed.length === 0) {
        return errorResponse(
          'NO_TASKS_AVAILABLE',
          'No pending tasks available in queue',
          404,
          true
        );
      }

      taskId = claimed[0].task_id;
    } else {
      // Verify task exists and is claimable
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, status, assignee_id')
        .eq('id', taskId)
        .eq('tenant_id', auth.tenantId)
        .single();

      if (taskError || !task) {
        return errorResponse('TASK_NOT_FOUND', 'Task not found', 404, false);
      }

      if (task.status !== 'queued' && task.status !== 'blocked') {
        return errorResponse(
          'TASK_NOT_CLAIMABLE',
          `Task is ${task.status} and cannot be claimed`,
          400,
          false
        );
      }

      if (task.assignee_id && task.assignee_id !== agent_id) {
        return errorResponse('TASK_ALREADY_CLAIMED', 'Task is assigned to another agent', 409, false);
      }

      // Claim the task
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          assignee_id: agent_id,
          updated_at: nowISO(),
        })
        .eq('id', taskId)
        .eq('tenant_id', auth.tenantId);

      if (updateError) {
        logger.error('Failed to claim task', updateError);
        return errorResponse('CLAIM_FAILED', updateError.message, 500, true);
      }
    }

    // Log activity
    await logActivity(
      supabase,
      auth.tenantId,
      'task.assigned',
      'task',
      'agent',
      agent_id,
      'Task claimed',
      `Agent ${agent.name} claimed task`,
      { task_id: taskId, agent_id },
      agent_id,
      taskId
    );

    logger.info('Task claimed', { taskId, agentId: agent_id });

    return jsonResponse({
      success: true,
      data: {
        task_id: taskId,
        agent_id,
        claimed_at: nowISO(),
      },
    });
  } catch (err) {
    logger.error('Claim handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Start Handler
// ============================================================================

async function handleStart(
  auth: AuthContext,
  body: { task_id: string; agent_id: string }
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    const { task_id, agent_id } = body;

    // Verify task and agent
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status, assignee_id, title')
      .eq('id', task_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (taskError || !task) {
      return errorResponse('TASK_NOT_FOUND', 'Task not found', 404, false);
    }

    if (task.assignee_id !== agent_id) {
      return errorResponse('NOT_ASSIGNED', 'Task is not assigned to this agent', 403, false);
    }

    if (task.status !== 'queued' && task.status !== 'blocked') {
      return errorResponse(
        'INVALID_STATUS',
        `Cannot start task with status ${task.status}`,
        400,
        false
      );
    }

    // Check for blocking dependencies
    const { data: deps } = await supabase
      .from('task_dependencies')
      .select('depends_on_task_id')
      .eq('task_id', task_id)
      .eq('dependency_type', 'blocks');

    if (deps && deps.length > 0) {
      const { data: incompleteDeps } = await supabase
        .from('tasks')
        .select('id')
        .in('id', deps.map(d => d.depends_on_task_id))
        .neq('status', 'completed')
        .eq('tenant_id', auth.tenantId);

      if (incompleteDeps && incompleteDeps.length > 0) {
        return errorResponse(
          'DEPENDENCIES_NOT_MET',
          `Waiting for ${incompleteDeps.length} dependencies to complete`,
          400,
          false
        );
      }
    }

    // Update task status
    const now = nowISO();
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        started_at: now,
        progress_percent: 0,
        updated_at: now,
      })
      .eq('id', task_id)
      .eq('tenant_id', auth.tenantId);

    if (updateError) {
      logger.error('Failed to start task', updateError);
      return errorResponse('START_FAILED', updateError.message, 500, true);
    }

    // Update agent status
    await supabase
      .from('agents')
      .update({
        status: 'active',
        current_task_id: task_id,
        updated_at: now,
      })
      .eq('id', agent_id)
      .eq('tenant_id', auth.tenantId);

    // Create execution history
    await supabase.from('agent_execution_history').insert({
      tenant_id: auth.tenantId,
      agent_id,
      task_id,
      execution_type: 'task',
      execution_id: task_id,
      input_payload: {},
      status: 'success',
      started_at: now,
    });

    // Log activity
    await logActivity(
      supabase,
      auth.tenantId,
      'task.started',
      'task',
      'agent',
      agent_id,
      `Task started: ${task.title}`,
      'Task moved to in_progress',
      { task_id, started_at: now },
      agent_id,
      task_id
    );

    logger.info('Task started', { taskId: task_id, agentId: agent_id });

    return jsonResponse({
      success: true,
      data: {
        task_id,
        status: 'in_progress',
        started_at: now,
      },
    });
  } catch (err) {
    logger.error('Start handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Progress Handler
// ============================================================================

async function handleProgress(
  auth: AuthContext,
  body: TaskExecuteRequest
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    const { task_id, agent_id, payload } = body;

    // Verify task assignment
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status, assignee_id')
      .eq('id', task_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (taskError || !task) {
      return errorResponse('TASK_NOT_FOUND', 'Task not found', 404, false);
    }

    if (task.assignee_id !== agent_id) {
      return errorResponse('NOT_ASSIGNED', 'Task is not assigned to this agent', 403, false);
    }

    if (task.status !== 'in_progress') {
      return errorResponse(
        'INVALID_STATUS',
        `Cannot update progress for task with status ${task.status}`,
        400,
        false
      );
    }

    // Update progress
    const updateData: Record<string, unknown> = {
      updated_at: nowISO(),
    };

    if (payload.progress_percent !== undefined) {
      updateData.progress_percent = payload.progress_percent;
    }

    if (payload.current_step !== undefined) {
      updateData.current_step = payload.current_step;
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', task_id)
      .eq('tenant_id', auth.tenantId);

    if (updateError) {
      logger.error('Failed to update progress', updateError);
      return errorResponse('UPDATE_FAILED', updateError.message, 500, true);
    }

    logger.info('Task progress updated', {
      taskId: task_id,
      progress: payload.progress_percent,
    });

    return jsonResponse({
      success: true,
      data: {
        task_id,
        progress_percent: payload.progress_percent,
        current_step: payload.current_step,
        updated_at: nowISO(),
      },
    });
  } catch (err) {
    logger.error('Progress handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Complete Handler
// ============================================================================

async function handleComplete(
  auth: AuthContext,
  body: TaskExecuteRequest
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    const { task_id, agent_id, payload } = body;

    // Verify task assignment
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status, assignee_id, title, started_at')
      .eq('id', task_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (taskError || !task) {
      return errorResponse('TASK_NOT_FOUND', 'Task not found', 404, false);
    }

    if (task.assignee_id !== agent_id) {
      return errorResponse('NOT_ASSIGNED', 'Task is not assigned to this agent', 403, false);
    }

    if (task.status !== 'in_progress' && task.status !== 'review') {
      return errorResponse(
        'INVALID_STATUS',
        `Cannot complete task with status ${task.status}`,
        400,
        false
      );
    }

    const now = nowISO();

    // Calculate duration
    const startedAt = task.started_at ? new Date(task.started_at) : null;
    const durationSeconds = startedAt
      ? Math.round((new Date(now).getTime() - startedAt.getTime()) / 1000)
      : 0;

    // Update task
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        progress_percent: 100,
        completed_at: now,
        outputs: payload.outputs || {},
        tokens_used: payload.tokens_used || 0,
        cost_usd: payload.cost_usd || 0,
        updated_at: now,
      })
      .eq('id', task_id)
      .eq('tenant_id', auth.tenantId);

    if (updateError) {
      logger.error('Failed to complete task', updateError);
      return errorResponse('COMPLETE_FAILED', updateError.message, 500, true);
    }

    // Update agent stats
    await supabase.rpc('update_agent_task_stats', {
      p_agent_id: agent_id,
      p_task_duration_seconds: durationSeconds,
      p_tokens_used: payload.tokens_used || 0,
      p_cost_usd: payload.cost_usd || 0,
    });

    // Update agent status back to idle
    await supabase
      .from('agents')
      .update({
        status: 'idle',
        current_task_id: null,
        updated_at: now,
      })
      .eq('id', agent_id)
      .eq('tenant_id', auth.tenantId);

    // Update execution history
    await supabase
      .from('agent_execution_history')
      .update({
        output_payload: payload.outputs || {},
        status: 'success',
        completed_at: now,
        duration_ms: durationSeconds * 1000,
        tokens_output: payload.tokens_used || 0,
        cost_usd: payload.cost_usd || 0,
      })
      .eq('task_id', task_id)
      .eq('agent_id', agent_id)
      .eq('execution_type', 'task');

    // Log activity
    await logActivity(
      supabase,
      auth.tenantId,
      'task.completed',
      'task',
      'agent',
      agent_id,
      `Task completed: ${task.title}`,
      `Completed in ${durationSeconds}s`,
      {
        task_id,
        completed_at: now,
        duration_seconds: durationSeconds,
        cost_usd: payload.cost_usd,
      },
      agent_id,
      task_id
    );

    logger.info('Task completed', { taskId: task_id, durationSeconds });

    return jsonResponse({
      success: true,
      data: {
        task_id,
        status: 'completed',
        completed_at: now,
        duration_seconds: durationSeconds,
      },
    });
  } catch (err) {
    logger.error('Complete handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Fail Handler
// ============================================================================

async function handleFail(
  auth: AuthContext,
  body: TaskExecuteRequest
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    const { task_id, agent_id, payload } = body;

    // Verify task assignment
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status, assignee_id, title')
      .eq('id', task_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (taskError || !task) {
      return errorResponse('TASK_NOT_FOUND', 'Task not found', 404, false);
    }

    if (task.assignee_id !== agent_id) {
      return errorResponse('NOT_ASSIGNED', 'Task is not assigned to this agent', 403, false);
    }

    const now = nowISO();

    // Update task
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'failed',
        completed_at: now,
        outputs: { error: payload.error_message },
        updated_at: now,
      })
      .eq('id', task_id)
      .eq('tenant_id', auth.tenantId);

    if (updateError) {
      logger.error('Failed to mark task as failed', updateError);
      return errorResponse('UPDATE_FAILED', updateError.message, 500, true);
    }

    // Update agent stats
    await supabase.rpc('increment_agent_failed_task', {
      p_agent_id: agent_id,
    });

    // Update agent status
    await supabase
      .from('agents')
      .update({
        status: 'idle',
        current_task_id: null,
        updated_at: now,
      })
      .eq('id', agent_id)
      .eq('tenant_id', auth.tenantId);

    // Update execution history
    await supabase
      .from('agent_execution_history')
      .update({
        status: 'failure',
        error_message: payload.error_message,
        completed_at: now,
      })
      .eq('task_id', task_id)
      .eq('agent_id', agent_id)
      .eq('execution_type', 'task');

    // Log activity
    await logActivity(
      supabase,
      auth.tenantId,
      'task.failed',
      'task',
      'agent',
      agent_id,
      `Task failed: ${task.title}`,
      payload.error_message || 'Task failed',
      {
        task_id,
        failed_at: now,
        error: payload.error_message,
      },
      agent_id,
      task_id
    );

    logger.info('Task marked as failed', { taskId: task_id, error: payload.error_message });

    return jsonResponse({
      success: true,
      data: {
        task_id,
        status: 'failed',
        failed_at: now,
      },
    });
  } catch (err) {
    logger.error('Fail handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Create Handler
// ============================================================================

async function handleCreate(
  auth: AuthContext,
  body: TaskCreateRequest
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    // Validate tenant
    if (body.tenant_id !== auth.tenantId) {
      return errorResponse('TENANT_MISMATCH', 'Task tenant does not match auth tenant', 403, false);
    }

    // Verify assignee if provided
    if (body.assignee_id) {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('id')
        .eq('id', body.assignee_id)
        .eq('tenant_id', auth.tenantId)
        .single();

      if (error || !agent) {
        return errorResponse('ASSIGNEE_NOT_FOUND', 'Assignee agent not found', 404, false);
      }
    }

    const taskId = generateUUID();
    const now = nowISO();

    // Insert task
    const { error: insertError } = await supabase.from('tasks').insert({
      id: taskId,
      tenant_id: auth.tenantId,
      title: body.title,
      description: body.description,
      type: body.type,
      priority: body.priority,
      assignee_id: body.assignee_id,
      assigner_id: body.assigner_id || auth.userId,
      parent_task_id: body.parent_task_id,
      status: 'queued',
      deadline_at: body.deadline_at,
      inputs: body.inputs,
      expected_outputs: body.expected_outputs,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      logger.error('Failed to create task', insertError);
      return errorResponse('CREATE_FAILED', insertError.message, 500, true);
    }

    // Add dependencies if provided
    if (body.dependencies.length > 0) {
      const depsToInsert = body.dependencies.map(dep => ({
        tenant_id: auth.tenantId,
        task_id: taskId,
        depends_on_task_id: dep.task_id,
        dependency_type: dep.dependency_type,
      }));

      const { error: depError } = await supabase
        .from('task_dependencies')
        .insert(depsToInsert);

      if (depError) {
        logger.error('Failed to add dependencies', depError);
        // Don't fail the request, just log the error
      }
    }

    // Add to task queue
    await supabase.from('agent_task_queue').insert({
      tenant_id: auth.tenantId,
      task_id: taskId,
      status: 'pending',
      priority: body.priority === 'urgent' ? 3 : body.priority === 'high' ? 2 : body.priority === 'normal' ? 1 : 0,
    });

    // Log activity
    await logActivity(
      supabase,
      auth.tenantId,
      'task.created',
      'task',
      'user',
      auth.userId,
      `Task created: ${body.title}`,
      body.description,
      {
        task_id: taskId,
        priority: body.priority,
        assignee_id: body.assignee_id,
        dependencies_count: body.dependencies.length,
      },
      body.assignee_id || undefined,
      taskId
    );

    logger.info('Task created', { taskId, title: body.title });

    return jsonResponse({
      success: true,
      data: {
        task_id: taskId,
        status: 'queued',
        created_at: now,
      },
    }, 201);
  } catch (err) {
    logger.error('Create handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/task-executor\/?/, '') || 'health';

  logger.debug('Request received', { method: req.method, path });

  // Health check
  if (path === 'health' && req.method === 'GET') {
    return jsonResponse({
      success: true,
      data: {
        status: 'healthy',
        version: '1.0.0',
        timestamp: nowISO(),
      },
    });
  }

  // Verify authentication
  const auth = await verifyJWT(req);
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing authentication', 401, false);
  }

  // Handle GET queue
  if (path === 'queue' && req.method === 'GET') {
    const params = url.searchParams;
    return await handleGetQueue(auth, params);
  }

  // Handle POST actions
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      switch (path) {
        case 'claim':
          return await handleClaim(auth, body);

        case 'start':
          return await handleStart(auth, body);

        case 'progress': {
          const validated = taskExecuteRequestSchema.parse(body);
          return await handleProgress(auth, validated);
        }

        case 'complete': {
          const validated = taskExecuteRequestSchema.parse(body);
          return await handleComplete(auth, validated);
        }

        case 'fail': {
          const validated = taskExecuteRequestSchema.parse(body);
          return await handleFail(auth, validated);
        }

        case 'create': {
          const validated = taskCreateRequestSchema.parse(body);
          return await handleCreate(auth, validated);
        }

        default:
          return errorResponse('NOT_FOUND', `Unknown endpoint: ${path}`, 404, false);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return errorResponse(
          'VALIDATION_ERROR',
          err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          400,
          false
        );
      }

      logger.error('Request handling error', err);
      return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
    }
  }

  return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405, false);
}

// Deno serve
Deno.serve(handler);
