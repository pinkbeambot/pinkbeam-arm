import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { sendTestWebhook } from '@/lib/webhooks';

/**
 * POST /api/webhooks/outgoing/[id]/test
 * 
 * Send a test webhook to verify endpoint connectivity.
 * 
 * Response: { data: { success, status_code?, response_time_ms?, error? } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId } = auth;
  const { id } = await params;

  try {
    // Send the test webhook
    const result = await sendTestWebhook(id, tenantId);

    return apiSuccess({
      success: result.success,
      status_code: result.status_code,
      response_time_ms: result.response_time_ms,
      error: result.error,
    });
  } catch (err) {
    console.error('Webhook test exception:', err);
    return apiError('Internal server error', 500);
  }
}
