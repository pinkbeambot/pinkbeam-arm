import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

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
        { error: 'Failed to fetch stats', details: error.message },
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
