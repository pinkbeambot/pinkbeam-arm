/**
 * @openapi
 * /integrations/slack/webhook:
 *   get:
 *     summary: Get Slack webhook configuration
 *     description: Retrieve the current Slack webhook configuration for the tenant
 *     tags:
 *       - Slack Integration
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Slack webhook configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     webhook_url:
 *                       type: string
 *                       description: Masked webhook URL
 *                     channel:
 *                       type: string
 *                       nullable: true
 *                     is_active:
 *                       type: boolean
 *                     last_tested_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No webhook configured
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { getSlackWebhook, configureSlackWebhook } from '@/lib/integrations/slack';
import { z } from 'zod';

const configureWebhookSchema = z.object({
  webhook_url: z.string().min(1).max(500),
  channel: z.string().max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId } = auth;

    const webhook = await getSlackWebhook(tenantId);
    
    if (!webhook) {
      return NextResponse.json(
        { error: 'No Slack webhook configured' },
        { status: 404 }
      );
    }

    // Mask the webhook URL for security (show only last 8 chars)
    const maskedUrl = webhook.webhook_url.replace(
      /^(https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/)([a-zA-Z0-9]+)$/,
      '$1••••••••'
    );

    return NextResponse.json({
      data: {
        id: webhook.id,
        webhook_url: maskedUrl,
        channel: webhook.channel,
        is_active: webhook.is_active,
        last_tested_at: webhook.last_tested_at,
        created_at: webhook.created_at,
        updated_at: webhook.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/integrations/slack/webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /integrations/slack/webhook:
 *   post:
 *     summary: Configure Slack webhook
 *     description: Configure or update the Slack webhook URL for the tenant
 *     tags:
 *       - Slack Integration
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - webhook_url
 *             properties:
 *               webhook_url:
 *                 type: string
 *                 description: Slack incoming webhook URL
 *                 example: https://hooks.slack.com/services/T00/B00/xxxxx
 *               channel:
 *                 type: string
 *                 description: Optional channel override
 *                 example: "#notifications"
 *     responses:
 *       200:
 *         description: Webhook configured successfully
 *       400:
 *         description: Invalid webhook URL or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId } = auth;

    const body = await request.json();
    const validatedData = configureWebhookSchema.parse(body);

    const result = await configureSlackWebhook(tenantId, {
      webhook_url: validatedData.webhook_url,
      channel: validatedData.channel,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Mask the webhook URL in response
    const maskedUrl = result.webhook!.webhook_url.replace(
      /^(https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/)([a-zA-Z0-9]+)$/,
      '$1••••••••'
    );

    return NextResponse.json({
      data: {
        id: result.webhook!.id,
        webhook_url: maskedUrl,
        channel: result.webhook!.channel,
        is_active: result.webhook!.is_active,
        last_tested_at: result.webhook!.last_tested_at,
        created_at: result.webhook!.created_at,
        updated_at: result.webhook!.updated_at,
      },
      message: 'Slack webhook configured successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/integrations/slack/webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /integrations/slack/webhook:
 *   delete:
 *     summary: Remove Slack webhook
 *     description: Remove the Slack webhook configuration for the tenant
 *     tags:
 *       - Slack Integration
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Webhook removed successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId } = auth;

    const { removeSlackWebhook } = await import('@/lib/integrations/slack');
    const result = await removeSlackWebhook(tenantId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Slack webhook removed successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/integrations/slack/webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
