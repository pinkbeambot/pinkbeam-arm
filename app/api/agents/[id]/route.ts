import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateAgentSchema } from '@/lib/validation';

/**
 * GET /api/agents/[id]
 *
 * Get a single agent by ID with full details.
 * Includes parent agent info, child agents count, active tasks count, and recent activities.
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
    // Fetch agent with parent info, child count, and current task
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
      .is('deleted_at', null)
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

    // Get active tasks count
    const { count: activeTasksCount, error: tasksError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assignee_id', id)
      .eq('tenant_id', tenantId)
      .in('status', ['queued', 'in_progress', 'blocked', 'review']);

    if (tasksError) {
      console.error('Error counting active tasks:', tasksError);
    }

    // Get recent activities (last 10)
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) {
      console.error('Error fetching recent activities:', activitiesError);
    }

    // Build response with enriched data
    const response = {
      ...agent,
      active_tasks_count: activeTasksCount || 0,
      recent_activities: recentActivities || [],
    };

    return apiSuccess(response);
  } catch (err) {
    console.error('Agent GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * PATCH /api/agents/[id]
 *
 * Update an agent's properties. Partial updates are supported.
 * Cannot update terminated or deleted agents.
 * Cannot change role from 'system'.
 * Cannot change parent_id to create circular hierarchy.
 *
 * Path Parameters:
 * - id: Agent UUID (required)
 *
 * Body Parameters (all optional):
 * - name: Agent name (1-255 chars)
 * - description: Agent description (max 2000 chars)
 * - status: Agent status (cannot change from/to terminated via this endpoint)
 * - status_reason: Reason for status change (max 500 chars)
 * - capabilities: Array of capability strings
 * - llm_config: LLM configuration object (partial updates supported)
 * - limits: Agent limits object
 * - config: Additional configuration object
 * - avatar_url: Agent avatar URL
 * - parent_id: Parent agent ID (hierarchical change - validated for circular references)
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
    // First, check if agent exists and is not deleted
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('id, status, tenant_id, role, parent_id, root_id, depth, activated_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingAgent) {
      return apiError('Agent not found', 404);
    }

    // Cannot modify terminated agents
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

    // Prevent changing role from 'system'
    if (updateData.role && existingAgent.role === 'system') {
      return apiError('Cannot change role of a system agent', 403);
    }

    // Prevent changing status to/from terminated via normal update
    if (updateData.status === 'terminated') {
      return apiError(
        'Use DELETE endpoint to terminate an agent',
        400
      );
    }

    // Validate parent_id doesn't create circular hierarchy
    if (updateData.parent_id !== undefined) {
      // Cannot set parent to self
      if (updateData.parent_id === id) {
        return apiError('An agent cannot be its own parent', 400);
      }

      // If setting parent_id to null (removing from hierarchy), it's allowed
      if (updateData.parent_id !== null) {
        // Verify new parent exists and belongs to tenant
        const { data: newParent, error: parentError } = await supabase
          .from('agents')
          .select('id, tenant_id, root_id, depth, limits')
          .eq('id', updateData.parent_id)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .single();

        if (parentError || !newParent) {
          return apiError('Parent agent not found or access denied', 404);
        }

        // Check for circular hierarchy - new parent cannot be a descendant of this agent
        const { data: descendants, error: descendantsError } = await supabase
          .rpc('get_agent_descendants', { p_agent_id: id });

        if (descendantsError) {
          console.error('Error checking descendants:', descendantsError);
          return apiError('Failed to validate hierarchy', 500);
        }

        const descendantIds = descendants?.map((d: { id: string }) => d.id) || [];
        if (descendantIds.includes(updateData.parent_id)) {
          return apiError(
            'Cannot set parent to a descendant agent (would create circular hierarchy)',
            400
          );
        }

        // Check parent's max_sub_agents limit
        const { count: siblingCount, error: siblingError } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', updateData.parent_id)
          .neq('id', id) // Exclude current agent if moving
          .is('deleted_at', null);

        if (siblingError) {
          console.error('Error counting siblings:', siblingError);
          return apiError('Failed to verify parent limits', 500);
        }

        const parentMaxSubAgents = newParent.limits?.max_sub_agents || 5;
        if (siblingCount !== null && siblingCount >= parentMaxSubAgents) {
          return apiError(
            `Parent agent has reached its maximum of ${parentMaxSubAgents} sub-agents`,
            403
          );
        }

        // Calculate new depth and root_id
        updateData.depth = (newParent.depth || 0) + 1;
        updateData.root_id = newParent.root_id || newParent.id;
      } else {
        // Removing from hierarchy
        updateData.depth = 0;
        updateData.root_id = null;
      }
    }

    // Track status changes for activity logging
    const statusChanged = updateData.status && updateData.status !== existingAgent.status;

    // If status is being changed to active or idle, set activated_at if not already set
    const additionalData: Record<string, unknown> = {};
    if ((updateData.status === 'active' || updateData.status === 'idle') && !existingAgent.activated_at) {
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

    // Log status change activity if applicable
    if (statusChanged) {
      await supabase.from('activities').insert({
        tenant_id: tenantId,
        type: 'agent.status_changed',
        category: 'agent',
        actor_type: 'user',
        actor_id: userId,
        target_type: 'agents',
        target_id: id,
        title: 'Agent status changed',
        description: `Agent status changed from ${existingAgent.status} to ${updateData.status}`,
        agent_id: id,
        metadata: {
          previous_status: existingAgent.status,
          new_status: updateData.status,
          reason: updateData.status_reason,
        },
      });
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
 * Soft-delete (terminate) an agent. This sets the status to 'terminated',
 * records the termination time, and sets deleted_at timestamp.
 * Cannot terminate if agent has active tasks or active child agents.
 *
 * Path Parameters:
 * - id: Agent UUID (required)
 *
 * Query Parameters:
 * - reason: Termination reason (optional)
 * - force: Force terminate even if agent has active tasks (optional, default: false)
 *
 * Response: 204 No Content on success
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
      .select('id, status, tenant_id, current_task_id, name')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingAgent) {
      return apiError('Agent not found', 404);
    }

    // Check if already terminated or deleted
    if (existingAgent.status === 'terminated') {
      return apiError('Agent is already terminated', 400);
    }

    // Check for active tasks unless force is true
    if (!force) {
      const { data: activeTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('assignee_id', id)
        .eq('tenant_id', tenantId)
        .in('status', ['in_progress', 'queued']);

      if (tasksError) {
        console.error('Error checking active tasks:', tasksError);
        return apiError('Failed to check active tasks', 500);
      }

      if (activeTasks && activeTasks.length > 0) {
        return apiError(
          `Agent has ${activeTasks.length} active task(s). Use force=true to terminate anyway.`,
          409,
          { activeTasks: activeTasks.map(t => ({ id: t.id, title: t.title, status: t.status })) }
        );
      }
    }

    // Check for active child agents
    const { data: children, error: childrenError } = await supabase
      .from('agents')
      .select('id, name, status')
      .eq('parent_id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .neq('status', 'terminated');

    if (childrenError) {
      console.error('Error checking child agents:', childrenError);
      return apiError('Failed to check child agents', 500);
    }

    if (children && children.length > 0) {
      return apiError(
        `Cannot terminate agent with ${children.length} active child agent(s). Terminate children first.`,
        409,
        { children: children.map(c => ({ id: c.id, name: c.name, status: c.status })) }
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
        deleted_at: now,
        updated_at: now,
        // Clear current task
        current_task_id: null,
        // Clear session
        session_id: null,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, status, terminated_at, deleted_at')
      .single();

    if (error) {
      console.error('Agent DELETE error:', error);
      return apiError('Failed to terminate agent', 500, error.message);
    }

    // Log termination in activities
    await supabase.from('activities').insert({
      tenant_id: tenantId,
      type: 'agent.terminated',
      category: 'agent',
      actor_type: 'user',
      actor_id: userId,
      target_type: 'agents',
      target_id: id,
      title: 'Agent terminated',
      description: `Agent "${existingAgent.name}" was terminated${reason ? `: ${reason}` : ''}`,
      agent_id: id,
      metadata: {
        reason,
        force,
        previous_status: existingAgent.status,
      },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('Agent DELETE exception:', err);
    return apiError('Internal server error', 500);
  }
}
