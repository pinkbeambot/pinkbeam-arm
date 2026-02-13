import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cache configuration
 */
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

const agentAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

/**
 * GET /api/analytics/agents/[id]
 * Get detailed analytics for a specific agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = { days: searchParams.get('days') || '30' };
    const validatedQuery = agentAnalyticsQuerySchema.parse(queryParams);
    const days = validatedQuery.days;

    // Check cache
    const cacheKey = `analytics:agent:${tenantId}:${agentId}:${days}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({ data: cachedData, cached: true });
    }

    // Set tenant context
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Verify agent belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, avatar_url, role, status, description, stats, llm_config, limits, created_at')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Fetch daily performance metrics
    const { data: dailyMetrics, error: metricsError } = await supabase
      .from('agent_performance_daily')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (metricsError) {
      console.error('Error fetching agent metrics:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch agent analytics', details: metricsError.message },
        { status: 500 }
      );
    }

    // Get task type breakdown (last 100 tasks)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('type, status, cost_usd, tokens_used, created_at, completed_at, started_at')
      .eq('tenant_id', tenantId)
      .eq('assignee_id', agentId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (tasksError) {
      console.error('Error fetching agent tasks:', tasksError);
    }

    // Get decision history
    const { data: decisions, error: decisionsError } = await supabase
      .from('decisions')
      .select('status, reasoning, proposed_at, overridden_at')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .gte('proposed_at', startDate.toISOString())
      .order('proposed_at', { ascending: false });

    if (decisionsError) {
      console.error('Error fetching agent decisions:', decisionsError);
    }

    // Get escalation history
    const { data: escalations, error: escalationsError } = await supabase
      .from('escalations')
      .select('status, urgency, created_at, resolved_at, time_to_resolve_seconds')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (escalationsError) {
      console.error('Error fetching agent escalations:', escalationsError);
    }

    // Calculate aggregate metrics
    const totalTasksCompleted = dailyMetrics?.reduce((sum, m) => sum + (m.tasks_completed || 0), 0) || 0;
    const totalTasksFailed = dailyMetrics?.reduce((sum, m) => sum + (m.tasks_failed || 0), 0) || 0;
    const totalTasksCreated = dailyMetrics?.reduce((sum, m) => sum + (m.tasks_created || 0), 0) || 0;
    const totalCost = dailyMetrics?.reduce((sum, m) => sum + parseFloat(m.total_cost_usd || '0'), 0) || 0;
    const totalEscalations = dailyMetrics?.reduce((sum, m) => sum + (m.escalations_raised || 0), 0) || 0;
    const totalDecisions = dailyMetrics?.reduce((sum, m) => sum + (m.decisions_made || 0), 0) || 0;
    const totalOverridden = dailyMetrics?.reduce((sum, m) => sum + (m.decisions_overridden || 0), 0) || 0;

    const avgSuccessRate = dailyMetrics?.length
      ? dailyMetrics.reduce((sum, m) => sum + parseFloat(m.success_rate || '0'), 0) / dailyMetrics.length
      : 0;

    const avgTaskDuration = dailyMetrics?.length
      ? dailyMetrics.reduce((sum, m) => sum + (m.avg_task_duration_seconds || 0), 0) / dailyMetrics.filter(m => m.avg_task_duration_seconds).length
      : 0;

    const avgConfidence = dailyMetrics?.length
      ? dailyMetrics.reduce((sum, m) => sum + (m.avg_confidence || 0), 0) / dailyMetrics.filter(m => m.avg_confidence).length
      : 0;

    // Task type breakdown
    const taskTypeBreakdown = (tasks || []).reduce((acc, task) => {
      const type = task.type || 'unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, completed: 0, failed: 0, cost: 0 };
      }
      acc[type].count++;
      if (task.status === 'completed') acc[type].completed++;
      if (task.status === 'failed') acc[type].failed++;
      acc[type].cost += parseFloat(task.cost_usd || '0');
      return acc;
    }, {} as Record<string, { count: number; completed: number; failed: number; cost: number }>);

    // Workload distribution (hours of day)
    const workloadDistribution = Array(24).fill(0).map((_, hour) => ({
      hour,
      tasks: 0,
    }));

    (tasks || []).forEach(task => {
      const hour = new Date(task.created_at).getHours();
      workloadDistribution[hour].tasks++;
    });

    // Decision confidence trend
    const decisionConfidenceTrend = (decisions || [])
      .filter(d => d.reasoning?.confidence)
      .map(d => ({
        date: d.proposed_at,
        confidence: d.reasoning.confidence * 100,
      }))
      .slice(0, 50);

    // Escalation resolution time trend
    const escalationResolutionTrend = (escalations || [])
      .filter(e => e.time_to_resolve_seconds)
      .map(e => ({
        date: e.created_at,
        resolutionTime: e.time_to_resolve_seconds,
      }))
      .slice(0, 50);

    // Daily performance trend
    const dailyTrend = (dailyMetrics || []).map(m => ({
      date: m.date,
      tasksCompleted: m.tasks_completed,
      tasksFailed: m.tasks_failed,
      successRate: parseFloat(m.success_rate || '0'),
      cost: parseFloat(m.total_cost_usd || '0'),
      escalations: m.escalations_raised,
      avgDuration: m.avg_task_duration_seconds,
      confidence: m.avg_confidence,
    }));

    const response = {
      agent: {
        id: agent.id,
        name: agent.name,
        avatarUrl: agent.avatar_url,
        role: agent.role,
        status: agent.status,
        description: agent.description,
        createdAt: agent.created_at,
        llmConfig: agent.llm_config,
        limits: agent.limits,
      },
      summary: {
        totalTasksCompleted,
        totalTasksFailed,
        totalTasksCreated,
        successRate: Math.round(avgSuccessRate * 100) / 100,
        avgTaskDuration: Math.round(avgTaskDuration * 100) / 100,
        totalCost: Math.round(totalCost * 10000) / 10000,
        totalEscalations,
        totalDecisions,
        totalOverridden,
        overrideRate: totalDecisions > 0 ? Math.round((totalOverridden / totalDecisions) * 10000) / 100 : 0,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
      },
      taskTypeBreakdown: Object.entries(taskTypeBreakdown).map(([type, stats]) => ({
        type,
        ...stats,
        successRate: stats.count > 0 ? Math.round((stats.completed / stats.count) * 10000) / 100 : 0,
      })),
      workloadDistribution,
      dailyTrend,
      decisionConfidenceTrend,
      escalationResolutionTrend,
      recentTasks: (tasks || []).slice(0, 10).map(t => ({
        type: t.type,
        status: t.status,
        createdAt: t.created_at,
        cost: t.cost_usd,
      })),
      period: { days },
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
    console.error('Unexpected error in GET /api/analytics/agents/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
