/**
 * @openapi
 * /integrations/slack/test:
 *   post:
 *     summary: Send test Slack message
 *     description: Send a test message to the configured Slack webhook
 *     tags:
 *       - Slack Integration
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Test message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 response_time_ms:
 *                   type: number
 *       400:
 *         description: No webhook configured or test failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { sendSlackNotification, getSlackWebhook } from '@/lib/integrations/slack';
import { createTestMessage } from '@/lib/integrations/slack/templates';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId } = auth;

    // Check if webhook is configured
    const webhook = await getSlackWebhook(tenantId);
    if (!webhook) {
      return NextResponse.json(
        { error: 'No Slack webhook configured. Please configure a webhook first.' },
        { status: 400 }
      );
    }

    // Get app URL from environment or request
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;

    // Create and send test message
    const message = createTestMessage(appUrl);
    const result = await sendSlackNotification(tenantId, message, { skipRateLimit: true });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully to Slack',
        response_time_ms: result.response_time_ms,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to send test message',
        response_time_ms: result.response_time_ms,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/integrations/slack/test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
