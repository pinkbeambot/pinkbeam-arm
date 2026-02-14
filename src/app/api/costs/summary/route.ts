/**
 * @openapi
 * /costs/summary:
 *   get:
 *     summary: Get cost summary statistics
 *     description: Get aggregated cost statistics for the tenant including total costs, token usage, and averages
 *     tags:
 *       - Costs
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for the summary period
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for the summary period
 *     responses:
 *       200:
 *         description: Cost summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_requests:
 *                       type: integer
 *                     total_tokens:
 *                       type: integer
 *                     total_cost_usd:
 *                       type: number
 *                     avg_cost_per_request:
 *                       type: number
 *                     avg_tokens_per_request:
 *                       type: number
 *                     period:
 *                       type: object
 *                       properties:
 *                         from:
 *                           type: string
 *                           format: date-time
 *                         to:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { costSummaryQuerySchema } from '@/lib/validation';
import { z } from 'zod';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    };

    // Validate query parameters
    const validatedQuery = costSummaryQuerySchema.parse(queryParams);
    const { date_from, date_to } = validatedQuery;

    // Call the RPC function for cost summary
    const { data: summaryData, error: summaryError } = await supabase.rpc('get_tenant_cost_summary', {
      p_tenant_id: tenantId,
      p_start_date: date_from || null,
      p_end_date: date_to || null,
    });

    if (summaryError) {
      console.error('Error fetching cost summary:', summaryError);
      return NextResponse.json(
        { error: 'Failed to fetch cost summary', details: summaryError.message },
        { status: 500 }
      );
    }

    // Get cost breakdown by model
    const { data: modelBreakdown, error: modelError } = await supabase.rpc('get_tenant_cost_by_model', {
      p_tenant_id: tenantId,
      p_start_date: date_from || null,
      p_end_date: date_to || null,
    });

    if (modelError) {
      console.error('Error fetching model breakdown:', modelError);
      // Don't fail the request, just skip the breakdown
    }

    // Format response
    const summary = Array.isArray(summaryData) ? summaryData[0] : summaryData;

    return NextResponse.json({
      data: {
        total_requests: Number(summary?.total_requests || 0),
        total_tokens: Number(summary?.total_tokens || 0),
        total_cost_usd: Number(summary?.total_cost_usd || 0),
        avg_cost_per_request: Number(summary?.avg_cost_per_request || 0),
        avg_tokens_per_request: Number(summary?.avg_tokens_per_request || 0),
        breakdown_by_model: modelBreakdown || [],
        period: {
          from: date_from,
          to: date_to,
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
    console.error('Unexpected error in GET /api/costs/summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
