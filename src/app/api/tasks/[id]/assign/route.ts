import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requirePermission } from '@/lib/rbac';
import { assignTaskSchema, unassignTaskSchema } from '@/lib/validation';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/tasks/{id}/assign
 * Assign task to agent
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Check if task exists
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, status, assignee_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if already assigned to same agent
    if (existingTask.assignee_id === validatedData.assignee_id) {
      return NextResponse.json(
        { error: 'Task is already assigned to this agent' },
        { status: 409 }
      );
    }

    // Check terminal states
    const terminalStatuses = ['completed', 'failed', 'cancelled'];
    if (terminalStatuses.includes(existingTask.status)) {
      return NextResponse.json(
        { error: `Cannot assign task that is ${existingTask.status}` },
        { status: 400 }
      );
    }

    // Validate assignee exists and is active
    const { data: assignee, error: assigneeError } = await supabase
      .from('agents')
      .select('id, name, status')
      .eq('id', validatedData.assignee_id)
      .eq('tenant_id', tenantId)
      .single();

    if (assigneeError || !assignee) {
      return NextResponse.json({ error: 'Assignee agent not found' }, { status: 404 });
    }

    if (assignee.status === 'terminated' || assignee.status === 'error') {
      return NextResponse.json(
        { error: `Cannot assign task to agent with status '${assignee.status}'` },
        { status: 400 }
      );
    }

    // Update task
    const { data: task, error } = await supabase
      .from('tasks')
      .update({ assignee_id: validatedData.assignee_id })
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
      return NextResponse.json({ error: 'Failed to assign task' }, { status: 500 });
    }

    return apiSuccess(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return apiError('Internal server error', 500);
  }
}

/**
 * DELETE /api/tasks/{id}/assign
 * Unassign task from agent
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    const guard = requirePermission(userRole, 'tasks:assign');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // Check if task exists
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, status, assignee_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!existingTask.assignee_id) {
      return NextResponse.json(
        { error: 'Task is not currently assigned to any agent' },
        { status: 400 }
      );
    }

    // Check terminal states
    const terminalStatuses = ['completed', 'failed', 'cancelled'];
    if (terminalStatuses.includes(existingTask.status)) {
      return NextResponse.json(
        { error: `Cannot unassign task that is ${existingTask.status}` },
        { status: 400 }
      );
    }

    // Block in_progress tasks when unassigned
    let newStatus = existingTask.status;
    if (existingTask.status === 'in_progress') {
      newStatus = 'blocked';
    }

    // Update task
    const { data: task, error } = await supabase
      .from('tasks')
      .update({ assignee_id: null, status: newStatus })
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
      return NextResponse.json({ error: 'Failed to unassign task' }, { status: 500 });
    }

    return apiSuccess(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return apiError('Internal server error', 500);
  }
}
