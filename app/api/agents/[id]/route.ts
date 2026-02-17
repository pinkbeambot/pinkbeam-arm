import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateAgentSchema } from '@/lib/validation';

/**
 * GET /api/agents/[id]
 * 
 * Get a single agent by ID with full details.
 * Includes parent agent info, child agents count, and active task if any.
 * 
 * Path Parameters:
 * - id: Agent UUID (required)
 * 
 * Response: { data: Agent }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  try {
    // Fetch agent with parent info and child count
    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        *,
        parent:parent_id(id, name, role, status),
        children:agents!parent_id(count),
        current_task:tasks!current_task_id(id, title, status, progress_percent)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('Agent GET error:', error);
      
      if (error.code === 'PGRST116') {
        return apiError('Agent not found', 404);
      }
      
      return apiError('Failed to fetch agent', 500, error.message);
    }

    if (!agent) {
      return apiError('Agent not found', 404);
    }

    return apiSuccess(agent);
  } catch (err) {
    console.error('Agent GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * PATCH /api/agents/[id]
 * 
 * Update an agent's properties. Partial updates are supported.
 * Cannot update terminated agents (except to change status_reason).
 * Cannot change role or parent_id after creation (use specific endpoints).
 * 
 * Path Parameters:
 * - id: Agent UUID (required)
 * 
 * Body Parameters (all optional):
 * - name: Agent name (1-255 chars)
 * - description: Agent description
 * - status: Agent status (cannot change from/to terminated without special handling)
 * - capabilities: Array of capability strings
 * - llm_config: LLM configuration object (partial updates supported)
 * - limits: Agent limits object
 * 
 * Response: { data: Agent }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;
  const { id } = await params;

  try {
    // First, check if agent exists and is not terminated
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('id, status, tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingAgent) {
      return apiError('Agent not found', 404);
    }

    // Cannot modify terminated agents (except for specific admin operations)
    if (existingAgent.status === 'terminated') {
      return apiError('Cannot modify a terminated agent', 400);
    }

    const body = await request.json();

    // Validate request body
    const validationResult = updateAgentSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const updateData = validationResult.data;

    // Prevent changing status to/from terminated via normal update
    if (updateData.status === 'terminated') {
      return apiError(
        'Use DELETE endpoint to terminate an agent',
        400
      );
    }

    // If status is being changed to active, set activated_at
    const additionalData: Record<string, unknown> = {};
    if (updateData.status === 'active' || updateData.status === 'idle') {
      // Only set if not already set
      const { data: currentAgent } = await supabase
        .from('agents')
        .select('activated_at')
        .eq('id', id)
        .single();
      
      if (!currentAgent?.activated_at) {
        additionalData.activated_at = new Date().toISOString();
      }
    }

    // Update the agent
    const { data, error } = await supabase
      .from('agents')
      .update({
        ...updateData,
        ...additionalData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Agent PATCH error:', error);
      return apiError('Failed to update agent', 500, error.message);
    }

    return apiSuccess(data);
  } catch (err) {
    console.error('Agent PATCH exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * DELETE /api/agents/[id]
 * 
 * Soft-delete (terminate) an agent. This sets the status to 'terminated'
 * and records the termination time. Actual cleanup is handled by background jobs.
 * 
 * Path Parameters:
 * - id: Agent UUID (required)
 * 
 * Query Parameters:
 * - reason: Termination reason (optional)
 * - force: Force terminate even if agent has active tasks (optional, default: false)
 * 
 * Response: { data: { id, status, terminated_at } }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const reason = searchParams.get('reason') || undefined;
  const force = searchParams.get('force') === 'true';

  try {
    // Check if agent exists
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('id, status, tenant_id, current_task_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingAgent) {
      return apiError('Agent not found', 404);
    }

    // Check if already terminated
    if (existingAgent.status === 'terminated') {
      return apiError('Agent is already terminated', 400);
    }

    // Check for active tasks unless force is true
    if (!force && existingAgent.current_task_id) {
      return apiError(
        'Agent has an active task. Use force=true to terminate anyway.',
        409
      );
    }

    // Check for child agents
    const { data: children, error: childrenError } = await supabase
      .from('agents')
      .select('id')
      .eq('parent_id', id)
      .eq('tenant_id', tenantId)
      .neq('status', 'terminated');

    if (childrenError) {
      console.error('Error checking child agents:', childrenError);
      return apiError('Failed to check child agents', 500);
    }

    if (children && children.length > 0) {
      return apiError(
        `Cannot terminate agent with ${children.length} active child agent(s). Terminate children first.`,
        409
      );
    }

    // Perform soft delete (terminate)
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('agents')
      .update({
        status: 'terminated',
        status_reason: reason,
        terminated_at: now,
        updated_at: now,
        // Clear current task
        current_task_id: null,
        // Clear session
        session_id: null,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, status, terminated_at')
      .single();

    if (error) {
      console.error('Agent DELETE error:', error);
      return apiError('Failed to terminate agent', 500, error.message);
    }

    return apiSuccess({
      ...data,
      message: 'Agent terminated successfully',
    });
  } catch (err) {
    console.error('Agent DELETE exception:', err);
    return apiError('Internal server error', 500);
  }
}
