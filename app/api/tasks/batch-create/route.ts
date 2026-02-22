/**
 * POST /api/tasks/batch-create
 * 
 * Bulk create multiple tasks at once.
 * 
 * Body: {
 *   tasks: CreateTaskInput[],
 *   options?: {
 *     skip_validation?: boolean,
 *     continue_on_error?: boolean,
 *   }
 * }
 * 
 * Response: {
 *   success: boolean,
 *   processed: number,
 *   succeeded: number,
 *   failed: number,
 *   errors: [{ index, message, code }],
 *   data: Task[]
 * }
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { batchCreateTasksSchema } from '@/lib/validation';
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
    const validationResult = batchCreateTasksSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { tasks, options } = validationResult.data;
    const continueOnError = options?.continue_on_error ?? false;

    const results: Task[] = [];
    const errors: Array<{ index: number; message: string; code?: string }> = [];

    // Collect all assignee IDs for validation
    const assigneeIds = [...new Set(tasks.map(t => t.assignee_id).filter(Boolean))];
    
    // Validate all assignees belong to tenant (if any)
    if (assigneeIds.length > 0) {
      const { data: validAgents, error: agentsError } = await supabase
        .from('agents')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('id', assigneeIds)
        .is('deleted_at', null);

      if (agentsError) {
        return apiError('Failed to validate assignees', 500, agentsError.message);
      }

      const validAgentIds = new Set(validAgents?.map(a => a.id) || []);
      const invalidAssignees = assigneeIds.filter(id => !validAgentIds.has(id));

      if (invalidAssignees.length > 0) {
        return apiError(
          'Invalid assignee IDs',
          400,
          { invalidAssignees }
        );
      }
    }

    // Collect all parent task IDs for validation
    const parentIds = [...new Set(tasks.map(t => t.parent_task_id).filter(Boolean))];
    const parentDepthMap = new Map<string, number>();

    if (parentIds.length > 0) {
      const { data: validParents, error: parentsError } = await supabase
        .from('tasks')
        .select('id, depth, status')
        .eq('tenant_id', tenantId)
        .in('id', parentIds);

      if (parentsError) {
        return apiError('Failed to validate parent tasks', 500, parentsError.message);
      }

      const validParentIds = new Set(validParents?.map(t => t.id) || []);
      const invalidParents = parentIds.filter(id => !validParentIds.has(id));

      if (invalidParents.length > 0) {
        return apiError(
          'Invalid parent task IDs',
          400,
          { invalidParents }
        );
      }

      // Build depth map and check for completed parents
      for (const parent of validParents || []) {
        parentDepthMap.set(parent.id, parent.depth || 0);
        
        if (['completed', 'cancelled', 'failed'].includes(parent.status)) {
          return apiError(
            `Cannot add subtasks to a completed, cancelled, or failed task: ${parent.id}`,
            400
          );
        }
      }
    }

    // Process each task creation
    for (let i = 0; i < tasks.length; i++) {
      const taskData = tasks[i];

      try {
        const parentDepth = taskData.parent_task_id 
          ? (parentDepthMap.get(taskData.parent_task_id) || 0)
          : 0;

        const newTask = {
          ...taskData,
          tenant_id: tenantId,
          assigner_id: userId,
          status: 'queued' as TaskStatus,
          depth: parentDepth + 1,
        };

        const { data: createdTask, error: createError } = await supabase
          .from('tasks')
          .insert(newTask)
          .select()
          .single();

        if (createError) {
          errors.push({
            index: i,
            message: createError.message,
            code: createError.code,
          });
          
          if (!continueOnError) {
            break;
          }
          continue;
        }

        if (createdTask) {
          results.push(createdTask);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push({
          index: i,
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
      processed: tasks.length,
      succeeded: results.length,
      failed: errors.length,
      errors,
      data: results,
    });
  } catch (err) {
    console.error('Batch create tasks exception:', err);
    return apiError('Internal server error', 500);
  }
}
