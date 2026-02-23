import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

const statsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
  agent_id: z.string().uuid().optional(),
});

/**
 * GET /api/decisions/stats
 * Get aggregated decision statistics
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
      agent_id: searchParams.get('agent_id') || undefined,
    };

    const validatedQuery = statsQuerySchema.parse(queryParams);
    const { days, agent_id } = validatedQuery;

    // Calculate date range
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const dateFromStr = dateFrom.toISOString();

    // Build base query filter
    let baseQuery = supabase
      .from('decisions')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('proposed_at', dateFromStr);

    if (agent_id) {
      baseQuery = baseQuery.eq('agent_id', agent_id);
    }

    // Get all decisions for stats calculation
    const { data: decisions, error } = await baseQuery;

    if (error) {
      console.error('Error fetching decision stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const decisionsList = decisions || [];

    // Count by category
    const byCategory: Record<string, number> = {};
    decisionsList.forEach(d => {
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
    });

    // Count by status
    const byStatus: Record<string, number> = {};
    decisionsList.forEach(d => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    });

    // Average confidence per agent
    const agentConfidence: Record<string, { total: number; count: number; name?: string }> = {};
    decisionsList.forEach(d => {
      if (!agentConfidence[d.agent_id]) {
        agentConfidence[d.agent_id] = { total: 0, count: 0 };
      }
      agentConfidence[d.agent_id].total += d.reasoning?.confidence || 0;
      agentConfidence[d.agent_id].count += 1;
    });

    const avgConfidenceByAgent = Object.entries(agentConfidence).map(([agentId, data]) => ({
      agent_id: agentId,
      avg_confidence: data.count > 0 ? data.total / data.count : 0,
      decision_count: data.count,
    }));

    // Daily counts for trend
    const dailyCounts: Record<string, number> = {};
    decisionsList.forEach(d => {
      const date = d.proposed_at.split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    // Sort daily counts by date
    const timeline = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Calculate overall average confidence
    const totalConfidence = decisionsList.reduce((sum, d) => sum + (d.reasoning?.confidence || 0), 0);
    const avgConfidence = decisionsList.length > 0 ? totalConfidence / decisionsList.length : 0;

    return NextResponse.json({
      data: {
        total: decisionsList.length,
        avg_confidence: avgConfidence,
        by_category: byCategory,
        by_status: byStatus,
        avg_confidence_by_agent: avgConfidenceByAgent,
        timeline,
      },
      meta: {
        days,
        agent_id: agent_id || null,
        date_from: dateFromStr,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in GET /api/decisions/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
