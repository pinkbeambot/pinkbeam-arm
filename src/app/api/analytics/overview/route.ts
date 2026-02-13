import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { analyticsOverviewQuerySchema } from '@/lib/validation';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Simple in-memory cache for expensive analytics queries
 * TTL: 5 minutes for analytics data
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

function generateCacheKey(tenantId: string, dateRange: string): string {
  return `analytics:overview:${tenantId}:${dateRange}`;
}

/**
 * GET /api/analytics/overview
 * Get key performance metrics with trends for the dashboard overview
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Create Supabase client with user's token
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user to extract tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      days: searchParams.get('days') || '30',
    };

    const validatedQuery = analyticsOverviewQuerySchema.parse(queryParams);
    const days = validatedQuery.days;

    // Check cache
    const cacheKey = generateCacheKey(tenantId, `${days}d`);
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({ data: cachedData, cached: true });
    }

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Calculate date ranges
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // Fetch current period metrics from materialized view
    const { data: currentMetrics, error: currentError } = await supabase
      .from('agent_performance_daily')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (currentError) {
      console.error('Error fetching current metrics:', currentError);
      return NextResponse.json(
        { error: 'Failed to fetch metrics', details: currentError.message },
        { status: 500 }
      );
    }

    // Fetch previous period metrics for trend calculation
    const { data: prevMetrics, error: prevError } = await supabase
      .from('agent_performance_daily')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', prevStartDate.toISOString().split('T')[0])
      .lt('date', startDate.toISOString().split('T')[0]);

    if (prevError) {
      console.error('Error fetching previous metrics:', prevError);
    }

    // Aggregate metrics
    const current = {
      tasksCompleted: currentMetrics?.reduce((sum, m) => sum + (m.tasks_completed || 0), 0) || 0,
      tasksCreated: currentMetrics?.reduce((sum, m) => sum + (m.tasks_created || 0), 0) || 0,
      tasksFailed: currentMetrics?.reduce((sum, m) => sum + (m.tasks_failed || 0), 0) || 0,
      activeAgents: new Set(currentMetrics?.map(m => m.agent_id) || []).size,
      totalCost: currentMetrics?.reduce((sum, m) => sum + parseFloat(m.total_cost_usd || '0'), 0) || 0,
      avgSuccessRate: currentMetrics?.length
        ? currentMetrics.reduce((sum, m) => sum + parseFloat(m.success_rate || '0'), 0) / currentMetrics.length
        : 0,
      totalEscalations: currentMetrics?.reduce((sum, m) => sum + (m.escalations_raised || 0), 0) || 0,
      avgTaskDuration: currentMetrics?.length
        ? currentMetrics.reduce((sum, m) => sum + (m.avg_task_duration_seconds || 0), 0) / currentMetrics.length
        : 0,
    };

    const previous = {
      tasksCompleted: prevMetrics?.reduce((sum, m) => sum + (m.tasks_completed || 0), 0) || 0,
      tasksCreated: prevMetrics?.reduce((sum, m) => sum + (m.tasks_created || 0), 0) || 0,
      tasksFailed: prevMetrics?.reduce((sum, m) => sum + (m.tasks_failed || 0), 0) || 0,
      activeAgents: new Set(prevMetrics?.map(m => m.agent_id) || []).size,
      totalCost: prevMetrics?.reduce((sum, m) => sum + parseFloat(m.total_cost_usd || '0'), 0) || 0,
      avgSuccessRate: prevMetrics?.length
        ? prevMetrics.reduce((sum, m) => sum + parseFloat(m.success_rate || '0'), 0) / prevMetrics.length
        : 0,
      totalEscalations: prevMetrics?.reduce((sum, m) => sum + (m.escalations_raised || 0), 0) || 0,
    };

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const trends = {
      tasksCompleted: calculateTrend(current.tasksCompleted, previous.tasksCompleted),
      tasksCreated: calculateTrend(current.tasksCreated, previous.tasksCreated),
      successRate: calculateTrend(current.avgSuccessRate, previous.avgSuccessRate),
      activeAgents: calculateTrend(current.activeAgents, previous.activeAgents),
      cost: calculateTrend(current.totalCost, previous.totalCost),
      escalations: calculateTrend(current.totalEscalations, previous.totalEscalations),
    };

    // Get daily breakdown for sparkline charts
    const dailyBreakdown = currentMetrics?.reduce((acc, m) => {
      const date = m.date;
      if (!acc[date]) {
        acc[date] = { date, tasksCompleted: 0, tasksCreated: 0, successRate: 0, cost: 0 };
      }
      acc[date].tasksCompleted += m.tasks_completed || 0;
      acc[date].tasksCreated += m.tasks_created || 0;
      acc[date].cost += parseFloat(m.total_cost_usd || '0');
      return acc;
    }, {} as Record<string, { date: string; tasksCompleted: number; tasksCreated: number; successRate: number; cost: number }>);

    // Get current open escalations count
    const { count: openEscalations, error: escalationsError } = await supabase
      .from('escalations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['open', 'in_progress']);

    if (escalationsError) {
      console.error('Error fetching open escalations:', escalationsError);
    }

    // Get current active agents
    const { count: activeAgentsCount, error: agentsError } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['idle', 'active']);

    if (agentsError) {
      console.error('Error fetching active agents:', agentsError);
    }

    const response = {
      summary: {
        tasksCompleted: {
          value: current.tasksCompleted,
          trend: trends.tasksCompleted,
          trendDirection: trends.tasksCompleted >= 0 ? 'up' : 'down',
        },
        tasksCreated: {
          value: current.tasksCreated,
          trend: trends.tasksCreated,
          trendDirection: trends.tasksCreated >= 0 ? 'up' : 'down',
        },
        successRate: {
          value: Math.round(current.avgSuccessRate * 100) / 100,
          trend: trends.successRate,
          trendDirection: trends.successRate >= 0 ? 'up' : 'down',
        },
        activeAgents: {
          value: activeAgentsCount || 0,
          trend: trends.activeAgents,
          trendDirection: trends.activeAgents >= 0 ? 'up' : 'down',
        },
        totalCost: {
          value: Math.round(current.totalCost * 100) / 100,
          trend: trends.cost,
          trendDirection: trends.cost >= 0 ? 'up' : 'down',
        },
        openEscalations: {
          value: openEscalations || 0,
          trend: trends.escalations,
          trendDirection: trends.escalations >= 0 ? 'up' : 'down',
        },
      },
      dailyBreakdown: Object.values(dailyBreakdown || {}).sort((a, b) => a.date.localeCompare(b.date)),
      avgTaskDuration: current.avgTaskDuration,
      period: {
        days,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
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
    console.error('Unexpected error in GET /api/analytics/overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
