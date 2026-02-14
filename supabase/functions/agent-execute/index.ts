/**
 * Agent Execute Edge Function
 * Handles agent task execution delegation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';
import { createAdminClient, generateUUID, nowISO, createLogger, logActivity } from '../_shared/utils.ts';

const logger = createLogger('agent-execute');

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

async function handleExecute(auth: AuthContext, body: any): Promise<Response> {
  const supabase = createAdminClient();
  const executionId = generateUUID();
  const now = nowISO();

  // Log the execution request
  await logActivity(supabase, auth.tenantId, 'agent.execute', 'agent', 'agent', body.agent_id,
    `Agent execution requested`, body.description || '', { execution_id: executionId, agent_id: body.agent_id, task_id: body.task_id });

  return jsonResponse({
    success: true,
    data: {
      execution_id: executionId,
      agent_id: body.agent_id,
      task_id: body.task_id,
      status: 'started',
      started_at: now
    }
  }, 202);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/agent-execute\/?/, '') || '';

  if (path === 'health' && req.method === 'GET') {
    return jsonResponse({ success: true, data: { status: 'healthy' } });
  }

  const auth = await verifyJWT(req);
  if (!auth) return errorResponse('UNAUTHORIZED', 'Invalid auth', 401, false);

  try {
    if (req.method === 'POST' && !path) {
      const body = await req.json();
      return await handleExecute(auth, body);
    }
    return errorResponse('NOT_FOUND', 'Unknown endpoint', 404, false);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), 400, false);
    }
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown', 500, true);
  }
}

Deno.serve(handler);
