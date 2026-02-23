/**
 * Task Status API Route
 * 
 * POST /api/tasks/[id]/status - Update task status with workflow enforcement
 * 
 * Features:
 * - Status transition validation
 * - Automatic timestamp tracking
 * - Progress updates
 * - Activity logging
 * - RLS tenant isolation
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { taskStatusTransitionSchema, taskIdParamSchema } from '@/lib/validation';
import type { TaskStatus } from '@/lib/database';

/**
 * Valid status transitions
 * Tasks can only move between certain states based on workflow rules
 */
const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  queued: ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['blocked', 'review', 'completed', 'failed', 'cancelled'],
  blocked: ['queued', 'in_progress', 'cancelled'],
  review: ['completed', 'failed', 'in_progress', 'cancelled'],
  completed: [], // Terminal state - no transitions allowed
  failed: ['queued', 'in_progress', 'cancelled'], // Can retry
  cancelled: [], // Terminal state - no transitions allowed
};

/**
 * Check if a status transition is valid
 */
function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) || false;
}

/**
 * Human-readable status descriptions
 */
const STATUS_DESCRIPTIONS: Record<TaskStatus, string> = {
  queued: 'Task is waiting to be started',
  in_progress: 'Task is actively being worked on',
  blocked: 'Task is blocked by dependencies or issues',
  review: 'Task is completed and awaiting review',
  completed: 'Task has been successfully completed',
  failed: 'Task has failed and may need retry',
  cancelled: 'Task has been cancelled',
};

/**
 * POST /api/tasks/[id]/status
 * 
 * Update a task's status with workflow validation.
 * 
 * Path Parameters:
 * - id: Task UUID (required)
 * 
 * Body Parameters:
 * - status: New status (required)
 *   - queued: Task is waiting
 *   - in_progress: Task is being worked on
 *   - blocked: Task is blocked
 *   - review: Task is under review
 *   - completed: Task is complete
 *   - failed: Task has failed
 *   - cancelled: Task is cancelled
 * - reason: Optional reason for the status change
 * - progress_percent: Optional progress update (0-100)
 * 
 * Workflow Rules:
 * - queued → in_progress, blocked, cancelled
 * - in_progress → blocked, review, completed, failed, cancelled
 * - blocked → queued, in_progress, cancelled
 * - review → completed, failed, in_progress, cancelled
 * - completed → (terminal, no transitions)
 * - failed → queued, in_progress, cancelled (retry allowed)
 * - cancelled → (terminal, no transitions)
 * 
 * Automatic Actions:
 * - When status becomes 'in_progress': sets started_at timestamp
 * - When status becomes 'completed': sets completed_at and progress_percent=100
 * 
 * Response: { data: Task, meta: { previous_status, transition_valid } }
 */
export async function POST(
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

    // Validate request body
    const body = await request.json();
    const validationResult = taskStatusTransitionSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { status: newStatus, reason } = validationResult.data;

    // Fetch current task state
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status, tenant_id, started_at, completed_at, assignee_id, title')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingTask) {
      return apiError('Task not found', 404);
    }

    const currentStatus = existingTask.status as TaskStatus;

    // Check for same status (no-op)
    if (newStatus === currentStatus) {
      return apiSuccess({
        ...existingTask,
        meta: {
          previous_status: currentStatus,
          new_status: newStatus,
          transition_valid: true,
          no_change: true,
        },
      });
    }

    // Validate status transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      return apiError(
        `Invalid status transition from "${currentStatus}" to "${newStatus}". ` +
        `Allowed transitions from ${currentStatus}: ${VALID_STATUS_TRANSITIONS[currentStatus]?.join(', ') || 'none'}`,
        400
      );
    }

    // Additional validation rules

    // Cannot transition from terminal states
    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      return apiError(
        `Cannot change status of a ${currentStatus} task`,
        400
      );
    }

    // To start in_progress, task should ideally have an assignee
    if (newStatus === 'in_progress' && !existingTask.assignee_id) {
      // This is a warning but we allow it - task can be picked up
      console.warn(`Task ${id} is being started without an assignee`);
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set timestamps based on status
    if (newStatus === 'in_progress' && !existingTask.started_at) {
      updateData.started_at = new Date().toISOString();
    }

    if (newStatus === 'completed' && !existingTask.completed_at) {
      updateData.completed_at = new Date().toISOString();
      updateData.progress_percent = 100;
    }

    // If progress_percent provided, use it
    if (body.progress_percent !== undefined) {
      const progress = Math.max(0, Math.min(100, Math.round(body.progress_percent)));
      updateData.progress_percent = progress;
    }

    // Update the task
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Task status update error:', error);
      return apiError('Failed to update task status', 500, error.message);
    }

    return apiSuccess({
      ...data,
      meta: {
        previous_status: currentStatus,
        new_status: newStatus,
        transition_valid: true,
        reason,
        description: STATUS_DESCRIPTIONS[newStatus],
      },
    });
  } catch (err) {
    console.error('Task status update exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * GET /api/tasks/[id]/status
 * 
 * Get task status information including available transitions.
 * 
 * Path Parameters:
 * - id: Task UUID (required)
 * 
 * Response: { 
 *   data: { 
 *     status: TaskStatus, 
 *     available_transitions: TaskStatus[],
 *     description: string,
 *     is_terminal: boolean
 *   } 
 * }
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

    // Fetch current task status
    const { data: task, error } = await supabase
      .from('tasks')
      .select('id, status, progress_percent, started_at, completed_at, tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !task) {
      if (error?.code === 'PGRST116') {
        return apiError('Task not found', 404);
      }
      return apiError('Failed to fetch task status', 500, error?.message);
    }

    const currentStatus = task.status as TaskStatus;
    const terminalStates: TaskStatus[] = ['completed', 'cancelled'];

    return apiSuccess({
      task_id: id,
      status: currentStatus,
      description: STATUS_DESCRIPTIONS[currentStatus],
      progress_percent: task.progress_percent,
      started_at: task.started_at,
      completed_at: task.completed_at,
      available_transitions: VALID_STATUS_TRANSITIONS[currentStatus] || [],
      is_terminal: terminalStates.includes(currentStatus),
    });
  } catch (err) {
    console.error('Task status GET exception:', err);
    return apiError('Internal server error', 500);
  }
}
