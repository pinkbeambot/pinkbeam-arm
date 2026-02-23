import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { analyticsRoiQuerySchema } from '@/lib/validation';
import { z } from 'zod';

/**
 * Cache configuration
 */
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes for ROI (less frequent updates)

function getCachedData(key: string): unknown | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * GET /api/analytics/roi
 * Get ROI metrics and cost analysis
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      days: searchParams.get('days') || '30',
      hourlyRate: searchParams.get('hourlyRate') || '50',
    };

    const validatedQuery = analyticsRoiQuerySchema.parse(queryParams);
    const { days, hourlyRate } = validatedQuery;

    // Check cache
    const cacheKey = `analytics:roi:${tenantId}:${days}:${hourlyRate}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({ data: cachedData, cached: true });
    }

    // Calculate date ranges
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevEndDate.getDate() - days);

    // Use the database function for ROI metrics
    const { data: roiData, error: roiError } = await supabase.rpc(
      'get_roi_metrics',
      {
        p_tenant_id: tenantId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
      }
    );

    if (roiError) {
      console.error('Failed to fetch ROI metrics:', roiError);
      return NextResponse.json(
        { error: 'Failed to fetch ROI metrics' },
        { status: 500 }
      );
    }

    // Get previous period ROI for trends
    const { data: prevRoiData, error: prevRoiError } = await supabase.rpc(
      'get_roi_metrics',
      {
        p_tenant_id: tenantId,
        p_start_date: prevStartDate.toISOString().split('T')[0],
        p_end_date: prevEndDate.toISOString().split('T')[0],
      }
    );

    // Fetch cost breakdown by agent
    const { data: agentCosts, error: agentCostsError } = await supabase
      .from('agent_performance_daily')
      .select('agent_id, agent_name, agent_role, total_cost_usd, tasks_completed, tasks_created')
      .eq('tenant_id', tenantId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (agentCostsError) {
      console.error('Error fetching agent costs:', agentCostsError);
    }

    // Aggregate agent costs
    const agentCostBreakdown = (agentCosts || []).reduce((acc, curr) => {
      if (!acc[curr.agent_id]) {
        acc[curr.agent_id] = {
          agentId: curr.agent_id,
          name: curr.agent_name,
          role: curr.agent_role,
          totalCost: 0,
          tasksCompleted: 0,
          tasksCreated: 0,
        };
      }
      acc[curr.agent_id].totalCost += parseFloat(curr.total_cost_usd || '0');
      acc[curr.agent_id].tasksCompleted += curr.tasks_completed || 0;
      acc[curr.agent_id].tasksCreated += curr.tasks_created || 0;
      return acc;
    }, {} as Record<string, { agentId: string; name: string; role: string; totalCost: number; tasksCompleted: number; tasksCreated: number }>);

    // Fetch cost breakdown by task type
    const { data: taskCosts, error: taskCostsError } = await supabase
      .from('tasks')
      .select('type, cost_usd, status')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (taskCostsError) {
      console.error('Error fetching task costs:', taskCostsError);
    }

    const taskTypeBreakdown = (taskCosts || []).reduce((acc, curr) => {
      const type = curr.type || 'unknown';
      if (!acc[type]) {
        acc[type] = { type, cost: 0, count: 0, completed: 0 };
      }
      acc[type].cost += parseFloat(curr.cost_usd || '0');
      acc[type].count++;
      if (curr.status === 'completed') acc[type].completed++;
      return acc;
    }, {} as Record<string, { type: string; cost: number; count: number; completed: number }>);

    // Daily cost trend
    const { data: dailyCosts, error: dailyCostsError } = await supabase
      .from('agent_performance_daily')
      .select('date, total_cost_usd, tasks_completed')
      .eq('tenant_id', tenantId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (dailyCostsError) {
      console.error('Error fetching daily costs:', dailyCostsError);
    }

    const dailyTrend = (dailyCosts || []).reduce((acc, curr) => {
      const date = curr.date;
      if (!acc[date]) {
        acc[date] = { date, cost: 0, tasksCompleted: 0 };
      }
      acc[date].cost += parseFloat(curr.total_cost_usd || '0');
      acc[date].tasksCompleted += curr.tasks_completed || 0;
      return acc;
    }, {} as Record<string, { date: string; cost: number; tasksCompleted: number }>);

    const roi = roiData?.[0] || {
      total_tasks_completed: 0,
      total_cost_usd: 0,
      cost_per_task: 0,
      tasks_per_dollar: 0,
      estimated_hours_saved: 0,
      avg_human_cost_per_hour: hourlyRate,
      estimated_value_generated: 0,
      roi_percentage: 0,
    };

    const prevRoi = prevRoiData?.[0] || roi;

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const response = {
      summary: {
        totalTasksCompleted: parseInt(roi.total_tasks_completed?.toString() || '0'),
        totalCost: Math.round(parseFloat(roi.total_cost_usd?.toString() || '0') * 10000) / 10000,
        costPerTask: Math.round(parseFloat(roi.cost_per_task?.toString() || '0') * 10000) / 10000,
        tasksPerDollar: Math.round(parseFloat(roi.tasks_per_dollar?.toString() || '0') * 100) / 100,
        estimatedHoursSaved: Math.round(parseFloat(roi.estimated_hours_saved?.toString() || '0') * 100) / 100,
        estimatedValueGenerated: Math.round(parseFloat(roi.estimated_value_generated?.toString() || '0') * 100) / 100,
        roiPercentage: Math.round(parseFloat(roi.roi_percentage?.toString() || '0') * 100) / 100,
      },
      trends: {
        cost: calculateTrend(parseFloat(roi.total_cost_usd?.toString() || '0'), parseFloat(prevRoi.total_cost_usd?.toString() || '0')),
        tasksCompleted: calculateTrend(parseInt(roi.total_tasks_completed?.toString() || '0'), parseInt(prevRoi.total_tasks_completed?.toString() || '0')),
        costPerTask: calculateTrend(parseFloat(roi.cost_per_task?.toString() || '0'), parseFloat(prevRoi.cost_per_task?.toString() || '0')),
        roi: calculateTrend(parseFloat(roi.roi_percentage?.toString() || '0'), parseFloat(prevRoi.roi_percentage?.toString() || '0')),
      },
      agentCostBreakdown: Object.values(agentCostBreakdown)
        .map(a => ({
          ...a,
          totalCost: Math.round(a.totalCost * 10000) / 10000,
          costPerTask: a.tasksCompleted > 0 ? Math.round((a.totalCost / a.tasksCompleted) * 10000) / 10000 : 0,
        }))
        .sort((a, b) => b.totalCost - a.totalCost),
      taskTypeBreakdown: Object.values(taskTypeBreakdown)
        .map(t => ({
          ...t,
          cost: Math.round(t.cost * 10000) / 10000,
          costPerTask: t.count > 0 ? Math.round((t.cost / t.count) * 10000) / 10000 : 0,
          successRate: t.count > 0 ? Math.round((t.completed / t.count) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.cost - a.cost),
      dailyTrend: Object.values(dailyTrend).map(d => ({
        ...d,
        cost: Math.round(d.cost * 10000) / 10000,
      })),
      projections: {
        monthlyCost: parseFloat(roi.total_cost_usd?.toString() || '0') * (30 / days),
        annualCost: parseFloat(roi.total_cost_usd?.toString() || '0') * (365 / days),
        monthlyValue: parseFloat(roi.estimated_value_generated?.toString() || '0') * (30 / days),
        annualValue: parseFloat(roi.estimated_value_generated?.toString() || '0') * (365 / days),
      },
      comparison: {
        vsHumanLabor: {
          humanCost: parseFloat(roi.estimated_hours_saved?.toString() || '0') * hourlyRate,
          aiCost: parseFloat(roi.total_cost_usd?.toString() || '0'),
          savings: (parseFloat(roi.estimated_hours_saved?.toString() || '0') * hourlyRate) - parseFloat(roi.total_cost_usd?.toString() || '0'),
        },
      },
      assumptions: {
        avgHumanCostPerHour: hourlyRate,
        periodDays: days,
      },
    };

    // Cache the response
    setCachedData(cacheKey, response);

    return NextResponse.json({ data: response });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in GET /api/analytics/roi:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
