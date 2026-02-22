import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiSuccessList, apiError } from '@/lib/api/response';
import { createAgentSchema, listAgentsQuerySchema } from '@/lib/validation';

/**
 * GET /api/agents
 *
 * List all agents for the current tenant with pagination and filtering.
 *
 * Query Parameters:
 * - status: Filter by agent status (initializing, idle, active, paused, blocked, error, escaped, terminated)
 * - role: Filter by agent role (ceo, manager, worker, specialist, system)
 * - search: Search in agent name and description (case-insensitive)
 * - parent_id: Filter by parent agent ID for hierarchy queries
 * - include_descendants: Include all descendants when filtering by parent_id (default: false)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * Response: { data: Agent[], pagination: { total, page, limit, totalPages } }
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = listAgentsQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const {
      status,
      role,
      search,
      parent_id,
      include_descendants,
      page,
      limit,
    } = validationResult.data;

    // Calculate offset from page
    const offset = (page - 1) * limit;

    // Build the query with count
    let query = supabase
      .from('agents')
      .select('*', { count: 'exact' });

    // Apply tenant filter (RLS handles this, but explicit is clearer)
    query = query.eq('tenant_id', tenantId);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (parent_id) {
      if (include_descendants) {
        // Use the get_agent_descendants function for recursive fetching
        const { data: descendantIds, error: descendantsError } = await supabase
          .rpc('get_agent_descendants', { p_agent_id: parent_id });

        if (descendantsError) {
          console.error('Error fetching descendants:', descendantsError);
          return apiError('Failed to fetch agent descendants', 500);
        }

        // Include the parent agent as well
        const allIds = [parent_id, ...(descendantIds?.map((d: { id: string }) => d.id) || [])];
        query = query.in('id', allIds);
      } else {
        query = query.eq('parent_id', parent_id);
      }
    }

    // Search in name and description (case-insensitive)
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Only show non-deleted agents by default
    query = query.is('deleted_at', null);

    // Execute query with pagination
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Agents GET error:', error);
      return apiError('Failed to fetch agents', 500, error.message);
    }

    // Calculate pagination
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return apiSuccessList(data || [], {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error('Agents GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * POST /api/agents
 *
 * Create a new agent for the current tenant.
 *
 * Body Parameters:
 * - name: Agent name (required, 1-255 chars)
 * - slug: URL-friendly identifier (optional, max 100 chars, auto-generated if not provided)
 * - role: Agent role (ceo, manager, worker, specialist, system)
 * - description: Agent description (optional, max 2000 chars)
 * - parent_id: Parent agent ID for hierarchy (optional)
 * - capabilities: Array of capability strings (optional)
 * - llm_config: LLM configuration object (optional)
 *   - provider: LLM provider name
 *   - model: Model name
 *   - temperature: Temperature 0-2 (optional)
 *   - max_tokens: Max tokens (optional)
 * - limits: Agent limits object (optional)
 *   - max_sub_agents: Max child agents (optional)
 *   - max_concurrent_tasks: Max concurrent tasks (optional)
 *   - escalation_threshold: Escalation threshold 0-1 (optional)
 *   - timeout_seconds: Timeout in seconds (optional)
 *   - max_tokens_per_task: Max tokens per task (optional)
 *   - max_cost_per_task_usd: Max cost per task (optional)
 * - config: Additional configuration object (optional)
 *
 * Response: { data: Agent } (201 Created)
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = createAgentSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const agentData = validationResult.data;

    // Check tenant limits (max agents per tier)
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('limits, plan')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant limits:', tenantError);
      return apiError('Failed to verify tenant limits', 500);
    }

    // Count existing agents for this tenant
    const { count: agentCount, error: countError } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (countError) {
      console.error('Error counting agents:', countError);
      return apiError('Failed to verify agent count', 500);
    }

    const maxAgents = tenantData?.limits?.max_agents || 10;
    if (agentCount !== null && agentCount >= maxAgents) {
      return apiError(
        `Agent limit reached. Your ${tenantData?.plan || 'starter'} plan allows ${maxAgents} agents.`,
        403,
        { maxAgents, currentCount: agentCount }
      );
    }

    // If parent_id is provided, verify it belongs to the same tenant
    let parentDepth = 0;
    let rootId: string | null = null;

    if (agentData.parent_id) {
      const { data: parentAgent, error: parentError } = await supabase
        .from('agents')
        .select('id, tenant_id, root_id, depth, limits')
        .eq('id', agentData.parent_id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (parentError || !parentAgent) {
        return apiError('Parent agent not found or access denied', 404);
      }

      parentDepth = parentAgent.depth || 0;
      rootId = parentAgent.root_id || parentAgent.id;

      // Check if parent has reached max_sub_agents limit
      const { count: childCount, error: childCountError } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', agentData.parent_id)
        .is('deleted_at', null);

      if (childCountError) {
        console.error('Error counting child agents:', childCountError);
        return apiError('Failed to verify parent agent limits', 500);
      }

      const parentMaxSubAgents = parentAgent.limits?.max_sub_agents || 5;
      if (childCount !== null && childCount >= parentMaxSubAgents) {
        return apiError(
          `Parent agent has reached its maximum of ${parentMaxSubAgents} sub-agents`,
          403,
          { maxSubAgents: parentMaxSubAgents, currentCount: childCount }
        );
      }
    }

    // Validate capabilities array
    const validCapabilities = [
      'spawn', 'delegate', 'decide', 'escalate', 'access_external',
      'modify_config', 'create_tasks', 'manage_agents', 'execute_code'
    ];

    if (agentData.capabilities) {
      const invalidCapabilities = agentData.capabilities.filter(
        (cap: string) => !validCapabilities.includes(cap)
      );
      if (invalidCapabilities.length > 0) {
        return apiError(
          `Invalid capabilities: ${invalidCapabilities.join(', ')}`,
          400,
          { validCapabilities, invalidCapabilities }
        );
      }
    }

    // Auto-generate slug if not provided
    let slug = agentData.slug;
    if (!slug) {
      slug = agentData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
    }

    // Set defaults for llm_config and limits if not provided
    const defaultLlmConfig = {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      max_tokens: 4096,
    };

    const defaultLimits = {
      max_sub_agents: 5,
      max_concurrent_tasks: 5,
      escalation_threshold: 0.7,
      timeout_seconds: 300,
      max_tokens_per_task: 100000,
      max_cost_per_task_usd: 5.00,
    };

    // Prepare agent data with tenant context
    const newAgent = {
      ...agentData,
      slug,
      tenant_id: tenantId,
      status: 'initializing' as const,
      depth: parentDepth + 1,
      root_id: rootId,
      llm_config: {
        ...defaultLlmConfig,
        ...agentData.llm_config,
      },
      limits: {
        ...defaultLimits,
        ...agentData.limits,
      },
    };

    // Insert the agent
    const { data, error } = await supabase
      .from('agents')
      .insert(newAgent)
      .select()
      .single();

    if (error) {
      console.error('Agents POST error:', error);

      // Handle unique constraint violation on slug
      if (error.code === '23505' && error.message.includes('slug')) {
        return apiError('An agent with this slug already exists', 409);
      }

      return apiError('Failed to create agent', 500, error.message);
    }

    return apiSuccess(data, 201);
  } catch (err) {
    console.error('Agents POST exception:', err);
    return apiError('Internal server error', 500);
  }
}
