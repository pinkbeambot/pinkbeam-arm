import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { analyticsLeaderboardQuerySchema } from '@/lib/validation';
import { z } from 'zod';

/**
 * Simple in-memory cache
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

interface PerformanceData {
  agent_id: string;
  agent_name: string;
  agent_role: string;
  total_tasks_completed: number;
  total_tasks_failed: number;
  success_rate: number;
  avg_task_duration_seconds: number;
  total_cost_usd: number;
  total_escalations: number;
  override_rate: number;
  trend_direction: string;
}

interface AgentDetails {
  id: string;
  name: string;
  avatar_url?: string;
  role: string;
  status: string;
}

interface LeaderboardEntry {
  rank: number;
  medal: string | null;
  agentId: string;
  name: string;
  avatarUrl?: string;
  role: string;
  status: string;
  tasksCompleted: number;
  tasksFailed: number;
  successRate: number;
  avgTaskDuration: number;
  totalCost: number;
  escalationCount: number;
  overrideRate: number;
  trendDirection: string;
}

/**
 * GET /api/analytics/leaderboard
 * Get agent performance rankings
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
      sortBy: searchParams.get('sortBy') || 'tasksCompleted',
      limit: searchParams.get('limit') || '20',
    };

    const validatedQuery = analyticsLeaderboardQuerySchema.parse(queryParams);
    const { days, sortBy, limit } = validatedQuery;

    // Check cache
    const cacheKey = `analytics:leaderboard:${tenantId}:${days}:${sortBy}:${limit}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({ data: cachedData, cached: true });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Use the database function for performance summary
    const { data: performanceData, error: perfError } = await supabase.rpc(
      'get_agent_performance_summary',
      {
        p_tenant_id: tenantId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
      }
    );

    if (perfError) {
      console.error('Error fetching performance summary:', perfError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard', details: perfError.message },
        { status: 500 }
      );
    }

    // Get agent avatars and additional details
    const agentIds = (performanceData as PerformanceData[])?.map((p) => p.agent_id) || [];

    let agentsWithDetails: AgentDetails[] = [];

    if (agentIds.length > 0) {
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, avatar_url, role, status')
        .eq('tenant_id', tenantId)
        .in('id', agentIds);

      if (agentsError) {
        console.error('Error fetching agent details:', agentsError);
      } else {
        agentsWithDetails = (agents as AgentDetails[]) || [];
      }
    }

    // Merge performance data with agent details
    const leaderboard: LeaderboardEntry[] = (performanceData as PerformanceData[])
      .map((perf) => {
        const agent = agentsWithDetails.find(a => a.id === perf.agent_id);
        return {
          agentId: perf.agent_id,
          name: perf.agent_name,
          avatarUrl: agent?.avatar_url,
          role: perf.agent_role,
          status: agent?.status || 'unknown',
          tasksCompleted: perf.total_tasks_completed,
          tasksFailed: perf.total_tasks_failed,
          successRate: Math.round(perf.success_rate * 100) / 100,
          avgTaskDuration: perf.avg_task_duration_seconds,
          totalCost: Math.round(perf.total_cost_usd * 10000) / 10000,
          escalationCount: perf.total_escalations,
          overrideRate: Math.round(perf.override_rate * 100) / 100,
          trendDirection: perf.trend_direction,
          rank: 0, // Will be set after sorting
          medal: null, // Will be set after sorting
        };
      })
      .sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
        switch (sortBy) {
          case 'tasksCompleted':
            return b.tasksCompleted - a.tasksCompleted;
          case 'successRate':
            return b.successRate - a.successRate;
          case 'avgDuration':
            return (a.avgTaskDuration || 0) - (b.avgTaskDuration || 0);
          case 'cost':
            return (a.totalCost || 0) - (b.totalCost || 0);
          default:
            return b.tasksCompleted - a.tasksCompleted;
        }
      })
      .slice(0, limit)
      .map((agent, index) => ({
        ...agent,
        rank: index + 1,
        medal: index < 3 ? ['gold', 'silver', 'bronze'][index] : null,
      }));

    const response = {
      leaderboard,
      period: { days },
      sortBy,
      generatedAt: new Date().toISOString(),
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
    console.error('Unexpected error in GET /api/analytics/leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
