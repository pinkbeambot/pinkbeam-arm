import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { z } from 'zod';

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const TASK_STATUSES = ['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled'];

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);
    
    const validationResult = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { from, to } = validationResult.data;
    
    const now = new Date();
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : now;

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('status, created_at, completed_at, actual_duration')
      .eq('tenant_id', tenantId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString());

    if (tasksError) {
      console.error('Task analytics fetch error:', tasksError);
      return apiError('Failed to fetch task data', 500, tasksError.message);
    }

    const taskList = tasks || [];
    const totalTasks = taskList.length;

    const statusCounts: Record<string, number> = {};
    TASK_STATUSES.forEach(status => statusCounts[status] = 0);
    taskList.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    });

    const statusBreakdown = TASK_STATUSES.map(status => ({
      status,
      count: statusCounts[status],
      percentage: totalTasks > 0 ? Math.round((statusCounts[status] / totalTasks) * 1000) / 10 : 0,
    }));

    const completedTasks = taskList.filter(t => t.status === 'completed');
    const failedTasks = taskList.filter(t => t.status === 'failed');
    const inProgressTasks = taskList.filter(t => t.status === 'in_progress');
    const queuedTasks = taskList.filter(t => t.status === 'queued');
    const reviewTasks = taskList.filter(t => t.status === 'review');

    const finishedCount = completedTasks.length + failedTasks.length;
    const completionRate = finishedCount > 0 
      ? (completedTasks.length / finishedCount) * 100 
      : 0;

    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.actual_duration || 0), 0) / completedTasks.length / 60
      : 0;

    const stages = [
      { name: 'Created', count: totalTasks, percentage: 100 },
      {
        name: 'In Progress',
        count: inProgressTasks.length + reviewTasks.length + completedTasks.length + failedTasks.length,
        percentage: totalTasks > 0 
          ? Math.round(((inProgressTasks.length + reviewTasks.length + completedTasks.length + failedTasks.length) / totalTasks) * 1000) / 10 
          : 0,
        dropOffCount: queuedTasks.length,
        dropOffPercentage: totalTasks > 0 ? Math.round((queuedTasks.length / totalTasks) * 1000) / 10 : 0,
      },
      {
        name: 'Review',
        count: reviewTasks.length + completedTasks.length + failedTasks.length,
        percentage: totalTasks > 0 
          ? Math.round(((reviewTasks.length + completedTasks.length + failedTasks.length) / totalTasks) * 1000) / 10 
          : 0,
        dropOffCount: inProgressTasks.length,
        dropOffPercentage: totalTasks > 0 ? Math.round((inProgressTasks.length / totalTasks) * 1000) / 10 : 0,
      },
      {
        name: 'Completed',
        count: completedTasks.length,
        percentage: totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 1000) / 10 : 0,
        dropOffCount: failedTasks.length + reviewTasks.length,
        dropOffPercentage: totalTasks > 0 
          ? Math.round(((failedTasks.length + reviewTasks.length) / totalTasks) * 1000) / 10 
          : 0,
      },
    ];

    return apiSuccess({
      stages,
      statusBreakdown,
      summary: {
        totalTasks,
        completedTasks: completedTasks.length,
        failedTasks: failedTasks.length,
        inProgressTasks: inProgressTasks.length,
        avgCompletionTime: Math.round(avgCompletionTime * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
      },
    });
  } catch (err) {
    console.error('Task analytics exception:', err);
    return apiError('Internal server error', 500);
  }
}
