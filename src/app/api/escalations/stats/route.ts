import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const statsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

export async function GET(request: NextRequest) {
  try {
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
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { searchParams } = new URL(request.url);
    const queryParams = { days: searchParams.get('days') || '30' };
    const validatedQuery = statsQuerySchema.parse(queryParams);
    const { days } = validatedQuery;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const dateFromStr = dateFrom.toISOString();

    const { data: escalations, error } = await supabase
      .from('escalations')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', dateFromStr);

    if (error) {
      console.error('Error fetching escalation stats:', error);
      return NextResponse.json({ error: 'Failed to fetch stats', details: error.message }, { status: 500 });
    }

    const list = escalations || [];

    const byStatus: Record<string, number> = {};
    const byUrgency: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    list.forEach((e) => {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
      byUrgency[e.urgency] = (byUrgency[e.urgency] || 0) + 1;
      byType[e.type] = (byType[e.type] || 0) + 1;

      if (e.time_to_resolve_seconds && e.status === 'resolved') {
        totalResolutionTime += e.time_to_resolve_seconds;
        resolvedCount++;
      }
    });

    const dailyCounts: Record<string, { created: number; resolved: number }> = {};
    list.forEach((e) => {
      const date = e.created_at.split('T')[0];
      if (!dailyCounts[date]) dailyCounts[date] = { created: 0, resolved: 0 };
      dailyCounts[date].created++;
      if (e.resolved_at) {
        const resolvedDate = e.resolved_at.split('T')[0];
        if (!dailyCounts[resolvedDate]) dailyCounts[resolvedDate] = { created: 0, resolved: 0 };
        dailyCounts[resolvedDate].resolved++;
      }
    });

    const timeline = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    return NextResponse.json({
      data: {
        total: list.length,
        by_status: byStatus,
        by_urgency: byUrgency,
        by_type: byType,
        avg_resolution_time_seconds: resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : null,
        timeline,
      },
      meta: { days, date_from: dateFromStr },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
