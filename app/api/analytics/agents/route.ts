import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { z } from 'zod';

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  agentIds: z.string().optional(),
});

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

    const { from, to, agentIds } = validationResult.data;
    
    const now = new Date();
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : now;

    const agentIdList = agentIds ? agentIds.split(',').filter(Boolean) : [];

    let agentQuery = supabase
      .from('agents')
      .select('id, name, role, avatar_url, status, last_active_at, stats')
      .eq('tenant_id', tenantId);

    if (agentIdList.length > 0) {
      agentQuery = agentQuery.in('id', agentIdList);
    }

    const { data: agents, error: agentsError } = await agentQuery;

    if (agentsError) {
      console.error('Agent analytics fetch error:', agentsError);
      return apiError('Failed to fetch agent data', 500, agentsError.message);
    }

    let taskQuery = supabase
      .from('tasks')
      .select('assignee_id, status, created_at, completed_at, actual_duration, cost_usd')
      .eq('tenant_id', tenantId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString());

    if (agentIdList.length > 0) {
      taskQuery = taskQuery.in('assignee_id', agentIdList);
    }

    const { data: tasks, error: tasksError } = await taskQuery;

    if (tasksError) {
      console.error('Task analytics fetch error:', tasksError);
      return apiError('Failed to fetch task data', 500, tasksError.message);
    }

    let escalationQuery = supabase
      .from('escalations')
      .select('agent_id, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString());

    if (agentIdList.length > 0) {
      escalationQuery = escalationQuery.in('agent_id', agentIdList);
    }

    const { data: escalations, error: escalationsError } = await escalationQuery;

    if (escalationsError) {
      console.error('Escalation analytics fetch error:', escalationsError);
      return apiError('Failed to fetch escalation data', 500, escalationsError.message);
    }

    const agentMetrics = (agents || []).map(agent => {
      const agentTasks = tasks?.filter(t => t.assignee_id === agent.id) || [];
      const completedTasks = agentTasks.filter(t => t.status === 'completed');
      const failedTasks = agentTasks.filter(t => t.status === 'failed');
      const inProgressTasks = agentTasks.filter(t => t.status === 'in_progress');
      
      const totalCompleted = completedTasks.length;
      const totalFailed = failedTasks.length;
      const totalTasks = totalCompleted + totalFailed;
      
      const successRate = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;
      
      const avgDuration = completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => sum + (t.actual_duration || 0), 0) / completedTasks.length / 60
        : 0;
      
      const totalCost = agentTasks.reduce((sum, t) => sum + (t.cost_usd || 0), 0);
      
      const escalationCount = escalations?.filter(e => e.agent_id === agent.id).length || 0;

      return {
        agentId: agent.id,
        agentName: agent.name,
        agentRole: agent.role,
        avatarUrl: agent.avatar_url,
        tasksCompleted: totalCompleted,
        tasksFailed: totalFailed,
        tasksInProgress: inProgressTasks.length,
        successRate: Math.round(successRate * 100) / 100,
        avgTaskDuration: Math.round(avgDuration * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        escalationsRaised: escalationCount,
        lastActiveAt: agent.last_active_at,
      };
    });

    const activeAgents = agentMetrics.filter(a => a.tasksCompleted > 0 || a.tasksInProgress > 0).length;
    const totalTasksCompleted = agentMetrics.reduce((sum, a) => sum + a.tasksCompleted, 0);
    const overallSuccessRate = agentMetrics.length > 0
      ? agentMetrics.reduce((sum, a) => sum + a.successRate, 0) / agentMetrics.length
      : 0;
    const totalCost = agentMetrics.reduce((sum, a) => sum + a.totalCost, 0);

    return apiSuccess({
      data: agentMetrics,
      summary: {
        totalAgents: agentMetrics.length,
        activeAgents,
        totalTasksCompleted,
        overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
      },
    });
  } catch (err) {
    console.error('Agent analytics exception:', err);
    return apiError('Internal server error', 500);
  }
}
