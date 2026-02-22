/**
 * POST /api/tasks/batch-assign
 * 
 * Bulk assign multiple tasks to agents at once.
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { batchAssignTasksSchema } from '@/lib/validation';
import type { Database } from '@/lib/database';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskStatus = Database['public']['Enums']['task_status'];

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;

  try {
    const body = await request.json();

    const validationResult = batchAssignTasksSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { assignments, options } = validationResult.data;
    const continueOnError = options?.continue_on_error ?? false;

    const results: Task[] = [];
    const errors: Array<{ index: number; id?: string; message: string; code?: string }> = [];

    const taskIds = assignments.map(a => a.id);
    const assigneeIds = [...new Set(assignments.map(a => a.assignee_id))];

    // Validate tasks
    const { data: validTasks } = await supabase
      .from('tasks')
      .select('id, status, assignee_id')
      .eq('tenant_id', tenantId)
      .in('id', taskIds);

    const validTaskMap = new Map(validTasks?.map(t => [t.id, t]) || []);

    // Validate assignees
    const { data: validAgents } = await supabase
      .from('agents')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', assigneeIds)
      .is('deleted_at', null);

    const validAgentIds = new Set(validAgents?.map(a => a.id) || []);

    for (let i = 0; i < assignments.length; i++) {
      const { id: taskId, assignee_id, note } = assignments[i];

      try {
        if (!validTaskMap.has(taskId)) {
          errors.push({ index: i, id: taskId, message: 'Task not found', code: 'NOT_FOUND' });
          if (!continueOnError) break;
          continue;
        }

        if (!validAgentIds.has(assignee_id)) {
          errors.push({ index: i, id: taskId, message: 'Assignee not found', code: 'INVALID_ASSIGNEE' });
          if (!continueOnError) break;
          continue;
        }

        const existingTask = validTaskMap.get(taskId)!;

        if (['completed', 'cancelled', 'failed'].includes(existingTask.status)) {
          errors.push({
            index: i,
            id: taskId,
            message: `Cannot assign a task with status: ${existingTask.status}`,
            code: 'INVALID_STATUS',
          });
          if (!continueOnError) break;
          continue;
        }

        const { data: updatedTask, error: updateError } = await supabase
          .from('tasks')
          .update({
            assignee_id,
            assigner_id: userId,
            status: existingTask.status === 'queued' ? 'in_progress' : existingTask.status as TaskStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (updateError) {
          errors.push({ index: i, id: taskId, message: updateError.message, code: updateError.code });
          if (!continueOnError) break;
          continue;
        }

        if (updatedTask) results.push(updatedTask);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ index: i, id: taskId, message: errorMessage, code: 'EXCEPTION' });
        if (!continueOnError) break;
      }
    }

    return apiSuccess({
      success: errors.length === 0,
      processed: assignments.length,
      succeeded: results.length,
      failed: errors.length,
      errors,
      data: results,
    });
  } catch (err) {
    console.error('Batch assign tasks exception:', err);
    return apiError('Internal server error', 500);
  }
}
