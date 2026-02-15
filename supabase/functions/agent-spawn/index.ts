/**
 * Agent Spawn Edge Function
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';
import { createAdminClient, generateUUID, nowISO, createLogger, logActivity, getDefaultAgentConfig, spawnRequestSchema, uuidSchema } from '../_shared/utils.ts';

const logger = createLogger('agent-spawn');

const hierarchicalSpawnSchema = spawnRequestSchema.extend({
  parent_agent_id: uuidSchema.optional(),
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

async function handleSpawn(auth: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const supabase = createAdminClient();
  
  let parentAgent: Record<string, unknown> | null = null;
  if (body.parent_agent_id) {
    const { data } = await supabase.from('agents').select('id, root_id, depth, capabilities').eq('id', body.parent_agent_id).eq('tenant_id', auth.tenantId).single();
    if (data) parentAgent = data;
  }

  const defaultConfig = getDefaultAgentConfig(body.role);
  const agentId = generateUUID();
  const now = nowISO();

  const { error } = await supabase.from('agents').insert({
    id: agentId,
    tenant_id: auth.tenantId,
    parent_id: parentAgent?.id || null,
    root_id: parentAgent?.root_id || agentId,
    depth: parentAgent ? parentAgent.depth + 1 : 0,
    name: body.name,
    role: body.role,
    description: body.goal,
    status: 'idle',
    capabilities: body.config?.capabilities || (defaultConfig.capabilities as string[]),
    created_at: now,
    updated_at: now,
  });

  if (error) return errorResponse('AGENT_CREATE_FAILED', error.message, 500, true);

  await logActivity(supabase, auth.tenantId, 'agent.spawned', 'agent', parentAgent ? 'agent' : 'user', parentAgent?.id || auth.userId,
    `Agent "${body.name}" spawned`, 'New agent created', { agent_id: agentId, parent_id: parentAgent?.id }, agentId);

  return jsonResponse({
    success: true,
    data: {
      agent: { id: agentId, tenant_id: auth.tenantId, parent_id: parentAgent?.id || null, name: body.name, role: body.role, status: 'idle' }
    }
  }, 201);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/agent-spawn\/?/, '') || '';

  if (path === 'health' && req.method === 'GET') {
    return jsonResponse({ success: true, data: { status: 'healthy' } });
  }

  const auth = await verifyJWT(req);
  if (!auth) return errorResponse('UNAUTHORIZED', 'Invalid auth', 401, false);

  try {
    if (req.method === 'POST' && !path) {
      const body = await req.json();
      return await handleSpawn(auth, hierarchicalSpawnSchema.parse(body));
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
