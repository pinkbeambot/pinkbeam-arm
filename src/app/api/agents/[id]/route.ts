import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { updateAgentSchema } from '@/lib/validation';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * @openapi
 * /agents/{id}:
 *   get:
 *     summary: Get agent by ID
 *     description: Get a single agent by ID including related data (parent, children, current task, recent activities)
 *     tags:
 *       - Agents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Agent'
 *                     - type: object
 *                       properties:
 *                         recent_tasks:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Task'
 *                         recent_decisions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Decision'
 *                         recent_escalations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Escalation'
 *                         recent_activities:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Activity'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Tenant not found
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Fetch agent with all related data
    const { data: agent, error } = await supabase
      .from('agents')
      .select(
        `
        *,
        parent:parent_id(id, name, avatar_url, role, status),
        children:agents!parent_id(id, name, avatar_url, role, status),
        current_task:current_task_id(id, title, status, priority),
        root:root_id(id, name, avatar_url, role)
      `
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      console.error('Error fetching agent:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agent', details: error.message },
        { status: 500 }
      );
    }

    // Fetch recent tasks assigned to this agent
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, created_at, completed_at')
      .eq('assignee_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent decisions made by this agent
    const { data: recentDecisions } = await supabase
      .from('decisions')
      .select('id, title, status, confidence, proposed_at, category')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .order('proposed_at', { ascending: false })
      .limit(10);

    // Fetch recent escalations raised by this agent
    const { data: recentEscalations } = await supabase
      .from('escalations')
      .select('id, title, status, urgency, created_at, type')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent activities for this agent
    const { data: recentActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      data: {
        ...agent,
        children: agent.children || [],
        parent: agent.parent || undefined,
        root: agent.root || undefined,
        current_task: agent.current_task || undefined,
        recent_tasks: recentTasks || [],
        recent_decisions: recentDecisions || [],
        recent_escalations: recentEscalations || [],
        recent_activities: recentActivities || [],
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/agents/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /agents/{id}:
 *   patch:
 *     summary: Update an agent
 *     description: Update agent properties. Status changes are tracked with timestamps (activated_at, terminated_at).
 *     tags:
 *       - Agents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAgentInput'
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Tenant not found
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateAgentSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Check if agent exists and belongs to tenant
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Set timestamps based on status changes
    const updateData: Record<string, unknown> = { ...validatedData };

    // Track when agent was activated (transitioned to idle or active from initializing)
    if (
      (validatedData.status === 'idle' || validatedData.status === 'active') &&
      existingAgent.status === 'initializing'
    ) {
      updateData.activated_at = new Date().toISOString();
    }

    // Track when agent was terminated
    if (validatedData.status === 'terminated' && existingAgent.status !== 'terminated') {
      updateData.terminated_at = new Date().toISOString();
    }

    // Update the agent
    const { data: agent, error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(
        `
        *,
        parent:parent_id(id, name, avatar_url, role, status),
        children:agents!parent_id(id, name, avatar_url, role, status),
        current_task:current_task_id(id, title, status, priority)
      `
      )
      .single();

    if (error) {
      console.error('Error updating agent:', error);
      return NextResponse.json(
        { error: 'Failed to update agent', details: error.message },
        { status: 500 }
      );
    }

    // Activity logging is handled by database triggers

    return NextResponse.json({ data: agent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in PATCH /api/agents/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /agents/{id}:
 *   delete:
 *     summary: Delete an agent
 *     description: Delete an agent. Cannot delete agents that are active, have children, or have in-progress tasks.
 *     tags:
 *       - Agents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deleted_agent:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: Cannot delete agent (has children, active tasks, or is active)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Tenant not found
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Check if agent exists and get its status
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('id, status, name')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if agent has children
    const { data: children, error: childrenError } = await supabase
      .from('agents')
      .select('id')
      .eq('parent_id', id)
      .eq('tenant_id', tenantId)
      .limit(1);

    if (childrenError) {
      console.error('Error checking agent children:', childrenError);
      return NextResponse.json(
        { error: 'Failed to check agent dependencies', details: childrenError.message },
        { status: 500 }
      );
    }

    if (children && children.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete agent with children',
          message: 'Please terminate or reassign all child agents before deleting.',
        },
        { status: 400 }
      );
    }

    // Check if agent is actively working on a task
    const { data: activeTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .eq('assignee_id', id)
      .eq('status', 'in_progress')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (tasksError) {
      console.error('Error checking agent tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to check agent tasks', details: tasksError.message },
        { status: 500 }
      );
    }

    if (activeTasks && activeTasks.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete agent with active tasks',
          message: 'Please complete or reassign all active tasks before deleting.',
        },
        { status: 400 }
      );
    }

    // Prevent deletion of certain statuses unless forced
    const protectedStatuses = ['active'];
    if (protectedStatuses.includes(existingAgent.status)) {
      return NextResponse.json(
        {
          error: 'Cannot delete active agent',
          message: 'Please pause or terminate the agent before deleting.',
        },
        { status: 400 }
      );
    }

    // Delete the agent
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting agent:', error);
      return NextResponse.json(
        { error: 'Failed to delete agent', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Agent deleted successfully',
        deleted_agent: {
          id,
          name: existingAgent.name,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/agents/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
