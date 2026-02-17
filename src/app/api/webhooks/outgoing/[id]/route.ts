import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError, apiDeleted } from '@/lib/api/response';
import { updateWebhookEndpointSchema } from '@/lib/validation';

/**
 * GET /api/webhooks/outgoing/[id]
 * 
 * Get a single webhook endpoint by ID.
 * 
 * Response: { data: WebhookEndpoint }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  try {
    // Fetch the webhook endpoint (excluding secret from response)
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('id, tenant_id, url, description, events, is_active, metadata, consecutive_failures, disabled_at, disabled_reason, created_at, updated_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiError('Webhook not found', 404);
      }
      console.error('Webhook GET by ID error:', error);
      return apiError('Failed to fetch webhook', 500, error.message);
    }

    return apiSuccess(data);
  } catch (err) {
    console.error('Webhook GET by ID exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * PATCH /api/webhooks/outgoing/[id]
 * 
 * Update a webhook endpoint.
 * 
 * Body Parameters (all optional):
 * - url: New webhook URL
 * - description: New description
 * - events: New array of event types
 * - is_active: Enable/disable the webhook
 * - metadata: New metadata object
 * 
 * Response: { data: WebhookEndpoint }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = updateWebhookEndpointSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const updateData = validationResult.data;

    // Check if webhook exists and belongs to tenant
    const { data: existingWebhook, error: checkError } = await supabase
      .from('webhook_endpoints')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existingWebhook) {
      return apiError('Webhook not found', 404);
    }

    // If reactivating, clear disabled fields
    if (updateData.is_active === true) {
      (updateData as Record<string, unknown>).disabled_at = null;
      (updateData as Record<string, unknown>).disabled_reason = null;
      (updateData as Record<string, unknown>).consecutive_failures = 0;
    }

    // Update the webhook endpoint
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, tenant_id, url, description, events, is_active, metadata, consecutive_failures, disabled_at, disabled_reason, created_at, updated_at')
      .single();

    if (error) {
      console.error('Webhook PATCH error:', error);
      return apiError('Failed to update webhook', 500, error.message);
    }

    return apiSuccess(data);
  } catch (err) {
    console.error('Webhook PATCH exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * DELETE /api/webhooks/outgoing/[id]
 * 
 * Delete a webhook endpoint and all its delivery history.
 * 
 * Response: { data: { id, deleted: true } }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  try {
    // Check if webhook exists and belongs to tenant
    const { data: existingWebhook, error: checkError } = await supabase
      .from('webhook_endpoints')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existingWebhook) {
      return apiError('Webhook not found', 404);
    }

    // Delete delivery history first (cascade would handle this, but explicit is clearer)
    const { error: deleteDeliveriesError } = await supabase
      .from('webhook_deliveries')
      .delete()
      .eq('endpoint_id', id)
      .eq('tenant_id', tenantId);

    if (deleteDeliveriesError) {
      console.error('Webhook deliveries DELETE error:', deleteDeliveriesError);
      return apiError('Failed to delete webhook delivery history', 500, deleteDeliveriesError.message);
    }

    // Delete the webhook endpoint
    const { error: deleteError } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      console.error('Webhook DELETE error:', deleteError);
      return apiError('Failed to delete webhook', 500, deleteError.message);
    }

    return apiDeleted({ id, deleted: true });
  } catch (err) {
    console.error('Webhook DELETE exception:', err);
    return apiError('Internal server error', 500);
  }
}
