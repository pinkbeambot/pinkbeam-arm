/**
 * Agent Runtime Edge Function
 * Main entry point for agent runtime operations
 * 
 * Endpoints:
 * - POST /spawn        : Spawn a new agent
 * - POST /lifecycle    : Manage agent lifecycle
 * - POST /message      : Send messages between agents
 * - POST /decide       : Log a decision
 * - POST /escalate     : Create an escalation
 * - GET  /health       : Health check
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
  sendMessage,
  getDefaultAgentConfig,
  validateCapability,
  spawnRequestSchema,
  lifecycleRequestSchema,
  sendMessageRequestSchema,
  decisionProposalSchema,
  escalationRequestSchema,
  tenantIdSchema,
  uuidSchema,
  type SpawnRequest,
  type LifecycleRequest,
  type SendMessageRequest,
  type DecisionProposal,
  type EscalationRequest,
} from '../_shared/utils.ts';

const logger = createLogger('agent-runtime');

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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Verify JWT with Supabase
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

    // Extract tenant from user metadata
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
    error: {
      code,
      message,
      retryable,
    },
  }, status);
}

// ============================================================================
// Spawn Handler
// ============================================================================

async function handleSpawn(
  auth: AuthContext,
  body: SpawnRequest
): Promise<Response> {
  const supabase = createAdminClient();
  
  try {
    // Validate tenant
    if (body.parent_task_id) {
      const { data: task } = await supabase
        .from('tasks')
        .select('tenant_id')
        .eq('id', body.parent_task_id)
        .single();
      
      if (task && task.tenant_id !== auth.tenantId) {
        return errorResponse('TENANT_MISMATCH', 'Task belongs to different tenant', 403, false);
      }
    }

    // Generate agent configuration
    const defaultConfig = getDefaultAgentConfig(body.role);
    const capabilities = body.config.capabilities || (defaultConfig.capabilities as string[]);
    const limits = {
      max_sub_agents: body.config.max_sub_agents || (defaultConfig.max_sub_agents as number) || 5,
      escalation_threshold: body.config.escalation_threshold || (defaultConfig.escalation_threshold as number) || 0.7,
      timeout_seconds: body.config.timeout_seconds || 300,
      max_tokens_per_task: body.config.budget?.max_tokens || 100000,
      max_cost_per_task_usd: body.config.budget?.max_cost_usd || 5.00,
    };

    const llmConfig = {
      provider: 'anthropic',
      model: body.config.model || 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      max_tokens: 4096,
    };

    // Create agent
    const agentId = generateUUID();
    const now = nowISO();

    const { error: insertError } = await supabase.from('agents').insert({
      id: agentId,
      tenant_id: auth.tenantId,
      name: body.name,
      role: body.role,
      description: body.goal,
      status: 'initializing',
      capabilities,
      config: {
        goal: body.goal,
        context: body.context,
      },
      llm_config: llmConfig,
      limits,
      stats: {
        tasks_completed: 0,
        tasks_failed: 0,
        escalations_raised: 0,
        avg_task_duration_seconds: 0,
        total_cost_usd: 0,
      },
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      logger.error('Failed to create agent', insertError);
      return errorResponse('AGENT_CREATE_FAILED', insertError.message, 500, true);
    }

    // Log activity
    await logActivity(
      supabase,
      auth.tenantId,
      'agent.spawned',
      'agent',
      'user',
      auth.userId,
      `Agent "${body.name}" spawned`,
      `New ${body.role} agent created with ${capabilities.length} capabilities`,
      {
        agent_id: agentId,
        role: body.role,
        capabilities,
      },
      agentId
    );

    // Update status to idle after initialization
    await updateAgentStatus(supabase, agentId, 'idle', 'Agent initialized and ready');

    logger.info('Agent spawned successfully', { agentId, role: body.role });

    return jsonResponse({
      success: true,
      data: {
        agent: {
          id: agentId,
          tenant_id: auth.tenantId,
          parent_id: null,
          root_id: agentId,
          depth: 0,
          name: body.name,
          role: body.role,
          capabilities,
          status: 'idle',
        },
        context_snapshot: {
          spawned_at: now,
          initial_state: 'idle',
        },
      },
    }, 201);
  } catch (err) {
    logger.error('Spawn handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Lifecycle Handler
// ============================================================================

const VALID_TRANSITIONS: Record<string, string[]> = {
  'initializing': ['idle', 'error', 'terminated'],
  'idle': ['active', 'paused', 'error', 'terminated'],
  'active': ['idle', 'paused', 'blocked', 'error', 'terminated'],
  'paused': ['idle', 'active', 'terminated'],
  'blocked': ['active', 'error', 'terminated'],
  'error': ['idle', 'paused', 'terminated'],
  'escaped': ['idle', 'terminated'],
  'terminated': [],
};

function getTargetState(currentState: string, action: string): string | null {
  const actionMap: Record<string, Record<string, string>> = {
    'pause': { 'idle': 'paused', 'active': 'paused' },
    'resume': { 'paused': 'idle', 'blocked': 'active', 'error': 'idle', 'escaped': 'idle' },
    'terminate': {
      'initializing': 'terminated',
      'idle': 'terminated',
      'active': 'terminated',
      'paused': 'terminated',
      'blocked': 'terminated',
      'error': 'terminated',
      'escaped': 'terminated',
    },
    'error': { 'initializing': 'error', 'idle': 'error', 'active': 'error', 'blocked': 'error' },
    'escape': { 'idle': 'escaped', 'active': 'escaped', 'paused': 'escaped', 'blocked': 'escaped' },
    'block': { 'idle': 'blocked', 'active': 'blocked' },
    'unblock': { 'blocked': 'active' },
  };

  return actionMap[action]?.[currentState] || null;
}

async function handleLifecycle(
  auth: AuthContext,
  body: LifecycleRequest
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    // Verify agent belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, status, name')
      .eq('id', body.agent_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (agentError || !agent) {
      return errorResponse('AGENT_NOT_FOUND', 'Agent not found or does not belong to tenant', 404, false);
    }

    // Get target state
    const targetState = getTargetState(agent.status, body.action);
    if (!targetState) {
      return errorResponse(
        'INVALID_TRANSITION',
        `Cannot ${body.action} from state ${agent.status}`,
        400,
        false
      );
    }

    // Check if transition is valid
    const allowedTransitions = VALID_TRANSITIONS[agent.status] || [];
    if (!allowedTransitions.includes(targetState)) {
      return errorResponse(
        'INVALID_TRANSITION',
        `Transition from ${agent.status} to ${targetState} not allowed`,
        400,
        false
      );
    }

    // Update agent status
    const result = await updateAgentStatus(
      supabase,
      body.agent_id,
      targetState,
      body.reason
    );

    if (!result.success) {
      return errorResponse(
        'STATUS_UPDATE_FAILED',
        result.error?.message || 'Failed to update status',
        500,
        true
      );
    }

    // Log activity
    await logActivity(
      supabase,
      auth.tenantId,
      'agent.status_changed',
      'agent',
      body.triggered_by_type || 'user',
      body.triggered_by || auth.userId,
      `Agent "${agent.name}" ${body.action}d`,
      `Status changed from ${agent.status} to ${targetState}`,
      {
        agent_id: body.agent_id,
        previous_state: agent.status,
        new_state: targetState,
        action: body.action,
        ...body.metadata,
      },
      body.agent_id
    );

    logger.info('Lifecycle action completed', {
      agentId: body.agent_id,
      action: body.action,
      newState: targetState,
    });

    return jsonResponse({
      success: true,
      data: {
        agent_id: body.agent_id,
        previous_state: agent.status,
        new_state: targetState,
        timestamp: nowISO(),
      },
    });
  } catch (err) {
    logger.error('Lifecycle handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Message Handler
// ============================================================================

async function handleMessage(
  auth: AuthContext,
  body: SendMessageRequest
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    // Validate sender belongs to tenant
    const { data: sender, error: senderError } = await supabase
      .from('agents')
      .select('id, name, capabilities')
      .eq('id', body.from_agent_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (senderError || !sender) {
      return errorResponse('SENDER_NOT_FOUND', 'Sender agent not found', 404, false);
    }

    // Validate recipient if not broadcast
    if (!body.to_broadcast && body.to_agent_id) {
      const { data: recipient, error: recipientError } = await supabase
        .from('agents')
        .select('id')
        .eq('id', body.to_agent_id)
        .eq('tenant_id', auth.tenantId)
        .single();

      if (recipientError || !recipient) {
        return errorResponse('RECIPIENT_NOT_FOUND', 'Recipient agent not found', 404, false);
      }
    }

    // Create message
    const messageId = generateUUID();
    const now = nowISO();

    const { error: insertError } = await supabase.from('messages').insert({
      id: messageId,
      tenant_id: auth.tenantId,
      protocol_version: '1.0',
      message_type: body.message_type,
      from_agent_id: body.from_agent_id,
      to_agent_id: body.to_broadcast ? null : body.to_agent_id,
      to_broadcast: body.to_broadcast,
      thread_id: body.thread_id,
      correlation_id: body.correlation_id,
      payload: body.payload,
      priority: body.priority,
      requires_ack: body.requires_ack,
      trace: { hops: body.trace },
      expires_at: body.ttl_seconds
        ? new Date(Date.now() + body.ttl_seconds * 1000).toISOString()
        : null,
      created_at: now,
    });

    if (insertError) {
      logger.error('Failed to create message', insertError);
      return errorResponse('MESSAGE_CREATE_FAILED', insertError.message, 500, true);
    }

    // Create delivery record
    await supabase.from('message_delivery').insert({
      tenant_id: auth.tenantId,
      message_id: messageId,
      status: 'pending',
      expires_at: body.ttl_seconds
        ? new Date(Date.now() + body.ttl_seconds * 1000).toISOString()
        : null,
    });

    // Log activity
    await logActivity(
      supabase,
      auth.tenantId,
      'message.sent',
      'message',
      'agent',
      body.from_agent_id,
      `Message sent: ${body.message_type}`,
      body.to_broadcast
        ? `Broadcast message from ${sender.name}`
        : `Direct message from ${sender.name}`,
      {
        message_id: messageId,
        message_type: body.message_type,
        to_broadcast: body.to_broadcast,
        to_agent_id: body.to_agent_id,
        priority: body.priority,
      },
      body.from_agent_id
    );

    logger.info('Message sent', {
      messageId,
      type: body.message_type,
      from: body.from_agent_id,
      broadcast: body.to_broadcast,
    });

    return jsonResponse({
      success: true,
      data: {
        message_id: messageId,
        status: 'sent',
        timestamp: now,
      },
    }, 201);
  } catch (err) {
    logger.error('Message handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Decision Handler
// ============================================================================

async function handleDecide(
  auth: AuthContext,
  body: DecisionProposal
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    // Validate agent belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, capabilities')
      .eq('id', body.agent_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (agentError || !agent) {
      return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404, false);
    }

    // Check capability if required
    if (body.required_capability && !body.self_authorized) {
      const hasCapability = await validateCapability(
        supabase,
        body.agent_id,
        body.required_capability
      );

      if (!hasCapability) {
        return errorResponse(
          'PERMISSION_DENIED',
          `Agent lacks required capability: ${body.required_capability}`,
          403,
          false
        );
      }
    }

    // Create decision record
    const decisionId = generateUUID();
    const now = nowISO();

    const { error: insertError } = await supabase.from('decisions').insert({
      id: decisionId,
      tenant_id: auth.tenantId,
      agent_id: body.agent_id,
      task_id: body.task_id,
      category: body.category,
      title: body.title,
      description: body.description,
      proposed_action: body.proposed_action,
      executed_action: body.self_authorized ? body.proposed_action : null,
      reasoning: body.reasoning,
      self_authorized: body.self_authorized,
      required_approval_from: body.self_authorized ? null : 'parent',
      status: body.self_authorized ? 'executed' : 'proposed',
      proposed_at: now,
      executed_at: body.self_authorized ? now : null,
    });

    if (insertError) {
      logger.error('Failed to create decision', insertError);
      return errorResponse('DECISION_CREATE_FAILED', insertError.message, 500, true);
    }

    // Log decision to activity feed
    await logActivity(
      supabase,
      auth.tenantId,
      body.self_authorized ? 'decision.made' : 'decision.proposed',
      'decision',
      'agent',
      body.agent_id,
      body.title,
      body.description,
      {
        decision_id: decisionId,
        category: body.category,
        confidence: body.reasoning.confidence,
        self_authorized: body.self_authorized,
      },
      body.agent_id,
      body.task_id
    );

    // Also log to decision log for analytics
    await supabase.from('agent_decision_log').insert({
      tenant_id: auth.tenantId,
      agent_id: body.agent_id,
      task_id: body.task_id,
      decision_id: decisionId,
      category: body.category,
      action_type: body.proposed_action.type || 'unknown',
      action_params: body.proposed_action,
      reasoning: body.reasoning.context,
      confidence: body.reasoning.confidence,
    });

    logger.info('Decision recorded', {
      decisionId,
      agentId: body.agent_id,
      selfAuthorized: body.self_authorized,
    });

    return jsonResponse({
      success: true,
      data: {
        decision_id: decisionId,
        status: body.self_authorized ? 'executed' : 'proposed',
        requires_approval: !body.self_authorized,
        timestamp: now,
      },
    }, 201);
  } catch (err) {
    logger.error('Decision handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Escalation Handler
// ============================================================================

async function handleEscalate(
  auth: AuthContext,
  body: EscalationRequest
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    // Validate agent belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', body.agent_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (agentError || !agent) {
      return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404, false);
    }

    // Check agent has escalate capability
    const canEscalate = await validateCapability(supabase, body.agent_id, 'escalate');
    if (!canEscalate) {
      return errorResponse('PERMISSION_DENIED', 'Agent lacks escalate capability', 403, false);
    }

    // Calculate SLA deadline based on urgency
    const slaMinutes: Record<string, number> = {
      'low': 240,      // 4 hours
      'normal': 60,    // 1 hour
      'high': 15,      // 15 minutes
      'critical': 5,   // 5 minutes
    };
    const slaDeadline = new Date(Date.now() + (slaMinutes[body.urgency] || 60) * 60 * 1000);

    // Create escalation record
    const escalationId = generateUUID();
    const now = nowISO();

    const { error: insertError } = await supabase.from('escalations').insert({
      id: escalationId,
      tenant_id: auth.tenantId,
      agent_id: body.agent_id,
      task_id: body.task_id,
      type: body.type,
      urgency: body.urgency,
      status: 'open',
      title: body.title,
      description: body.description,
      situation_context: body.situation_context,
      question: body.question,
      agent_analysis: body.agent_analysis,
      sla_deadline_at: slaDeadline.toISOString(),
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      logger.error('Failed to create escalation', insertError);
      return errorResponse('ESCALATION_CREATE_FAILED', insertError.message, 500, true);
    }

    // Update agent stats
    await supabase.rpc('increment_agent_escalation_count', {
      p_agent_id: body.agent_id,
    });

    // Log activity
    await logActivity(
      supabase,
      auth.tenantId,
      'escalation.created',
      'escalation',
      'agent',
      body.agent_id,
      `Escalation: ${body.title}`,
      body.description,
      {
        escalation_id: escalationId,
        type: body.type,
        urgency: body.urgency,
        sla_deadline: slaDeadline.toISOString(),
      },
      body.agent_id,
      body.task_id
    );

    logger.info('Escalation created', {
      escalationId,
      agentId: body.agent_id,
      urgency: body.urgency,
    });

    return jsonResponse({
      success: true,
      data: {
        escalation_id: escalationId,
        status: 'open',
        sla_deadline: slaDeadline.toISOString(),
        timestamp: now,
      },
    }, 201);
  } catch (err) {
    logger.error('Escalation handler error', err);
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
  const path = url.pathname.replace(/^\/agent-runtime\/?/, '') || 'health';

  logger.debug('Request received', { method: req.method, path });

  // Health check endpoint (no auth required)
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

  // Verify authentication for all other endpoints
  const auth = await verifyJWT(req);
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing authentication', 401, false);
  }

  // Route to appropriate handler
  try {
    const body = req.method === 'POST' ? await req.json() : {};

    switch (path) {
      case 'spawn': {
        if (req.method !== 'POST') {
          return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
        }
        const validated = spawnRequestSchema.parse(body);
        return await handleSpawn(auth, validated);
      }

      case 'lifecycle': {
        if (req.method !== 'POST') {
          return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
        }
        const validated = lifecycleRequestSchema.parse(body);
        return await handleLifecycle(auth, validated);
      }

      case 'message': {
        if (req.method !== 'POST') {
          return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
        }
        const validated = sendMessageRequestSchema.parse(body);
        return await handleMessage(auth, validated);
      }

      case 'decide': {
        if (req.method !== 'POST') {
          return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
        }
        const validated = decisionProposalSchema.parse(body);
        return await handleDecide(auth, validated);
      }

      case 'escalate': {
        if (req.method !== 'POST') {
          return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
        }
        const validated = escalationRequestSchema.parse(body);
        return await handleEscalate(auth, validated);
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

// Deno serve
Deno.serve(handler);
