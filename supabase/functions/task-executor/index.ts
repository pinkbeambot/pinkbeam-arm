/**
 * Task Executor Edge Function
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';
import { createAdminClient, generateUUID, nowISO, createLogger, logActivity, taskExecuteRequestSchema, taskCreateRequestSchema } from '../_shared/utils.ts';

const logger = createLogger('task-executor');

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
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) return null;
    return { userId: user.id, tenantId, role: user.user_metadata?.role || 'member' };
  } catch { return null; }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}

function errorResponse(code: string, message: string, status = 400, retryable = false): Response {
  return jsonResponse({ success: false, error: { code, message, retryable } }, status);
}

async function handleCreate(auth: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const supabase = createAdminClient();
  const taskId = generateUUID();
  const now = nowISO();

  const { error } = await supabase.from('tasks').insert({
    id: taskId,
    tenant_id: auth.tenantId,
    title: body.title,
    description: body.description,
    type: body.type || 'generic',
    priority: body.priority || 'normal',
    assignee_id: body.assignee_id,
    assigner_id: body.assigner_id || auth.userId,
    status: 'queued',
    created_at: now,
    updated_at: now,
  });

  if (error) return errorResponse('CREATE_FAILED', error.message, 500, true);

  await logActivity(supabase, auth.tenantId, 'task.created', 'task', 'user', auth.userId,
    `Task created: ${body.title}`, body.description, { task_id: taskId }, body.assignee_id, taskId);

  return jsonResponse({ success: true, data: { task_id: taskId, status: 'queued' } }, 201);
}

async function handleClaim(auth: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const supabase = createAdminClient();
  const now = nowISO();

  const { error } = await supabase.from('tasks').update({ assignee_id: body.agent_id, updated_at: now })
    .eq('id', body.task_id).eq('tenant_id', auth.tenantId);

  if (error) return errorResponse('CLAIM_FAILED', error.message, 500, true);

  return jsonResponse({ success: true, data: { task_id: body.task_id, agent_id: body.agent_id } });
}

async function handleStart(auth: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const supabase = createAdminClient();
  const now = nowISO();

  const { error } = await supabase.from('tasks').update({ status: 'in_progress', started_at: now, updated_at: now })
    .eq('id', body.task_id).eq('tenant_id', auth.tenantId);

  if (error) return errorResponse('START_FAILED', error.message, 500, true);

  return jsonResponse({ success: true, data: { task_id: body.task_id, status: 'in_progress' } });
}

async function handleComplete(auth: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const supabase = createAdminClient();
  const now = nowISO();

  const { error } = await supabase.from('tasks').update({
    status: 'completed', progress_percent: 100, completed_at: now,
    outputs: body.payload?.outputs || {}, updated_at: now
  }).eq('id', body.task_id).eq('tenant_id', auth.tenantId);

  if (error) return errorResponse('COMPLETE_FAILED', error.message, 500, true);

  return jsonResponse({ success: true, data: { task_id: body.task_id, status: 'completed' } });
}

async function handleFail(auth: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const supabase = createAdminClient();
  const now = nowISO();

  const { error } = await supabase.from('tasks').update({
    status: 'failed', completed_at: now, outputs: { error: body.payload?.error_message }, updated_at: now
  }).eq('id', body.task_id).eq('tenant_id', auth.tenantId);

  if (error) return errorResponse('FAIL_FAILED', error.message, 500, true);

  return jsonResponse({ success: true, data: { task_id: body.task_id, status: 'failed' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/task-executor\/?/, '') || 'health';

  if (path === 'health' && req.method === 'GET') {
    return jsonResponse({ success: true, data: { status: 'healthy' } });
  }

  const auth = await verifyJWT(req);
  if (!auth) return errorResponse('UNAUTHORIZED', 'Invalid auth', 401, false);

  try {
    const body = await req.json();

    switch (path) {
      case 'create': return handleCreate(auth, taskCreateRequestSchema.parse(body));
      case 'claim': return handleClaim(auth, body);
      case 'start': return handleStart(auth, body);
      case 'complete': return handleComplete(auth, taskExecuteRequestSchema.parse(body));
      case 'fail': return handleFail(auth, taskExecuteRequestSchema.parse(body));
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
