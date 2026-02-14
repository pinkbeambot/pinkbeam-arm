/**
 * Agent Execute Edge Function
 * 
 * Handles real agent task execution with:
 * - Task picking from queue
 * - LLM integration for agent reasoning
 * - Task state transitions
 * - Escalation creation
 * - Cost tracking
 * 
 * Issue: #109
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
  ANTHROPIC_API_KEY,
  RuntimeResponse,
} from '../_shared/utils.ts';
import {
  executeRequestSchema,
  pickTaskRequestSchema,
  ExecuteRequest,
  PickTaskRequest,
} from './schemas.ts';
import { TaskExecutor } from './executor.ts';
import { CostTracker } from './cost-tracker.ts';
import { EscalationManager } from './escalation.ts';

const logger = createLogger('agent-execute');

// Anthropic API pricing (per 1M tokens) - Update as needed
const PRICING = {
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
};

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
    
    return { 
      userId: user.id, 
      tenantId, 
      role: user.user_metadata?.role || 'member' 
    };
  } catch { 
    return null; 
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function errorResponse(
  code: string, 
  message: string, 
  status = 400, 
  retryable = false
): Response {
  return jsonResponse(
    { success: false, error: { code, message, retryable } },
    status
  );
}

/**
 * Pick next task from queue for an agent
 */
async function handlePickTask(
  auth: AuthContext, 
  body: PickTaskRequest
): Promise<Response> {
  const supabase = createAdminClient();
  const { agent_id, tenant_id } = body;
  
  // Verify tenant match
  if (tenant_id !== auth.tenantId) {
    return errorResponse('UNAUTHORIZED', 'Tenant mismatch', 403, false);
  }
  
  try {
    // Get agent info
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, status, role, capabilities, limits, llm_config, current_task_id')
      .eq('id', agent_id)
      .eq('tenant_id', tenant_id)
      .single();
    
    if (agentError || !agent) {
      return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404, false);
    }
    
    // Check if agent is available
    if (agent.status !== 'idle' && agent.status !== 'initializing') {
      return errorResponse(
        'AGENT_BUSY',
        `Agent is ${agent.status}, cannot pick new task`,
        409,
        false
      );
    }
    
    // Find next queued task assigned to this agent or unassigned
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('tenant_id', tenant_id)
      .in('status', ['queued'])
      .or(`assignee_id.eq.${agent_id},assignee_id.is.null`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    
    if (taskError || !task) {
      return jsonResponse({
        success: true,
        data: {
          agent_id,
          task: null,
          message: 'No queued tasks available',
        },
      });
    }
    
    // Claim the task
    const now = nowISO();
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        assignee_id: agent_id,
        status: 'queued',
        updated_at: now,
      })
      .eq('id', task.id);
    
    if (updateError) {
      return errorResponse('CLAIM_FAILED', updateError.message, 500, true);
    }
    
    // Log activity
    await logActivity(
      supabase,
      tenant_id,
      'task.assigned',
      'task',
      'agent',
      agent_id,
      `Task "${task.title}" claimed by agent`,
      task.description,
      { task_id: task.id, agent_id },
      agent_id,
      task.id
    );
    
    return jsonResponse({
      success: true,
      data: {
        agent_id,
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.type,
          priority: task.priority,
          inputs: task.inputs,
          expected_outputs: task.expected_outputs,
        },
      },
    });
    
  } catch (error) {
    logger.error('Pick task failed', error, { agent_id, tenant_id });
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      500,
      true
    );
  }
}

/**
 * Execute a task with LLM reasoning
 */
async function handleExecute(
  auth: AuthContext,
  body: ExecuteRequest
): Promise<Response> {
  const supabase = createAdminClient();
  const costTracker = new CostTracker(supabase);
  const escalationManager = new EscalationManager(supabase);
  const executor = new TaskExecutor(supabase, costTracker, escalationManager);
  
  const { agent_id, task_id, tenant_id, action, context } = body;
  
  // Verify tenant match
  if (tenant_id !== auth.tenantId) {
    return errorResponse('UNAUTHORIZED', 'Tenant mismatch', 403, false);
  }
  
  try {
    let result: RuntimeResponse;
    
    switch (action) {
      case 'start':
        result = await executor.startTask(agent_id, task_id, tenant_id);
        break;
        
      case 'execute':
        result = await executor.executeTask(agent_id, task_id, tenant_id, context);
        break;
        
      case 'progress':
        result = await executor.updateProgress(
          agent_id,
          task_id,
          tenant_id,
          context?.progress_percent,
          context?.current_step
        );
        break;
        
      case 'complete':
        result = await executor.completeTask(
          agent_id,
          task_id,
          tenant_id,
          context?.outputs,
          context?.cost_usd,
          context?.tokens_used
        );
        break;
        
      case 'fail':
        result = await executor.failTask(
          agent_id,
          task_id,
          tenant_id,
          context?.error_message || 'Task execution failed',
          context?.escalate
        );
        break;
        
      default:
        return errorResponse('INVALID_ACTION', `Unknown action: ${action}`, 400, false);
    }
    
    if (!result.success) {
      return errorResponse(
        result.error?.code || 'EXECUTION_FAILED',
        result.error?.message || 'Execution failed',
        result.error?.code === 'TASK_NOT_FOUND' ? 404 : 500,
        result.error?.retryable ?? false
      );
    }
    
    return jsonResponse({ success: true, data: result.data });
    
  } catch (error) {
    logger.error('Execute failed', error, { agent_id, task_id, action });
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      500,
      true
    );
  }
}

/**
 * Execute task with full LLM integration (autonomous execution)
 */
async function handleAutonomousExecute(
  auth: AuthContext,
  body: { agent_id: string; task_id: string; tenant_id: string }
): Promise<Response> {
  const supabase = createAdminClient();
  const costTracker = new CostTracker(supabase);
  const escalationManager = new EscalationManager(supabase);
  const executor = new TaskExecutor(supabase, costTracker, escalationManager);
  
  const { agent_id, task_id, tenant_id } = body;
  
  if (tenant_id !== auth.tenantId) {
    return errorResponse('UNAUTHORIZED', 'Tenant mismatch', 403, false);
  }
  
  try {
    // Run the full autonomous execution loop
    const result = await executor.executeAutonomous(agent_id, task_id, tenant_id);
    
    if (!result.success) {
      return errorResponse(
        result.error?.code || 'AUTONOMOUS_EXECUTION_FAILED',
        result.error?.message || 'Autonomous execution failed',
        500,
        result.error?.retryable ?? false
      );
    }
    
    return jsonResponse({ success: true, data: result.data });
    
  } catch (error) {
    logger.error('Autonomous execute failed', error, { agent_id, task_id });
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      500,
      true
    );
  }
}

/**
 * Calculate LLM cost based on model and token usage
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['claude-3-5-sonnet-20241022'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return parseFloat((inputCost + outputCost).toFixed(8));
}

/**
 * Main request handler
 */
export default async function handler(req: Request): Promise<Response> {
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

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/agent-execute\/?/, '') || 'health';

  // Health check
  if (path === 'health' && req.method === 'GET') {
    return jsonResponse({
      success: true,
      data: {
        status: 'healthy',
        version: '1.0.0',
        features: ['task-pick', 'task-execute', 'llm-integration', 'cost-tracking', 'escalation'],
      },
    });
  }

  // Require authentication for all other endpoints
  const auth = await verifyJWT(req);
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing authentication', 401, false);
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('METHOD_NOT_ALLOWED', 'Only POST requests allowed', 405, false);
    }

    const body = await req.json();

    switch (path) {
      case 'pick':
        return await handlePickTask(auth, pickTaskRequestSchema.parse(body));
      
      case 'execute':
        return await handleExecute(auth, executeRequestSchema.parse(body));
      
      case 'autonomous':
        return await handleAutonomousExecute(auth, body);
      
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
    
    logger.error('Handler error', err);
    return errorResponse(
      'INTERNAL_ERROR',
      err instanceof Error ? err.message : 'Unknown error',
      500,
      true
    );
  }
}

Deno.serve(handler);
