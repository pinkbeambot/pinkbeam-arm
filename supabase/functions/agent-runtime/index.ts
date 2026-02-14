/**
 * Agent Runtime Edge Function
 * Main entry point for agent runtime operations
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
  spawnRequestSchema,
  lifecycleRequestSchema,
  sendMessageRequestSchema,
  decisionProposalSchema,
  escalationRequestSchema,
} from '../_shared/utils.ts';

const logger = createLogger('agent-runtime');

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

function errorResponse(code: string, message: string, status = 400, retryable = false): Response {
  return jsonResponse({ success: false, error: { code, message, retryable } }, status);
}

// Handler implementations
async function handleSpawn(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  const agentId = generateUUID();
  const now = nowISO();

  const { error } = await supabase.from('agents').insert({
    id: agentId,
    tenant_id: auth.tenantId,
    name: body.name,
    role: body.role,
    description: body.goal,
    status: 'idle',
    capabilities: body.config?.capabilities || ['decide', 'escalate'],
    config: { goal: body.goal, context: body.context },
    created_at: now,
    updated_at: now,
  });

  if (error) return errorResponse('AGENT_CREATE_FAILED', error.message, 500, true);

  await logActivity(supabase, auth.tenantId, 'agent.spawned', 'agent', 'user', auth.userId,
    `Agent "${body.name}" spawned`, `New ${body.role} agent created`, { agent_id: agentId }, agentId);

  return jsonResponse({ success: true, data: { agent: { id: agentId, name: body.name, role: body.role, status: 'idle' } } }, 201);
}

async function handleLifecycle(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  const result = await updateAgentStatus(supabase, body.agent_id, 
    body.action === 'pause' ? 'paused' : body.action === 'resume' ? 'idle' : body.action === 'terminate' ? 'terminated' : body.action === 'error' ? 'error' : 'idle',
    body.reason
  );

  if (!result.success) return errorResponse('STATUS_UPDATE_FAILED', result.error?.message || 'Failed', 500, true);

  return jsonResponse({ success: true, data: { agent_id: body.agent_id, new_state: body.action } });
}

async function handleMessage(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  const messageId = generateUUID();
  const now = nowISO();

  const { error } = await supabase.from('messages').insert({
    id: messageId,
    tenant_id: auth.tenantId,
    protocol_version: '1.0',
    message_type: body.message_type,
    from_agent_id: body.from_agent_id,
    to_agent_id: body.to_broadcast ? null : body.to_agent_id,
    to_broadcast: body.to_broadcast,
    payload: body.payload,
    priority: body.priority,
    created_at: now,
  });

  if (error) return errorResponse('MESSAGE_CREATE_FAILED', error.message, 500, true);

  return jsonResponse({ success: true, data: { message_id: messageId } }, 201);
}

async function handleDecide(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  const decisionId = generateUUID();
  const now = nowISO();

  const { error } = await supabase.from('decisions').insert({
    id: decisionId,
    tenant_id: auth.tenantId,
    agent_id: body.agent_id,
    category: body.category,
    title: body.title,
    description: body.description,
    proposed_action: body.proposed_action,
    reasoning: body.reasoning,
    self_authorized: body.self_authorized,
    status: body.self_authorized ? 'executed' : 'proposed',
    proposed_at: now,
    executed_at: body.self_authorized ? now : null,
  });

  if (error) return errorResponse('DECISION_CREATE_FAILED', error.message, 500, true);

  return jsonResponse({ success: true, data: { decision_id: decisionId } }, 201);
}

async function handleEscalate(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  const escalationId = generateUUID();
  const now = nowISO();

  const { error } = await supabase.from('escalations').insert({
    id: escalationId,
    tenant_id: auth.tenantId,
    agent_id: body.agent_id,
    type: body.type,
    urgency: body.urgency,
    status: 'open',
    title: body.title,
    description: body.description,
    question: body.question,
    agent_analysis: body.agent_analysis,
    created_at: now,
    updated_at: now,
  });

  if (error) return errorResponse('ESCALATION_CREATE_FAILED', error.message, 500, true);

  return jsonResponse({ success: true, data: { escalation_id: escalationId } }, 201);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/agent-runtime\/?/, '') || 'health';

  if (path === 'health' && req.method === 'GET') {
    return jsonResponse({ success: true, data: { status: 'healthy', version: '1.0.0' } });
  }

  const auth = await verifyJWT(req);
  if (!auth) return errorResponse('UNAUTHORIZED', 'Invalid auth', 401, false);

  try {
    const body = req.method === 'POST' ? await req.json() : {};

    switch (path) {
      case 'spawn': return handleSpawn(auth, spawnRequestSchema.parse(body));
      case 'lifecycle': return handleLifecycle(auth, lifecycleRequestSchema.parse(body));
      case 'message': return handleMessage(auth, sendMessageRequestSchema.parse(body));
      case 'decide': return handleDecide(auth, decisionProposalSchema.parse(body));
      case 'escalate': return handleEscalate(auth, escalationRequestSchema.parse(body));
      default: return errorResponse('NOT_FOUND', `Unknown: ${path}`, 404, false);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), 400, false);
    }
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown', 500, true);
  }
}

Deno.serve(handler);
