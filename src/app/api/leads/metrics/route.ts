import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { sdrMetricsQuerySchema } from '@/lib/validation';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getTenantId(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single();

  if (profileError || !userProfile?.tenant_id) throw new Error('Tenant not found');
  return userProfile.tenant_id;
}

/**
 * @openapi
 * /leads/metrics:
 *   get:
 *     summary: Get SDR metrics
 *     description: Get key SDR performance metrics for a date range
 *     tags:
 *       - Leads
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look back
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: SDR metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     leads_generated:
 *                       type: integer
 *                     outreach_sent:
 *                       type: integer
 *                     responses_received:
 *                       type: integer
 *                     meetings_booked:
 *                       type: integer
 *                     qualified_leads:
 *                       type: integer
 *                     response_rate:
 *                       type: number
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const { searchParams } = new URL(request.url);
    const queryParams = {
      days: searchParams.get('days') || '30',
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
    };

    const validatedQuery = sdrMetricsQuerySchema.parse(queryParams);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const tenantId = await getTenantId(supabase);
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Calculate date range
    let startDate: string;
    let endDate: string;

    if (validatedQuery.start_date && validatedQuery.end_date) {
      startDate = validatedQuery.start_date;
      endDate = validatedQuery.end_date;
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - validatedQuery.days);
      endDate = end.toISOString().split('T')[0];
      startDate = start.toISOString().split('T')[0];
    }

    // Get metrics using database function
    const { data: metrics, error } = await supabase.rpc('get_sdr_metrics', {
      p_tenant_id: tenantId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error('Error fetching SDR metrics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch metrics', details: error.message },
        { status: 500 }
      );
    }

    // Transform metrics into structured response
    const metricsMap = new Map(
      metrics?.map((m: { metric_name: string; metric_value: number }) => [m.metric_name, m.metric_value]) || []
    );

    const leadsGenerated = metricsMap.get('leads_generated') || 0;
    const outreachSent = metricsMap.get('outreach_sent') || 0;
    const responsesReceived = metricsMap.get('responses_received') || 0;
    const meetingsBooked = metricsMap.get('meetings_booked') || 0;
    const qualifiedLeads = metricsMap.get('qualified_leads') || 0;

    const responseRate = outreachSent > 0 ? Math.round((responsesReceived / outreachSent) * 100) : 0;

    return NextResponse.json({
      data: {
        leads_generated: leadsGenerated,
        outreach_sent: outreachSent,
        responses_received: responsesReceived,
        meetings_booked: meetingsBooked,
        qualified_leads: qualifiedLeads,
        response_rate: responseRate,
        period: {
          start_date: startDate,
          end_date: endDate,
          days: validatedQuery.days,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    console.error('Unexpected error in GET /api/leads/metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
