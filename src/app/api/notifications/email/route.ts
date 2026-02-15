/**
 * Email Notification API Route
 *
 * POST /api/notifications/email - Trigger email notification for a specific notification
 * POST /api/notifications/email?action=task-complete - Trigger task completion emails
 *
 * Server-side only. Checks user preferences before sending.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { processNotificationEmail, sendTaskCompletionEmails } from '@/lib/emails/notification-service';
import { z } from 'zod';

const sendNotificationEmailSchema = z.object({
  notification_id: z.string().uuid(),
});

const sendTaskCompleteSchema = z.object({
  task_id: z.string().uuid(),
  task_title: z.string().min(1),
  agent_name: z.string().min(1),
  completed_at: z.string(),
  duration: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const action = request.nextUrl.searchParams.get('action');

  try {
    if (action === 'task-complete') {
      const body = await request.json();
      const parsed = sendTaskCompleteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { task_id, task_title, agent_name, completed_at, duration } = parsed.data;
      const result = await sendTaskCompletionEmails(
        tenantId,
        task_id,
        task_title,
        agent_name,
        completed_at,
        duration
      );

      return NextResponse.json({
        success: true,
        sent: result.sent,
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    }

    // Default: send email for a specific notification
    const body = await request.json();
    const parsed = sendNotificationEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Fetch the notification
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', parsed.data.notification_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    const result = await processNotificationEmail(notification);

    // Update notification with email delivery status
    const channels_delivered = notification.channels_delivered || [];
    const channels_failed = notification.channels_failed || [];

    if (result.sent) {
      if (!channels_delivered.includes('email')) {
        channels_delivered.push('email');
      }
    } else {
      if (!channels_failed.includes('email')) {
        channels_failed.push('email');
      }
    }

    await supabase
      .from('notifications')
      .update({ channels_delivered, channels_failed })
      .eq('id', notification.id)
      .eq('tenant_id', tenantId);

    return NextResponse.json({
      success: result.sent,
      error: result.error,
    });
  } catch (err) {
    console.error('Email notification error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
