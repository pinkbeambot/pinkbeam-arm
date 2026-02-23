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
import { dailyCostsQuerySchema } from '@/lib/validation';
import { z } from 'zod';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

// Daily cost RPC response type
interface DailyCostRow {
  date: string;
  request_count: number | string;
  total_tokens: number | string;
  total_cost_usd: number | string;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

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
        { error: 'Failed to fetch daily costs' },
        { status: 500 }
      );
    }

    // Format response
    const formattedData = (dailyCosts as DailyCostRow[] || []).map((day) => ({
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
