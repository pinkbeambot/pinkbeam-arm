import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

const statsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

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
      .is('deleted_at', null)
      .gte('created_at', dateFromStr);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    const list = escalations || [];

    // Calculate statistics
    const byStatus: Record<string, number> = {};
    const byUrgency: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const openByUrgency: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let acknowledgedCount = 0;

    list.forEach((e) => {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
      byUrgency[e.urgency] = (byUrgency[e.urgency] || 0) + 1;
      byType[e.type] = (byType[e.type] || 0) + 1;

      // Count open escalations by urgency
      if (e.status === 'open' || e.status === 'acknowledged') {
        openByUrgency[e.urgency] = (openByUrgency[e.urgency] || 0) + 1;
      }

      if (e.status === 'acknowledged') {
        acknowledgedCount++;
      }

      if (e.time_to_resolve_seconds && e.status === 'resolved') {
        totalResolutionTime += e.time_to_resolve_seconds;
        resolvedCount++;
      }
    });

    // Daily timeline
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
        open_by_urgency: openByUrgency,
        acknowledged_count: acknowledgedCount,
        avg_resolution_time_seconds: resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : null,
        timeline,
      },
      meta: { days, date_from: dateFromStr },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
