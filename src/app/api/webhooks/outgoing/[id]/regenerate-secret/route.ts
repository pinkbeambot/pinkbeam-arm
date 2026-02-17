import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { randomBytes } from 'crypto';

/**
 * POST /api/webhooks/outgoing/[id]/regenerate-secret
 * 
 * Regenerate the secret for a webhook endpoint.
 * This invalidates the old secret immediately.
 * 
 * Response: { data: { secret: string } }
 */
export async function POST(
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

    // Generate a new secret
    const newSecret = `whsec_${randomBytes(32).toString('base64')}`;

    // Update the webhook with new secret
    const { error: updateError } = await supabase
      .from('webhook_endpoints')
      .update({ secret: newSecret })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Webhook regenerate secret error:', updateError);
      return apiError('Failed to regenerate secret', 500, updateError.message);
    }

    return apiSuccess({ secret: newSecret });
  } catch (err) {
    console.error('Webhook regenerate secret exception:', err);
    return apiError('Internal server error', 500);
  }
}
