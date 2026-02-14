import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

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
 * /leads/pipeline:
 *   get:
 *     summary: Get pipeline summary
 *     description: Get lead counts and metrics grouped by pipeline stage
 *     tags:
 *       - Leads
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Pipeline summary by stage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stage:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       avg_score:
 *                         type: number
 *                       total_value_estimate:
 *                         type: number
 */
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

    const tenantId = await getTenantId(supabase);
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Use the database function for pipeline summary
    const { data: summary, error } = await supabase.rpc('get_lead_pipeline_summary', {
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error('Error fetching pipeline summary:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pipeline summary', details: error.message },
        { status: 500 }
      );
    }

    // Ensure all stages are represented
    const allStages = ['prospect', 'contacted', 'responded', 'qualified', 'meeting_booked', 'closed_won', 'closed_lost', 'nurture'];
    const summaryMap = new Map(summary?.map((s: { stage: string; count: number; avg_score: number; total_value_estimate: number }) => [s.stage, s]) || []);
    
    const completeSummary = allStages.map(stage => ({
      stage,
      count: summaryMap.get(stage)?.count || 0,
      avg_score: summaryMap.get(stage)?.avg_score || 0,
      total_value_estimate: summaryMap.get(stage)?.total_value_estimate || 0,
    }));

    return NextResponse.json({ data: completeSummary });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    console.error('Unexpected error in GET /api/leads/pipeline:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
