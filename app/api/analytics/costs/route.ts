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

    let taskQuery = supabase
      .from('tasks')
      .select('cost_usd, tokens_used, created_at, completed_at, assignee_id, status')
      .eq('tenant_id', tenantId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString());

    if (agentIdList.length > 0) {
      taskQuery = taskQuery.in('assignee_id', agentIdList);
    }

    const { data: tasks, error: tasksError } = await taskQuery;

    if (tasksError) {
      console.error('Cost analytics fetch error:', tasksError);
      return apiError('Failed to fetch cost data', 500, tasksError.message);
    }

    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('tenant_id', tenantId);

    if (agentsError) {
      console.error('Agent fetch error:', agentsError);
      return apiError('Failed to fetch agent data', 500, agentsError.message);
    }

    const taskList = tasks || [];
    const agentMap = new Map(agents?.map(a => [a.id, a.name]) || []);

    const dateMap = new Map<string, { cost: number; taskCount: number }>();
    
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dateMap.set(dateKey, { cost: 0, taskCount: 0 });
    }

    taskList.forEach(task => {
      const dateKey = new Date(task.created_at).toISOString().split('T')[0];
      const dayData = dateMap.get(dateKey);
      if (dayData) {
        dayData.cost += task.cost_usd || 0;
        dayData.taskCount++;
      }
    });

    const trends = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        cost: Math.round(data.cost * 100) / 100,
        taskCount: data.taskCount,
        costPerTask: data.taskCount > 0 ? Math.round((data.cost / data.taskCount) * 100) / 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const statusCosts: Record<string, number> = {};
    taskList.forEach(task => {
      const cost = task.cost_usd || 0;
      statusCosts[task.status] = (statusCosts[task.status] || 0) + cost;
    });

    const totalCost = Object.values(statusCosts).reduce((a, b) => a + b, 0);
    const breakdown = Object.entries(statusCosts).map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: totalCost > 0 ? Math.round((amount / totalCost) * 1000) / 10 : 0,
    })).sort((a, b) => b.amount - a.amount);

    const agentCostMap = new Map<string, { totalCost: number; taskCount: number; tokensUsed: number }>();
    
    taskList.forEach(task => {
      const agentId = task.assignee_id;
      if (!agentId) return;
      
      const existing = agentCostMap.get(agentId) || { totalCost: 0, taskCount: 0, tokensUsed: 0 };
      existing.totalCost += task.cost_usd || 0;
      existing.taskCount++;
      existing.tokensUsed += task.tokens_used || 0;
      agentCostMap.set(agentId, existing);
    });

    const byAgent = Array.from(agentCostMap.entries())
      .map(([agentId, data]) => ({
        agentId,
        agentName: agentMap.get(agentId) || 'Unknown',
        totalCost: Math.round(data.totalCost * 100) / 100,
        taskCount: data.taskCount,
        avgCostPerTask: data.taskCount > 0 ? Math.round((data.totalCost / data.taskCount) * 100) / 100 : 0,
        tokensUsed: data.tokensUsed,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    const totalTasks = taskList.length;
    const avgCostPerTask = totalTasks > 0 ? totalCost / totalTasks : 0;
    const totalTokens = taskList.reduce((sum, t) => sum + (t.tokens_used || 0), 0);

    const daysInRange = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyAverage = totalCost / daysInRange;
    const projectedMonthlyCost = dailyAverage * 30;

    return apiSuccess({
      trends,
      breakdown,
      byAgent,
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalTasks,
        avgCostPerTask: Math.round(avgCostPerTask * 100) / 100,
        totalTokens,
        projectedMonthlyCost: Math.round(projectedMonthlyCost * 100) / 100,
      },
    });
  } catch (err) {
    console.error('Cost analytics exception:', err);
    return apiError('Internal server error', 500);
  }
}
