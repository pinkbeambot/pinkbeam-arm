import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccessList, apiError } from '@/lib/api/response';
import { listWebhookDeliveriesQuerySchema } from '@/lib/validation';

/**
 * GET /api/webhooks/outgoing/deliveries
 * 
 * List webhook delivery history for the current tenant.
 * 
 * Query Parameters:
 * - endpoint_id: Filter by specific endpoint (optional)
 * - status: Filter by status - pending, success, failed, expired (optional)
 * - limit: Number of items per page (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * 
 * Response: { data: WebhookDelivery[], pagination: { page, limit, total, totalPages } }
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = listWebhookDeliveriesQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { endpoint_id, status, limit, offset } = validationResult.data;

    // Build the query with count
    let query = supabase
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply filters
    if (endpoint_id) {
      query = query.eq('endpoint_id', endpoint_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Execute query with pagination
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Webhook deliveries GET error:', error);
      return apiError('Failed to fetch webhook deliveries', 500, error.message);
    }

    const total = count || 0;

    return apiSuccessList(data || [], {
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Webhook deliveries GET exception:', err);
    return apiError('Internal server error', 500);
  }
}
