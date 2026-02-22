/**
 * POST /api/tasks/batch-assign
 * 
 * Bulk assign multiple tasks to agents at once.
 * 
 * Body: {
 *   assignments: [{ id: string, assignee_id: string, note?: string }],
 *   options?: {
 *     continue_on_error?: boolean,
 *     unassign_existing?: boolean,
 *   }
 * }
 * 
 * Response: {
 *   success: boolean,
 *   processed: number,
 *   succeeded: number,
 *   failed: number,
 *   errors: [{ index, id, message, code }],
 *   data: Task[]
 * }
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

    // Validate request body
    const validationResult = batchAssignTasksSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { assignments, options } = validationResult.data;
    const continueOnError = options?.continue_on_error ?? false;
    const unassignExisting = options?.unassign_existing ?? false;

    const results: Task[] = [];
    const errors: Array<{ index: number; id?: string; message: string; code?: string }> = [];

    // Collect all task IDs and assignee IDs for validation
    const taskIds = assignments.map(a => a.id);
    const assigneeIds = [...new Set(assignments.map(a => a.assignee_id))];

    // Validate all tasks belong to tenant
    const { data: validTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, assignee_id')
      .eq('tenant_id', tenantId)
      .in('id', taskIds);

    if (tasksError) {
      return apiError('Failed to validate tasks', 500, tasksError.message);
    }

    const validTaskMap = new Map(validTasks?.map(t => [t.id, t]) || []);
    const invalidTasks = taskIds.filter(id => !validTaskMap.has(id));

    if (invalidTasks.length > 0) {
      return apiError(
        'Invalid task IDs',
        400,
        { invalidTasks }
      );
    }

    // Validate all assignees belong to tenant
    const { data: validAgents, error: agentsError } = await supabase
      .from('agents')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .in('id', assigneeIds)
      .is('deleted_at', null);

    if (agentsError) {
      return apiError('Failed to validate assignees', 500, agentsError.message);
    }

    const validAgentMap = new Map(validAgents?.map(a => [a.id, a]) || []);
    const invalidAgents = assigneeIds.filter(id => !validAgentMap.has(id));

    if (invalidAgents.length > 0) {
      return apiError(
        'Invalid assignee IDs',
        400,
        { invalidAgents }
      );
    }

    // Check for inactive agents
    const inactiveAgents = assigneeIds.filter(id => {
      const agent = validAgentMap.get(id);
      return agent?.status === 'terminated' || agent?.status === 'error';
    });

    if (inactiveAgents.length > 0) {
      return apiError(
        'Cannot assign tasks to terminated or error-state agents',
        400,
        { inactiveAgents }
      );
    }

    // Process each assignment
    for (let i = 0; i < assignments.length; i++) {
      const { id: taskId, assignee_id, note } = assignments[i];

      try {
        const existingTask = validTaskMap.get(taskId);

        // Check if task can be assigned
        if (['completed', 'cancelled', 'failed'].includes(existingTask?.status || '')) {
          errors.push({
            index: i,
            id: taskId,
            message: `Cannot assign a task with status: ${existingTask?.status}`,
            code: 'INVALID_STATUS',
          });

          if (!continueOnError) {
            break;
          }
          continue;
        }

        // If unassign_existing is true and this assignee has other tasks, unassign them
        if (unassignExisting) {
          const { error: unassignError } = await supabase
            .from('tasks')
            .update({
              assignee_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('assignee_id', assignee_id)
            .eq('tenant_id', tenantId)
            .neq('id', taskId)
            .in('status', ['queued', 'in_progress', 'blocked', 'review']);

          if (unassignError) {
            console.error('Error unassigning existing tasks:', unassignError);
            // Continue with assignment even if unassign fails
          }
        }

        // Update task assignment
        const updateData: {
          assignee_id: string;
          assigner_id: string;
          status: TaskStatus;
          updated_at: string;
        } = {
          assignee_id,
          assigner_id: userId,
          status: existingTask?.status === 'queued' ? 'in_progress' : (existingTask?.status as TaskStatus),
          updated_at: new Date().toISOString(),
        };

        const { data: updatedTask, error: updateError } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', taskId)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (updateError) {
          errors.push({
            index: i,
            id: taskId,
            message: updateError.message,
            code: updateError.code,
          });

          if (!continueOnError) {
            break;
          }
          continue;
        }

        // Log assignment activity with note if provided
        await supabase.from('activities').insert({
          tenant_id: tenantId,
          type: 'task.assigned',
          category: 'task',
          actor_type: 'user',
          actor_id: userId,
          target_type: 'task',
          target_id: taskId,
          agent_id: assignee_id,
          task_id: taskId,
          title: 'Task assigned',
          description: note || `Task assigned to agent ${assignee_id}`,
          metadata: {
            assignee_id,
            note,
            previous_assignee: existingTask?.assignee_id,
          },
        });

        if (updatedTask) {
          results.push(updatedTask);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push({
          index: i,
          id: taskId,
          message: errorMessage,
          code: 'EXCEPTION',
        });

        if (!continueOnError) {
          break;
        }
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
