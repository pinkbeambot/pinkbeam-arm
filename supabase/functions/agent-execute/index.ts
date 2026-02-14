/**
 * Agent Execute Edge Function
 * Execute agent tasks with LLM routing and lifecycle management
 * 
 * POST /execute     : Execute a task with LLM
 * POST /claim       : Claim a queued task
 * POST /progress    : Update task progress
 * POST /complete    : Complete a task
 * POST /fail        : Fail a task
 * GET  /health      : Health check
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';
import {
  createAdminClient,
  generateUUID,
  nowISO,
  createLogger,
  logActivity,
  updateAgentStatus,
  validateCapability,
  uuidSchema,
} from '../_shared/utils.ts';

const logger = createLogger('agent-execute');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

// Schemas
const llmExecuteSchema = z.object({
  task_id: uuidSchema,
  tenant_id: uuidSchema,
  agent_id: uuidSchema,
  prompt: z.string(),
  context: z.record(z.unknown()).default({}),
  model: z.enum(['claude-3-5-sonnet', 'claude-3-opus', 'gpt-4', 'gpt-4-turbo']).default('claude-3-5-sonnet'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().int().positive().default(4096),
});

const taskClaimSchema = z.object({
  task_id: uuidSchema,
  tenant_id: uuidSchema,
  agent_id: uuidSchema,
});

const taskProgressSchema = z.object({
  task_id: uuidSchema,
  tenant_id: uuidSchema,
  agent_id: uuidSchema,
  progress_percent: z.number().int().min(0).max(100),
  current_step: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const taskCompleteSchema = z.object({
  task_id: uuidSchema,
  tenant_id: uuidSchema,
  agent_id: uuidSchema,
  outputs: z.record(z.unknown()),
  tokens_used: z.number().int().default(0),
  cost_usd: z.number().default(0),
  execution_time_seconds: z.number().int().optional(),
});

const taskFailSchema = z.object({
  task_id: uuidSchema,
  tenant_id: uuidSchema,
  agent_id: uuidSchema,
  error_message: z.string(),
  error_code: z.string().optional(),
  retryable: z.boolean().default(false),
  tokens_used: z.number().int().default(0),
  cost_usd: z.number().default(0),
});

interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
}

async function verifyJWT(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) return null;
    return { userId: user.id, tenantId, role: user.user_metadata?.role || 'member' };
  } catch { return null; }
}

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
  return jsonResponse({ success: false, error: { code, message, retryable } }, status);
}

// LLM Router
interface LLMResponse {
  success: boolean;
  content?: string;
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
  cost_usd?: number;
  error?: string;
}

async function callAnthropic(prompt: string, model: string, temperature: number, maxTokens: number): Promise<LLMResponse> {
  try {
    const modelMap: Record<string, string> = {
      'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
      'claude-3-opus': 'claude-3-opus-20240229',
    };
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelMap[model] || model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Anthropic API error: ${error}` };
    }
    const data = await response.json();
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const costUsd = (inputTokens * 0.000003) + (outputTokens * 0.000015);
    return {
      success: true,
      content: data.content?.[0]?.text || '',
      usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: inputTokens + outputTokens },
      cost_usd: costUsd,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function callOpenAI(prompt: string, model: string, temperature: number, maxTokens: number): Promise<LLMResponse> {
  try {
    const modelMap: Record<string, string> = { 'gpt-4': 'gpt-4-turbo-preview', 'gpt-4-turbo': 'gpt-4-turbo-preview' };
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer \${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelMap[model] || model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `OpenAI API error: ${error}` };
    }
    const data = await response.json();
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const costUsd = (inputTokens * 0.00001) + (outputTokens * 0.00003);
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: inputTokens + outputTokens },
      cost_usd: costUsd,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function routeToLLM(request: any): Promise<LLMResponse> {
  const { model, prompt, temperature, max_tokens } = request;
  if (model.startsWith('claude')) return callAnthropic(prompt, model, temperature, max_tokens);
  if (model.startsWith('gpt')) return callOpenAI(prompt, model, temperature, max_tokens);
  return callAnthropic(prompt, 'claude-3-5-sonnet', temperature, max_tokens);
}

async function trackCost(supabase: any, tenantId: string, agentId: string, taskId: string, tokensUsed: number, costUsd: number): Promise<void> {
  await supabase.from('tasks').update({ tokens_used: tokensUsed, cost_usd: costUsd }).eq('id', taskId);
  await supabase.rpc('increment_agent_cost', { p_agent_id: agentId, p_cost_usd: costUsd, p_tokens: tokensUsed });
}

// Handlers
async function handleExecute(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  try {
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status, llm_config, limits, stats')
      .eq('id', body.agent_id)
      .eq('tenant_id', auth.tenantId)
      .single();
    if (agentError || !agent) return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404, false);

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, status, tokens_used, cost_usd')
      .eq('id', body.task_id)
      .eq('tenant_id', auth.tenantId)
      .single();
    if (taskError || !task) return errorResponse('TASK_NOT_FOUND', 'Task not found', 404, false);

    const canExecute = await validateCapability(supabase, body.agent_id, 'decide');
    if (!canExecute) return errorResponse('PERMISSION_DENIED', 'Agent lacks execute capability', 403, false);

    const limits = agent.limits as Record<string, number>;
    const stats = agent.stats as Record<string, number>;
    const currentCost = (stats?.total_cost_usd || 0) + (task.cost_usd || 0);
    const maxCost = limits?.max_cost_per_task_usd || 5.00;
    if (currentCost >= maxCost) return errorResponse('COST_LIMIT_EXCEEDED', `Task cost limit exceeded ($\{maxCost})`, 403, false);

    await updateAgentStatus(supabase, body.agent_id, 'active', 'Executing task');
    await supabase.from('tasks').update({ status: 'in_progress', started_at: nowISO() }).eq('id', body.task_id);

    await logActivity(supabase, auth.tenantId, 'task.started', 'task', 'agent', body.agent_id,
      `Task execution started: ${task.title}`, `Agent ${agent.name} began executing task`,
      { task_id: body.task_id, agent_id: body.agent_id, model: body.model }, body.agent_id, body.task_id);

    const startTime = Date.now();
    const llmResponse = await routeToLLM(body);
    const executionTime = Math.round((Date.now() - startTime) / 1000);

    if (!llmResponse.success) {
      await updateAgentStatus(supabase, body.agent_id, 'error', llmResponse.error);
      await supabase.from('tasks').update({ status: 'failed', outputs: { error: llmResponse.error } }).eq('id', body.task_id);
      await logActivity(supabase, auth.tenantId, 'task.failed', 'task', 'agent', body.agent_id,
        `Task execution failed: ${task.title}`, llmResponse.error || 'Unknown error',
        { task_id: body.task_id, agent_id: body.agent_id, error: llmResponse.error }, body.agent_id, body.task_id);
      return errorResponse('LLM_ERROR', llmResponse.error || 'LLM call failed', 500, true);
    }

    if (llmResponse.usage && llmResponse.cost_usd) {
      await trackCost(supabase, auth.tenantId, body.agent_id, body.task_id, llmResponse.usage.total_tokens, llmResponse.cost_usd);
    }

    await updateAgentStatus(supabase, body.agent_id, 'idle', 'Task execution complete');
    logger.info('Task executed successfully', { taskId: body.task_id, agentId: body.agent_id, tokens: llmResponse.usage?.total_tokens, cost: llmResponse.cost_usd, executionTime });

    return jsonResponse({
      success: true,
      data: {
        task_id: body.task_id,
        agent_id: body.agent_id,
        result: llmResponse.content,
        usage: llmResponse.usage,
        cost_usd: llmResponse.cost_usd,
        execution_time_seconds: executionTime,
      },
    });
  } catch (err) {
    logger.error('Execute handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

async function handleClaim(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  try {
    const { data: agent, error: agentError } = await supabase.from('agents').select('id, name, status').eq('id', body.agent_id).eq('tenant_id', auth.tenantId).single();
    if (agentError || !agent) return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404, false);
    if (agent.status !== 'idle' && agent.status !== 'initializing') return errorResponse('AGENT_UNAVAILABLE', `Agent is ${agent.status}, cannot claim tasks`, 409, true);

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .update({ assignee_id: body.agent_id, status: 'in_progress', started_at: nowISO(), updated_at: nowISO() })
      .eq('id', body.task_id).eq('tenant_id', auth.tenantId).eq('status', 'queued')
      .select('id, title').single();
    if (taskError || !task) return errorResponse('TASK_ALREADY_CLAIMED', 'Task is no longer available for claiming', 409, false);

    await updateAgentStatus(supabase, body.agent_id, 'active', `Claimed task: ${task.title}`);
    await logActivity(supabase, auth.tenantId, 'task.assigned', 'task', 'agent', body.agent_id,
      `Task claimed: ${task.title}`, `Agent ${agent.name} claimed task`, { task_id: body.task_id, agent_id: body.agent_id }, body.agent_id, body.task_id);
    logger.info('Task claimed', { taskId: body.task_id, agentId: body.agent_id });
    return jsonResponse({ success: true, data: { task_id: body.task_id, agent_id: body.agent_id, status: 'in_progress' } });
  } catch (err) {
    logger.error('Claim handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

async function handleProgress(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  try {
    const { data: task, error: taskError } = await supabase.from('tasks').select('id, title, assignee_id, status').eq('id', body.task_id).eq('tenant_id', auth.tenantId).single();
    if (taskError || !task) return errorResponse('TASK_NOT_FOUND', 'Task not found', 404, false);
    if (task.assignee_id !== body.agent_id) return errorResponse('PERMISSION_DENIED', 'Task not assigned to this agent', 403, false);

    await supabase.from('tasks').update({ progress_percent: body.progress_percent, current_step: body.current_step, updated_at: nowISO() }).eq('id', body.task_id);
    const logProgress = [0, 25, 50, 75, 100].includes(body.progress_percent);
    if (logProgress) {
      await logActivity(supabase, auth.tenantId, 'task.progress', 'task', 'agent', body.agent_id,
        `Task ${body.progress_percent}% complete: ${task.title}`, body.current_step || 'Progress update',
        { task_id: body.task_id, agent_id: body.agent_id, progress_percent: body.progress_percent, ...body.metadata }, body.agent_id, body.task_id);
    }
    return jsonResponse({ success: true, data: { task_id: body.task_id, progress_percent: body.progress_percent, current_step: body.current_step } });
  } catch (err) {
    logger.error('Progress handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

async function handleComplete(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  try {
    const { data: task, error: taskError } = await supabase.from('tasks').select('id, title, assignee_id, status, parent_task_id').eq('id', body.task_id).eq('tenant_id', auth.tenantId).single();
    if (taskError || !task) return errorResponse('TASK_NOT_FOUND', 'Task not found', 404, false);
    if (task.assignee_id !== body.agent_id) return errorResponse('PERMISSION_DENIED', 'Task not assigned to this agent', 403, false);

    await supabase.from('tasks').update({
      status: 'completed', outputs: body.outputs, progress_percent: 100, tokens_used: body.tokens_used,
      cost_usd: body.cost_usd, completed_at: nowISO(), updated_at: nowISO()
    }).eq('id', body.task_id);

    await supabase.rpc('increment_agent_task_completed', { p_agent_id: body.agent_id, p_execution_time: body.execution_time_seconds || 0 });
    await updateAgentStatus(supabase, body.agent_id, 'idle', 'Task completed');

    if (task.parent_task_id) await checkAndUnblockParent(supabase, auth.tenantId, task.parent_task_id);

    await logActivity(supabase, auth.tenantId, 'task.completed', 'task', 'agent', body.agent_id,
      `Task completed: ${task.title}`, `Task finished with ${body.tokens_used || 0} tokens used`,
      { task_id: body.task_id, agent_id: body.agent_id, tokens_used: body.tokens_used, cost_usd: body.cost_usd, execution_time_seconds: body.execution_time_seconds }, body.agent_id, body.task_id);
    logger.info('Task completed', { taskId: body.task_id, agentId: body.agent_id, tokens: body.tokens_used, cost: body.cost_usd });
    return jsonResponse({ success: true, data: { task_id: body.task_id, status: 'completed', completed_at: nowISO() } });
  } catch (err) {
    logger.error('Complete handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

async function handleFail(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  try {
    const { data: task, error: taskError } = await supabase.from('tasks').select('id, title, assignee_id, status').eq('id', body.task_id).eq('tenant_id', auth.tenantId).single();
    if (taskError || !task) return errorResponse('TASK_NOT_FOUND', 'Task not found', 404, false);
    if (task.assignee_id !== body.agent_id) return errorResponse('PERMISSION_DENIED', 'Task not assigned to this agent', 403, false);

    await supabase.from('tasks').update({
      status: 'failed', outputs: { error: body.error_message, error_code: body.error_code },
      tokens_used: body.tokens_used, cost_usd: body.cost_usd, updated_at: nowISO()
    }).eq('id', body.task_id);

    await supabase.rpc('increment_agent_task_failed', { p_agent_id: body.agent_id });
    await updateAgentStatus(supabase, body.agent_id, 'error', `Task failed: ${body.error_message}`);

    await logActivity(supabase, auth.tenantId, 'task.failed', 'task', 'agent', body.agent_id,
      `Task failed: ${task.title}`, body.error_message,
      { task_id: body.task_id, agent_id: body.agent_id, error_code: body.error_code, retryable: body.retryable, tokens_used: body.tokens_used }, body.agent_id, body.task_id);
    logger.info('Task failed', { taskId: body.task_id, agentId: body.agent_id, error: body.error_message, retryable: body.retryable });
    return jsonResponse({ success: true, data: { task_id: body.task_id, status: 'failed', retryable: body.retryable } });
  } catch (err) {
    logger.error('Fail handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

async function checkAndUnblockParent(supabase: any, tenantId: string, parentTaskId: string): Promise<void> {
  const { data: childTasks } = await supabase.from('tasks').select('id, status').eq('parent_task_id', parentTaskId).eq('tenant_id', tenantId);
  const allCompleted = childTasks?.every((t: any) => t.status === 'completed') ?? false;
  if (allCompleted) {
    await supabase.from('tasks').update({ status: 'in_progress', current_step: 'All subtasks completed', updated_at: nowISO() }).eq('id', parentTaskId);
    await logActivity(supabase, tenantId, 'task.progress', 'task', 'system', parentTaskId,
      'Parent task unblocked', 'All child tasks completed, parent task can proceed', { parent_task_id: parentTaskId }, undefined, parentTaskId);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' } });
  }
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/agent-execute\/?/, '') || 'health';
  logger.debug('Request received', { method: req.method, path });

  if (path === 'health' && req.method === 'GET') {
    return jsonResponse({ success: true, data: { status: 'healthy', version: '1.0.0', timestamp: nowISO() } });
  }

  const auth = await verifyJWT(req);
  if (!auth) return errorResponse('UNAUTHORIZED', 'Invalid or missing authentication', 401, false);

  try {
    const body = req.method === 'POST' ? await req.json() : {};
    switch (path) {
      case 'execute': {
        if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
        const validated = llmExecuteSchema.parse(body);
        return await handleExecute(auth, validated);
      }
      case 'claim': {
        if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
        const validated = taskClaimSchema.parse(body);
        return await handleClaim(auth, validated);
      }
      case 'progress': {
        if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
        const validated = taskProgressSchema.parse(body);
        return await handleProgress(auth, validated);
      }
      case 'complete': {
        if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
        const validated = taskCompleteSchema.parse(body);
        return await handleComplete(auth, validated);
      }
      case 'fail': {
        if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
        const validated = taskFailSchema.parse(body);
        return await handleFail(auth, validated);
      }
      default:
        return errorResponse('NOT_FOUND', `Unknown endpoint: ${path}`, 404, false);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), 400, false);
    }
    logger.error('Request handling error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

Deno.serve(handler);
