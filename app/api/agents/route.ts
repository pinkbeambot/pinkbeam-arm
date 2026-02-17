import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiSuccessList, apiError } from '@/lib/api/response';
import { createAgentSchema, listAgentsQuerySchema, updateAgentSchema } from '@/lib/validation';

/**
 * GET /api/agents
 * 
 * List all agents for the current tenant with pagination and filtering.
 * 
 * Query Parameters:
 * - status: Filter by agent status (initializing, idle, active, paused, blocked, error, escaped, terminated)
 * - role: Filter by agent role (ceo, manager, worker, specialist, system)
 * - search: Search in agent name (case-insensitive)
 * - parent_id: Filter by parent agent ID for hierarchy queries
 * - include_descendants: Include all descendants when filtering by parent_id (default: false)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * 
 * Response: { data: Agent[], pagination: Pagination }
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
        const allIds = [parent_id, ...(descendantIds || [])];
        query = query.in('id', allIds);
      } else {
        query = query.eq('parent_id', parent_id);
      }
    }

    // Search in name (case-insensitive)
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

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
 * - slug: URL-friendly identifier (optional, max 100 chars)
 * - role: Agent role (ceo, manager, worker, specialist, system)
 * - description: Agent description (optional)
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

    // If parent_id is provided, verify it belongs to the same tenant
    if (agentData.parent_id) {
      const { data: parentAgent, error: parentError } = await supabase
        .from('agents')
        .select('id, tenant_id, root_id, depth')
        .eq('id', agentData.parent_id)
        .eq('tenant_id', tenantId)
        .single();

      if (parentError || !parentAgent) {
        return apiError('Parent agent not found or access denied', 404);
      }
    }

    // Prepare agent data with tenant context
    const newAgent = {
      ...agentData,
      tenant_id: tenantId,
      status: 'initializing' as const,
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
