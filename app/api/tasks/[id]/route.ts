/**
 * Single Task API Route
 * 
 * GET    /api/tasks/[id] - Get single task with dependencies
 * PATCH  /api/tasks/[id] - Update task
 * DELETE /api/tasks/[id] - Soft delete (cancel) task
 * 
 * Features:
 * - Full task details with dependencies
 * - Status transition validation
 * - Soft delete (status change to cancelled)
 * - RLS tenant isolation
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateTaskSchema, taskIdParamSchema } from '@/lib/validation';
import type { TaskStatus } from '@/lib/database';

/**
 * Valid status transitions
 * Tasks can only move between certain states
 */
const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  queued: ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['blocked', 'review', 'completed', 'failed', 'cancelled'],
  blocked: ['queued', 'in_progress', 'cancelled'],
  review: ['completed', 'failed', 'in_progress', 'cancelled'],
  completed: [], // Terminal state
  failed: ['queued', 'in_progress', 'cancelled'], // Can retry
  cancelled: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true; // Same status is always valid
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) || false;
}

/**
 * GET /api/tasks/[id]
 * 
 * Get a single task by ID with full details including dependencies.
 * 
 * Path Parameters:
 * - id: Task UUID (required)
 * 
 * Response: { data: Task }
 * Includes:
 * - Task details
 * - Dependencies (tasks this task depends on)
 * - Dependents (tasks that depend on this task)
 * - Subtasks (child tasks)
 * - Assignee info
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
    // Validate task ID
    const idValidation = taskIdParamSchema.safeParse({ id });
    if (!idValidation.success) {
      return apiError('Invalid task ID format', 400);
    }

    // Fetch task with dependencies, dependents, subtasks, and assignee
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:assignee_id(id, name, role, status),
        dependencies:task_dependencies!task_id(
          id,
          dependency_type,
          depends_on_task_id,
          depends_on:depends_on_task_id(id, title, status, priority)
        ),
        dependents:task_dependencies!depends_on_task_id(
          id,
          dependency_type,
          task_id,
          dependent_task:task_id(id, title, status, priority)
        ),
        subtasks:tasks!parent_task_id(id, title, status, priority, assignee_id)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('Task GET error:', error);
      
      if (error.code === 'PGRST116') {
        return apiError('Task not found', 404);
      }
      
      return apiError('Failed to fetch task', 500, error.message);
    }

    if (!task) {
      return apiError('Task not found', 404);
    }

    return apiSuccess(task);
  } catch (err) {
    console.error('Task GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * PATCH /api/tasks/[id]
 * 
 * Update a task's properties. Partial updates are supported.
 * Status transitions are validated against allowed workflows.
 * 
 * Path Parameters:
 * - id: Task UUID (required)
 * 
 * Body Parameters (all optional):
 * - title: Task title (1-500 chars)
 * - description: Task description
 * - status: Task status (validated against workflow)
 * - assignee_id: Assigned agent ID (null to unassign)
 * - priority: Task priority (low, normal, high, urgent)
 * - progress_percent: Progress 0-100
 * - current_step: Current execution step
 * - outputs: Task outputs as JSON
 * - deadline_at: Due date (null to clear)
 * 
 * Response: { data: Task }
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
    // Validate task ID
    const idValidation = taskIdParamSchema.safeParse({ id });
    if (!idValidation.success) {
      return apiError('Invalid task ID format', 400);
    }

    // First, check if task exists and get current state
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status, tenant_id, started_at, completed_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingTask) {
      return apiError('Task not found', 404);
    }

    // Cannot modify completed or cancelled tasks
    if (existingTask.status === 'completed' || existingTask.status === 'cancelled') {
      return apiError(
        `Cannot modify a ${existingTask.status} task. Create a new task instead.`,
        400
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = updateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const updateData = validationResult.data;

    // Validate status transition if status is being changed
    if (updateData.status && updateData.status !== existingTask.status) {
      if (!isValidStatusTransition(existingTask.status, updateData.status)) {
        return apiError(
          `Invalid status transition from "${existingTask.status}" to "${updateData.status}"`,
          400
        );
      }
    }

    // If assignee_id is provided, verify the agent exists
    if (updateData.assignee_id !== undefined) {
      if (updateData.assignee_id) {
        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .select('id, tenant_id')
          .eq('id', updateData.assignee_id)
          .eq('tenant_id', tenantId)
          .single();

        if (agentError || !agent) {
          return apiError('Assignee agent not found or access denied', 404);
        }
      }
    }

    // Prepare additional data based on status changes
    const additionalData: Record<string, unknown> = {};
    
    // Track timestamps for status changes
    if (updateData.status === 'in_progress' && !existingTask.started_at) {
      additionalData.started_at = new Date().toISOString();
    }
    
    if (updateData.status === 'completed' && !existingTask.completed_at) {
      additionalData.completed_at = new Date().toISOString();
      // Auto-set progress to 100% when completed
      if (updateData.progress_percent === undefined) {
        additionalData.progress_percent = 100;
      }
    }

    // Update the task
    const { data, error } = await supabase
      .from('tasks')
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
      console.error('Task PATCH error:', error);
      return apiError('Failed to update task', 500, error.message);
    }

    return apiSuccess(data);
  } catch (err) {
    console.error('Task PATCH exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * DELETE /api/tasks/[id]
 * 
 * Soft-delete (cancel) a task. This sets the status to 'cancelled'
 * rather than actually deleting the record.
 * 
 * Path Parameters:
 * - id: Task UUID (required)
 * 
 * Query Parameters:
 * - cascade: Cancel subtasks as well (optional, default: false)
 * - force: Force cancel even if in_progress (optional, default: false)
 * 
 * Response: { data: { id, status, cancelled_at } }
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
  const cascade = searchParams.get('cascade') === 'true';
  const force = searchParams.get('force') === 'true';

  try {
    // Validate task ID
    const idValidation = taskIdParamSchema.safeParse({ id });
    if (!idValidation.success) {
      return apiError('Invalid task ID format', 400);
    }

    // Check if task exists
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status, tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingTask) {
      return apiError('Task not found', 404);
    }

    // Check if already cancelled
    if (existingTask.status === 'cancelled') {
      return apiError('Task is already cancelled', 400);
    }

    // Check if already completed
    if (existingTask.status === 'completed') {
      return apiError('Cannot cancel a completed task', 400);
    }

    // Warn about cancelling in_progress tasks
    if (!force && existingTask.status === 'in_progress') {
      return apiError(
        'Task is currently in progress. Use force=true to cancel anyway.',
        409
      );
    }

    const now = new Date().toISOString();

    // If cascade is true, cancel all subtasks first
    if (cascade) {
      const { error: subtaskError } = await supabase
        .from('tasks')
        .update({
          status: 'cancelled',
          updated_at: now,
        })
        .eq('parent_task_id', id)
        .eq('tenant_id', tenantId)
        .not('status', 'in', '(completed,cancelled)');

      if (subtaskError) {
        console.error('Error cancelling subtasks:', subtaskError);
        return apiError('Failed to cancel subtasks', 500);
      }
    }

    // Perform soft delete (cancel)
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, status, updated_at')
      .single();

    if (error) {
      console.error('Task DELETE error:', error);
      return apiError('Failed to cancel task', 500, error.message);
    }

    return apiSuccess({
      ...data,
      message: 'Task cancelled successfully',
      cascade,
    });
  } catch (err) {
    console.error('Task DELETE exception:', err);
    return apiError('Internal server error', 500);
  }
}
