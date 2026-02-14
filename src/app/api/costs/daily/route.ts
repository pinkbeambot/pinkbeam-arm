/**
 * @openapi
 * /costs/daily:
 *   get:
 *     summary: Get daily cost aggregation
 *     description: Get aggregated costs grouped by day for the specified number of days
 *     tags:
 *       - Costs
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *           maximum: 90
 *         description: Number of days to include in the aggregation
 *     responses:
 *       200:
 *         description: Daily cost aggregation
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
 *                       date:
 *                         type: string
 *                         format: date
 *                       request_count:
 *                         type: integer
 *                       total_tokens:
 *                         type: integer
 *                       total_cost_usd:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { dailyCostsQuerySchema } from '@/lib/validation';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
    const { data: contextSet, error: contextError } = await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    if (contextError || contextSet !== true) {
      console.error('Failed to set tenant context:', contextError);
      return NextResponse.json(
        { error: 'Failed to set tenant context', details: contextError?.message },
        { status: 500 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      days: searchParams.get('days') || '30',
    };

    // Validate query parameters
    const validatedQuery = dailyCostsQuerySchema.parse(queryParams);
    const { days } = validatedQuery;

    // Call the RPC function for daily costs
    const { data: dailyCosts, error: dailyError } = await supabase.rpc('get_tenant_daily_costs', {
      p_tenant_id: tenantId,
      p_days: days,
    });

    if (dailyError) {
      console.error('Error fetching daily costs:', dailyError);
      return NextResponse.json(
        { error: 'Failed to fetch daily costs', details: dailyError.message },
        { status: 500 }
      );
    }

    // Format response
    const formattedData = (dailyCosts || []).map((day: any) => ({
      date: day.date,
      request_count: Number(day.request_count || 0),
      total_tokens: Number(day.total_tokens || 0),
      total_cost_usd: Number(day.total_cost_usd || 0),
    }));

    return NextResponse.json({
      data: formattedData,
      meta: {
        days,
        tenant_id: tenantId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in GET /api/costs/daily:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
