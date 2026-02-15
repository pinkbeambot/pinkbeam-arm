/**
 * Webhook Deliveries API Route
 *
 * GET /api/webhooks/deliveries — List webhook delivery logs
 *
 * Query params:
 *   endpoint_id - Filter by endpoint
 *   status      - Filter by status (pending, success, failed, expired)
 *   limit       - Page size (default 20, max 100)
 *   offset      - Pagination offset
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  const endpointId = request.nextUrl.searchParams.get('endpoint_id');
  const status = request.nextUrl.searchParams.get('status');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20', 10), 100);
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('webhook_deliveries')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (endpointId) {
    query = query.eq('endpoint_id', endpointId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data: deliveries, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count || 0;

  return NextResponse.json({
    data: deliveries || [],
    total,
    pagination: {
      page: Math.floor(offset / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
