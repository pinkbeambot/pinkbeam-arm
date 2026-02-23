import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiSuccessList, apiError } from '@/lib/api/response';
import { createWebhookEndpointSchema, listWebhookDeliveriesQuerySchema } from '@/lib/validation';
import { randomBytes } from 'crypto';

/**
 * GET /api/webhooks/outgoing
 * 
 * List all webhook endpoints for the current tenant.
 * 
 * Query Parameters:
 * - limit: Number of items per page (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * 
 * Response: { data: WebhookEndpoint[], pagination: { total, limit, offset } }
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    // Parse pagination params
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get total count
    const { count, error: countError } = await supabase
      .from('webhook_endpoints')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (countError) {
      console.error('Webhook count error:', countError);
      return apiError('Failed to count webhooks', 500, countError.message);
    }

    // Fetch endpoints (excluding secret from list view)
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('id, tenant_id, url, description, events, is_active, metadata, consecutive_failures, disabled_at, disabled_reason, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Webhook list error:', error);
      return apiError('Failed to fetch webhooks', 500, error.message);
    }

    const total = count || 0;

    return apiSuccessList(data || [], {
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Webhook GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * POST /api/webhooks/outgoing
 * 
 * Register a new webhook endpoint for the current tenant.
 * 
 * Body Parameters:
 * - url: Webhook URL (required, must be valid HTTPS URL)
 * - description: Optional description
 * - events: Array of event types to subscribe to (required, min 1)
 * - metadata: Optional metadata object
 * 
 * Response: { data: WebhookEndpoint } (201 Created)
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = createWebhookEndpointSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { url, description, events, metadata } = validationResult.data;

    // Generate a secure secret for HMAC signing
    const secret = `whsec_${randomBytes(32).toString('base64')}`;

    // Insert the webhook endpoint
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        tenant_id: tenantId,
        url,
        description,
        events,
        secret,
        metadata: metadata || {},
        is_active: true,
        consecutive_failures: 0,
      })
      .select('id, tenant_id, url, description, events, is_active, metadata, consecutive_failures, disabled_at, disabled_reason, created_at, updated_at')
      .single();

    if (error) {
      console.error('Webhook POST error:', error);
      return apiError('Failed to create webhook', 500, error.message);
    }

    return apiSuccess(data, 201);
  } catch (err) {
    console.error('Webhook POST exception:', err);
    return apiError('Internal server error', 500);
  }
}
