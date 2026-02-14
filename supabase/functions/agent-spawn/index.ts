/**
 * Agent Spawn Edge Function
 * Dedicated endpoint for agent spawning with hierarchical support
 * 
 * POST /         : Spawn a new agent
 * GET  /:id      : Get spawn status
 * POST /validate : Validate spawn configuration
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';
import {
  createAdminClient,
  generateUUID,
  nowISO,
  createLogger,
  logActivity,
  getDefaultAgentConfig,
  validateCapability,
  spawnRequestSchema,
  tenantIdSchema,
  uuidSchema,
  agentRoleSchema,
  type SpawnRequest,
} from '../_shared/utils.ts';

const logger = createLogger('agent-spawn');

// ============================================================================
// Extended Spawn Request Schema
// ============================================================================

const hierarchicalSpawnSchema = spawnRequestSchema.extend({
  parent_agent_id: uuidSchema.optional(),
  inherit_capabilities: z.boolean().default(false),
  inherit_config: z.boolean().default(false),
});

type HierarchicalSpawnRequest = z.infer<typeof hierarchicalSpawnSchema>;

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
// Validation Functions
// ============================================================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config_preview?: Record<string, unknown>;
}

async function validateSpawnConfig(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  body: HierarchicalSpawnRequest,
  parentAgentId?: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const configPreview: Record<string, unknown> = {};

  // Check tenant limits
  const { data: tenant } = await supabase
    .from('tenants')
    .select('limits')
    .eq('id', tenantId)
    .single();

  const maxAgents = (tenant?.limits as Record<string, number>)?.max_agents || 10;
  
  const { count: currentAgents, error: countError } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .neq('status', 'terminated');

  if (countError) {
    errors.push('Failed to check tenant agent count');
  } else if ((currentAgents || 0) >= maxAgents) {
    errors.push(`Tenant agent limit reached (${maxAgents})`);
  }

  // Validate parent agent if provided
  let parentAgent: {
    id: string;
    root_id: string;
    depth: number;
    capabilities: string[];
    config: Record<string, unknown>;
    limits: Record<string, unknown>;
  } | null = null;

  if (parentAgentId) {
    const { data: parent, error } = await supabase
      .from('agents')
      .select('id, root_id, depth, capabilities, config, limits')
      .eq('id', parentAgentId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !parent) {
      errors.push('Parent agent not found');
    } else {
      parentAgent = parent as typeof parentAgent;

      // Check spawn capability
      if (!parent.capabilities?.includes('spawn')) {
        errors.push('Parent agent lacks spawn capability');
      }

      // Check max depth (prevent runaway nesting)
      if (parent.depth >= 5) {
        errors.push('Maximum agent nesting depth (5) would be exceeded');
      }

      // Check parent can spawn more children
      const { count: childCount } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', parentAgentId)
        .neq('status', 'terminated');

      const maxChildren = (parent.limits as Record<string, number>)?.max_sub_agents || 5;
      if ((childCount || 0) >= maxChildren) {
        errors.push(`Parent agent has reached maximum children (${maxChildren})`);
      }
    }
  }

  // Validate role-specific constraints
  const roleLimits: Record<string, { min_depth: number; max_children: number }> = {
    'ceo': { min_depth: 0, max_children: 100 },
    'manager': { min_depth: 0, max_children: 10 },
    'worker': { min_depth: 1, max_children: 0 },
    'specialist': { min_depth: 1, max_children: 2 },
    'system': { min_depth: 0, max_children: 100 },
  };

  const limits = roleLimits[body.role];
  if (limits) {
    if (parentAgent && parentAgent.depth + 1 < limits.min_depth) {
      errors.push(`Role '${body.role}' requires minimum depth ${limits.min_depth}`);
    }
    if (limits.max_children === 0) {
      warnings.push(`Role '${body.role}' cannot have child agents`);
    }
  }

  // Build config preview
  const defaultConfig = getDefaultAgentConfig(body.role);
  configPreview.role = body.role;
  configPreview.capabilities = body.inherit_capabilities && parentAgent
    ? [...new Set([...parentAgent.capabilities, ...(body.config.capabilities || [])])]
    : body.config.capabilities || (defaultConfig.capabilities as string[]);
  
  configPreview.limits = {
    max_sub_agents: body.config.max_sub_agents || (defaultConfig.max_sub_agents as number),
    escalation_threshold: body.config.escalation_threshold || (defaultConfig.escalation_threshold as number),
    timeout_seconds: body.config.timeout_seconds || 300,
  };

  configPreview.depth = parentAgent ? parentAgent.depth + 1 : 0;
  configPreview.parent_id = parentAgentId || null;
  configPreview.root_id = parentAgent ? parentAgent.root_id : null;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config_preview: configPreview,
  };
}

// ============================================================================
// Spawn Handler
// ============================================================================

async function handleSpawn(
  auth: AuthContext,
  body: HierarchicalSpawnRequest
): Promise<Response> {
  const supabase = createAdminClient();
  
  try {
    // Validate configuration
    const validation = await validateSpawnConfig(
      supabase,
      auth.tenantId,
      body,
      body.parent_agent_id
    );

    if (!validation.valid) {
      return errorResponse(
        'VALIDATION_FAILED',
        `Spawn validation failed: ${validation.errors.join(', ')}`,
        400,
        false
      );
    }

    // Get parent details if applicable
    let parentAgent: {
      id: string;
      root_id: string | null;
      depth: number;
      capabilities: string[];
    } | null = null;

    if (body.parent_agent_id) {
      const { data } = await supabase
        .from('agents')
        .select('id, root_id, depth, capabilities')
        .eq('id', body.parent_agent_id)
        .eq('tenant_id', auth.tenantId)
        .single();
      
      if (data) {
        parentAgent = data;
      }
    }

    // Determine capabilities
    const defaultConfig = getDefaultAgentConfig(body.role);
    let capabilities: string[];
    
    if (body.inherit_capabilities && parentAgent) {
      capabilities = [...new Set([
        ...parentAgent.capabilities,
        ...(body.config.capabilities || [])
      ])];
    } else {
      capabilities = body.config.capabilities || (defaultConfig.capabilities as string[]);
    }

    // Build configuration
    const config = body.inherit_config && parentAgent
      ? { /* would merge parent config */ }
      : {
          goal: body.goal,
          context: body.context,
        };

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
      parent_id: parentAgent?.id || null,
      root_id: parentAgent?.root_id || agentId,
      depth: parentAgent ? parentAgent.depth + 1 : 0,
      name: body.name,
      role: body.role,
      description: body.goal,
      status: 'initializing',
      capabilities,
      config,
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

    // Log lifecycle event
    await supabase.from('agent_lifecycle_events').insert({
      tenant_id: auth.tenantId,
      agent_id: agentId,
      event_type: 'created',
      new_state: 'initializing',
      triggered_by: auth.userId,
      triggered_by_type: 'user',
      reason: 'Agent spawned via API',
      metadata: {
        parent_id: parentAgent?.id,
        role: body.role,
        capabilities,
      },
    });

    // Log activity
    await logActivity(
      supabase,
      auth.tenantId,
      'agent.spawned',
      'agent',
      parentAgent ? 'agent' : 'user',
      parentAgent?.id || auth.userId,
      `Agent "${body.name}" spawned`,
      parentAgent
        ? `Child ${body.role} agent created by parent`
        : `New ${body.role} agent created`,
      {
        agent_id: agentId,
        parent_id: parentAgent?.id,
        role: body.role,
        capabilities,
        depth: parentAgent ? parentAgent.depth + 1 : 0,
      },
      agentId
    );

    // Update status to idle
    await supabase
      .from('agents')
      .update({ status: 'idle', status_reason: 'Agent initialized and ready' })
      .eq('id', agentId);

    // Log initialized event
    await supabase.from('agent_lifecycle_events').insert({
      tenant_id: auth.tenantId,
      agent_id: agentId,
      event_type: 'initialized',
      previous_state: 'initializing',
      new_state: 'idle',
      triggered_by_type: 'system',
      reason: 'Agent initialization complete',
    });

    logger.info('Agent spawned successfully', {
      agentId,
      role: body.role,
      parentId: parentAgent?.id,
    });

    return jsonResponse({
      success: true,
      data: {
        agent: {
          id: agentId,
          tenant_id: auth.tenantId,
          parent_id: parentAgent?.id || null,
          root_id: parentAgent?.root_id || agentId,
          depth: parentAgent ? parentAgent.depth + 1 : 0,
          name: body.name,
          role: body.role,
          capabilities,
          status: 'idle',
        },
        context_snapshot: {
          spawned_at: now,
          initial_state: 'idle',
          parent_context: parentAgent ? {
            parent_id: parentAgent.id,
            parent_depth: parentAgent.depth,
          } : null,
        },
      },
    }, 201);
  } catch (err) {
    logger.error('Spawn handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Status Handler
// ============================================================================

async function handleGetStatus(
  auth: AuthContext,
  agentId: string
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, role, status, parent_id, depth, capabilities, created_at, updated_at')
      .eq('id', agentId)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (error || !agent) {
      return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404, false);
    }

    // Get lifecycle events
    const { data: events } = await supabase
      .from('agent_lifecycle_events')
      .select('*')
      .eq('agent_id', agentId)
      .eq('tenant_id', auth.tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    return jsonResponse({
      success: true,
      data: {
        agent,
        recent_events: events || [],
      },
    });
  } catch (err) {
    logger.error('Status handler error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// ============================================================================
// Validate Handler
// ============================================================================

async function handleValidate(
  auth: AuthContext,
  body: HierarchicalSpawnRequest
): Promise<Response> {
  const supabase = createAdminClient();

  try {
    const validation = await validateSpawnConfig(
      supabase,
      auth.tenantId,
      body,
      body.parent_agent_id
    );

    return jsonResponse({
      success: validation.valid,
      data: validation,
    }, validation.valid ? 200 : 400);
  } catch (err) {
    logger.error('Validate handler error', err);
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
  const pathParts = url.pathname.replace(/^\/agent-spawn\/?/, '').split('/').filter(Boolean);
  const mainPath = pathParts[0] || '';

  logger.debug('Request received', { method: req.method, path: mainPath });

  // Health check
  if (mainPath === 'health' && req.method === 'GET') {
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

  try {
    // GET /:id - Get spawn status
    if (req.method === 'GET' && mainPath && mainPath !== 'validate') {
      const agentId = mainPath;
      return await handleGetStatus(auth, agentId);
    }

    // POST handlers
    if (req.method === 'POST') {
      const body = await req.json();

      // POST /validate - Validate configuration
      if (mainPath === 'validate') {
        const validated = hierarchicalSpawnSchema.parse(body);
        return await handleValidate(auth, validated);
      }

      // POST / - Spawn agent
      if (!mainPath) {
        const validated = hierarchicalSpawnSchema.parse(body);
        return await handleSpawn(auth, validated);
      }
    }

    return errorResponse('NOT_FOUND', `Unknown endpoint: ${mainPath}`, 404, false);
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
