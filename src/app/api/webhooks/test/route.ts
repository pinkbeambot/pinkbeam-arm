/**
 * Webhook Test API Route
 *
 * POST /api/webhooks/test — Send a test webhook to an endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { sendTestWebhook } from '@/lib/webhooks';
import { z } from 'zod';

const testWebhookSchema = z.object({
  endpoint_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId } = auth;

  const body = await request.json();
  const parsed = testWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await sendTestWebhook(parsed.data.endpoint_id, tenantId);

  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
