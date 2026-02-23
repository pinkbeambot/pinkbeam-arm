import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requirePermission } from '@/lib/rbac';
import { assignTaskSchema, unassignTaskSchema } from '@/lib/validation/task';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * @openapi
 * /tasks/{id}/assign:
 *   post:
 *     summary: Assign task to agent
 *     description: Assign a task to a specific agent. The agent must belong to the same tenant.
 *     tags:
 *       - Tasks
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignee_id
 *             properties:
 *               assignee_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the agent to assign the task to
 *               note:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional note about the assignment
 *     responses:
 *       200:
 *         description: Task assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error or invalid assignee
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user does not have permission to assign tasks
 *       404:
 *         description: Task or agent not found
 *       409:
 *         description: Task is already assigned to this agent
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = assignTaskSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    // RBAC: Check if user can assign tasks
    const guard = requirePermission(userRole, 'tasks:assign');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // Check if task exists and belongs to tenant
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, status, assignee_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task is already assigned to the same agent
    if (existingTask.assignee_id === validatedData.assignee_id) {
      return NextResponse.json(
        { error: 'Task is already assigned to this agent' },
        { status: 409 }
      );
    }

    // Check if task can be assigned (not in terminal states)
    const terminalStatuses = ['completed', 'failed', 'cancelled'];
    if (terminalStatuses.includes(existingTask.status)) {
      return NextResponse.json(
        { error: `Cannot assign task that is ${existingTask.status}` },
        { status: 400 }
      );
    }

    // Validate assignee exists and belongs to tenant
    const { data: assignee, error: assigneeError } = await supabase
      .from('agents')
      .select('id, name, status')
      .eq('id', validatedData.assignee_id)
      .eq('tenant_id', tenantId)
      .single();

    if (assigneeError || !assignee) {
      return NextResponse.json(
        { error: 'Assignee agent not found' },
        { status: 404 }
      );
    }

    // Check if assignee is active
    if (assignee.status === 'terminated' || assignee.status === 'error') {
      return NextResponse.json(
        { error: `Cannot assign task to agent with status '${assignee.status}'` },
        { status: 400 }
      );
    }

    // Update the task with new assignee
    const { data: task, error } = await supabase
      .from('tasks')
      .update({
        assignee_id: validatedData.assignee_id,
        // If task was queued and now assigned, it can start
        status: existingTask.status === 'queued' ? 'queued' : existingTask.status,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        assignee:assignee_id(id, name, avatar_url, status, role),
        assigner:assigner_id(id, name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error assigning task:', error);
      return NextResponse.json(
        { error: 'Failed to assign task' },
        { status: 500 }
      );
    }

    // Activity logging is handled by database triggers

    return apiSuccess(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/tasks/:id/assign:', error);
    return apiError('Internal server error', 500);
  }
}

/**
 * @openapi
 * /tasks/{id}/assign:
 *   delete:
 *     summary: Unassign task from agent
 *     description: Remove the current assignment from a task, returning it to unassigned state.
 *     tags:
 *       - Tasks
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional reason for unassignment
 *     responses:
 *       200:
 *         description: Task unassigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Task is not currently assigned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user does not have permission to assign tasks
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse optional request body
    let validatedData: z.infer<typeof unassignTaskSchema> = {};
    try {
      const body = await request.json();
      validatedData = unassignTaskSchema.parse(body);
    } catch {
      // Body is optional for DELETE
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    // RBAC: Check if user can assign tasks
    const guard = requirePermission(userRole, 'tasks:assign');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // Check if task exists and belongs to tenant
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, status, assignee_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task is currently assigned
    if (!existingTask.assignee_id) {
      return NextResponse.json(
        { error: 'Task is not currently assigned to any agent' },
        { status: 400 }
      );
    }

    // Check if task can be unassigned (not in terminal states)
    const terminalStatuses = ['completed', 'failed', 'cancelled'];
    if (terminalStatuses.includes(existingTask.status)) {
      return NextResponse.json(
        { error: `Cannot unassign task that is ${existingTask.status}` },
        { status: 400 }
      );
    }

    // If task is in_progress, we should probably pause or block it
    let newStatus = existingTask.status;
    if (existingTask.status === 'in_progress') {
      newStatus = 'blocked'; // Block until reassigned
    }

    // Update the task to remove assignee
    const { data: task, error } = await supabase
      .from('tasks')
      .update({
        assignee_id: null,
        status: newStatus,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        assignee:assignee_id(id, name, avatar_url, status, role),
        assigner:assigner_id(id, name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error unassigning task:', error);
      return NextResponse.json(
        { error: 'Failed to unassign task' },
        { status: 500 }
      );
    }

    // Activity logging is handled by database triggers

    return apiSuccess(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in DELETE /api/tasks/:id/assign:', error);
    return apiError('Internal server error', 500);
  }
}
