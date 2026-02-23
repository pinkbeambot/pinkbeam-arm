import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import {
  batchCreateTaskSchema,
  batchUpdateTaskSchema,
  batchDeleteTaskSchema,
} from '@/lib/validation';
import { z } from 'zod';

/**
 * POST /api/tasks/batch
 * Create multiple tasks in a batch
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Parse and validate request body
    const body = await request.json();
    const { tasks: tasksToCreate } = batchCreateTaskSchema.parse(body);

    // Extract and validate assignees and parent tasks in parallel
    const assigneeIds = [...new Set(tasksToCreate
      .map(t => t.assignee_id)
      .filter(Boolean))];

    const parentIds = [...new Set(tasksToCreate
      .map(t => t.parent_task_id)
      .filter(Boolean))];

    const parentDepths: Record<string, number> = {};

    // Parallelize validation queries
    const [assigneeResult, parentResult] = await Promise.all([
      assigneeIds.length > 0
        ? supabase
            .from('agents')
            .select('id')
            .in('id', assigneeIds)
            .eq('tenant_id', tenantId)
        : Promise.resolve({ data: [], error: null }),
      parentIds.length > 0
        ? supabase
            .from('tasks')
            .select('id, depth')
            .in('id', parentIds)
            .eq('tenant_id', tenantId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Handle assignee validation
    if (assigneeResult.error) {
      console.error('Failed to validate assignees:', assigneeResult.error);
      return NextResponse.json(
        { error: 'Failed to validate assignees' },
        { status: 500 }
      );
    }

    if (assigneeIds.length > 0) {
      const validAssigneeIds = new Set(assigneeResult.data?.map(a => a.id) || []);
      const invalidAssignees = assigneeIds.filter(id => !validAssigneeIds.has(id));

      if (invalidAssignees.length > 0) {
        return NextResponse.json(
          { error: 'Invalid assignees', invalid_assignees: invalidAssignees },
          { status: 400 }
        );
      }
    }

    // Handle parent task validation
    if (parentResult.error) {
      console.error('Failed to validate parent tasks:', parentResult.error);
      return NextResponse.json(
        { error: 'Failed to validate parent tasks' },
        { status: 500 }
      );
    }

    if (parentIds.length > 0) {
      const validParentIds = new Set(parentResult.data?.map(p => p.id) || []);
      const invalidParents = parentIds.filter(id => !validParentIds.has(id));

      if (invalidParents.length > 0) {
        return NextResponse.json(
          { error: 'Invalid parent tasks', invalid_parents: invalidParents },
          { status: 400 }
        );
      }

      // Build depth map
      parentResult.data?.forEach(p => {
        parentDepths[p.id] = p.depth || 0;
      });
    }

    // Prepare tasks with tenant_id and depth
    const tasksWithTenant = tasksToCreate.map(task => ({
      ...task,
      tenant_id: tenantId,
      assigner_id: userId,
      depth: task.parent_task_id ? (parentDepths[task.parent_task_id] || 0) + 1 : 0,
    }));

    // Create tasks
    const { data: createdTasks, error } = await supabase
      .from('tasks')
      .insert(tasksWithTenant)
      .select(`
        *,
        assignee:assignee_id(id, name, avatar_url, status, role),
        assigner:assigner_id(id, name, avatar_url)
      `);

    if (error) {
      console.error('Error creating tasks in batch:', error);
      return NextResponse.json(
        { error: 'Failed to create tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: createdTasks,
      meta: {
        created_count: createdTasks?.length || 0,
        requested_count: tasksToCreate.length,
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/tasks/batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/batch
 * Update multiple tasks in a batch
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse and validate request body
    const body = await request.json();
    const { tasks: tasksToUpdate } = batchUpdateTaskSchema.parse(body);

    // Get all task IDs
    const taskIds = tasksToUpdate.map(t => t.id);

    // Verify all tasks exist and belong to tenant
    const { data: existingTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status')
      .in('id', taskIds)
      .eq('tenant_id', tenantId);

    if (fetchError) {
      console.error('Failed to verify tasks:', fetchError);
      return NextResponse.json(
        { error: 'Failed to verify tasks' },
        { status: 500 }
      );
    }

    const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
    const notFoundIds = taskIds.filter(id => !existingTaskIds.has(id));

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        { error: 'Tasks not found', not_found_ids: notFoundIds },
        { status: 404 }
      );
    }

    // Build existing task status map for transition tracking
    const taskStatusMap = new Map(existingTasks?.map(t => [t.id, t.status]));

    // Validate assignees if any updates include assignee_id
    const assigneeUpdates = tasksToUpdate.filter(t => t.data.assignee_id);
    if (assigneeUpdates.length > 0) {
      const assigneeIds = [...new Set(assigneeUpdates.map(t => t.data.assignee_id))];
      const { data: validAssignees, error: assigneeError } = await supabase
        .from('agents')
        .select('id')
        .in('id', assigneeIds as string[])
        .eq('tenant_id', tenantId);

      if (assigneeError) {
        console.error('Failed to validate assignees:', assigneeError);
        return NextResponse.json(
          { error: 'Failed to validate assignees' },
          { status: 500 }
        );
      }

      const validAssigneeIds = new Set(validAssignees?.map(a => a.id) || []);
      const invalidAssignees = assigneeIds.filter(id => !validAssigneeIds.has(id as string));

      if (invalidAssignees.length > 0) {
        return NextResponse.json(
          { error: 'Invalid assignees', invalid_assignees: invalidAssignees },
          { status: 400 }
        );
      }
    }

    // Prepare update data with timestamp tracking for all tasks
    const tasksWithTimestamps = tasksToUpdate.map(({ id, data }) => {
      const updateData: Record<string, unknown> = { ...data };
      const currentStatus = taskStatusMap.get(id);

      if (data.status === 'in_progress' && currentStatus === 'queued') {
        updateData.started_at = new Date().toISOString();
      }

      if (
        ['completed', 'failed', 'cancelled'].includes(data.status || '') &&
        !['completed', 'failed', 'cancelled'].includes(currentStatus || '')
      ) {
        updateData.completed_at = new Date().toISOString();
      }

      return { id, updateData };
    });

    // Update all tasks in parallel
    const updatePromises = tasksWithTimestamps.map(({ id, updateData }) =>
      supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select(`
          *,
          assignee:assignee_id(id, name, avatar_url, status, role),
          assigner:assigner_id(id, name, avatar_url)
        `)
        .single()
    );

    const updateResults = await Promise.allSettled(updatePromises);

    const results: unknown[] = [];
    const errors: { id: string; error: string }[] = [];

    updateResults.forEach((result, index) => {
      const taskId = tasksWithTimestamps[index].id;
      if (result.status === 'fulfilled') {
        const { data: updatedTask, error: updateError } = result.value;
        if (updateError) {
          errors.push({ id: taskId, error: updateError.message });
        } else {
          results.push(updatedTask);
        }
      } else {
        errors.push({ id: taskId, error: result.reason?.message || 'Unknown error' });
      }
    });

    return NextResponse.json({
      data: results,
      meta: {
        updated_count: results.length,
        failed_count: errors.length,
        total_count: tasksToUpdate.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in PATCH /api/tasks/batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/batch
 * Delete multiple tasks in a batch
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse request body (DELETE can have body in Next.js)
    const body = await request.json();
    const { ids: taskIds, force } = batchDeleteTaskSchema.parse(body);

    // Verify all tasks exist and belong to tenant
    const { data: existingTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status, title')
      .in('id', taskIds)
      .eq('tenant_id', tenantId);

    if (fetchError) {
      console.error('Failed to verify tasks:', fetchError);
      return NextResponse.json(
        { error: 'Failed to verify tasks' },
        { status: 500 }
      );
    }

    const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
    const notFoundIds = taskIds.filter(id => !existingTaskIds.has(id));

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        { error: 'Tasks not found', not_found_ids: notFoundIds },
        { status: 404 }
      );
    }

    // Check for in-progress tasks unless force is true
    if (!force) {
      const inProgressTasks = existingTasks?.filter(t => t.status === 'in_progress') || [];
      if (inProgressTasks.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete in-progress tasks',
            message: 'Some tasks are in progress. Set force=true to override or cancel them first.',
            in_progress_tasks: inProgressTasks.map(t => ({ id: t.id, title: t.title }))
          },
          { status: 400 }
        );
      }
    }

    // Delete tasks (cascades to dependencies)
    const { data: deletedTasks, error } = await supabase
      .from('tasks')
      .delete()
      .in('id', taskIds)
      .eq('tenant_id', tenantId)
      .select('id, title, status');

    if (error) {
      console.error('Error deleting tasks in batch:', error);
      return NextResponse.json(
        { error: 'Failed to delete tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        deleted_count: deletedTasks?.length || 0,
        deleted_tasks: deletedTasks,
        force_applied: force,
      },
      meta: {
        requested_count: taskIds.length,
        not_found_count: notFoundIds.length,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in DELETE /api/tasks/batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
