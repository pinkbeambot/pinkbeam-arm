/**
 * Webhook Retry Processing API Route
 *
 * POST /api/webhooks/retry — Process pending webhook retries
 *
 * Meant to be called by a cron job (e.g., every minute).
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { processWebhookRetries } from '@/lib/webhooks';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const result = await processWebhookRetries();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Webhook retry processing error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
