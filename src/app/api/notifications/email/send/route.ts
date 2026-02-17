/**
 * Send Immediate Email API Route
 *
 * POST /api/notifications/email/send - Send an immediate email notification
 *
 * Body options:
 * - type: 'welcome' | 'escalation' | 'decision' | 'task_complete' | 'billing' | 'custom'
 * - to: recipient email address
 * - data: type-specific data
 *
 * Requires authentication and admin/owner role for most types.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';
import {
  sendWelcomeEmail,
  sendEscalationEmail,
  sendDecisionEmail,
  sendTaskCompleteEmail,
  sendBillingEmail,
} from '@/lib/emails/send';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function buildUnsubscribeUrl(tenantId: string, userId: string): string {
  const token = Buffer.from(JSON.stringify({ tenantId, userId, ts: Date.now() })).toString('base64url');
  return `${APP_URL}/api/notifications/unsubscribe?token=${token}`;
}

// Schema for welcome email
const welcomeEmailSchema = z.object({
  type: z.literal('welcome'),
  to: z.string().email(),
  userName: z.string().min(1),
});

// Schema for escalation email
const escalationEmailSchema = z.object({
  type: z.literal('escalation'),
  to: z.string().email(),
  userName: z.string().min(1),
  agentName: z.string().min(1),
  escalationTitle: z.string().min(1),
  urgency: z.enum(['low', 'normal', 'high', 'critical']),
  message: z.string().min(1),
  actionUrl: z.string().url().optional(),
});

// Schema for decision email
const decisionEmailSchema = z.object({
  type: z.literal('decision'),
  to: z.string().email(),
  userName: z.string().min(1),
  agentName: z.string().min(1),
  decisionTitle: z.string().min(1),
  proposedAction: z.string().min(1),
  reasoning: z.string().min(1),
  deadline: z.string().optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  actionUrl: z.string().url().optional(),
});

// Schema for task complete email
const taskCompleteEmailSchema = z.object({
  type: z.literal('task_complete'),
  to: z.string().email(),
  userName: z.string().min(1),
  taskTitle: z.string().min(1),
  agentName: z.string().min(1),
  completedAt: z.string(),
  duration: z.string().optional(),
  actionUrl: z.string().url().optional(),
});

// Schema for billing email
const billingEmailSchema = z.object({
  type: z.literal('billing'),
  to: z.string().email(),
  userName: z.string().min(1),
  emailType: z.enum(['invoice', 'payment_success', 'payment_failed', 'subscription_updated', 'usage_alert']),
  amount: z.string().optional(),
  currency: z.string().default('USD'),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  planName: z.string().optional(),
  usagePercent: z.number().optional(),
  paymentMethod: z.string().optional(),
  failureReason: z.string().optional(),
  actionUrl: z.string().url().optional(),
});

// Combined schema
const sendEmailSchema = z.discriminatedUnion('type', [
  welcomeEmailSchema,
  escalationEmailSchema,
  decisionEmailSchema,
  taskCompleteEmailSchema,
  billingEmailSchema,
]);

/**
 * POST /api/notifications/email/send
 * Send an immediate email
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const parsed = sendEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const unsubscribeUrl = buildUnsubscribeUrl(tenantId, userId);
    let result;

    switch (data.type) {
      case 'welcome': {
        result = await sendWelcomeEmail({
          to: data.to,
          userName: data.userName,
          loginUrl: `${APP_URL}/portal`,
          unsubscribeUrl,
        });
        break;
      }

      case 'escalation': {
        result = await sendEscalationEmail({
          to: data.to,
          userName: data.userName,
          agentName: data.agentName,
          escalationTitle: data.escalationTitle,
          urgency: data.urgency,
          message: data.message,
          actionUrl: data.actionUrl || `${APP_URL}/portal/escalations`,
          unsubscribeUrl,
        });
        break;
      }

      case 'decision': {
        result = await sendDecisionEmail({
          to: data.to,
          userName: data.userName,
          agentName: data.agentName,
          decisionTitle: data.decisionTitle,
          proposedAction: data.proposedAction,
          reasoning: data.reasoning,
          deadline: data.deadline,
          urgency: data.urgency,
          actionUrl: data.actionUrl || `${APP_URL}/portal/decisions`,
          unsubscribeUrl,
        });
        break;
      }

      case 'task_complete': {
        result = await sendTaskCompleteEmail({
          to: data.to,
          userName: data.userName,
          taskTitle: data.taskTitle,
          agentName: data.agentName,
          completedAt: data.completedAt,
          duration: data.duration,
          actionUrl: data.actionUrl || `${APP_URL}/portal/tasks`,
          unsubscribeUrl,
        });
        break;
      }

      case 'billing': {
        result = await sendBillingEmail({
          to: data.to,
          userName: data.userName,
          emailType: data.emailType,
          amount: data.amount,
          currency: data.currency,
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          planName: data.planName,
          usagePercent: data.usagePercent,
          paymentMethod: data.paymentMethod,
          failureReason: data.failureReason,
          actionUrl: data.actionUrl || `${APP_URL}/portal/settings/billing`,
          unsubscribeUrl,
        });
        break;
      }

      default: {
        return NextResponse.json(
          { error: 'Unsupported email type' },
          { status: 400 }
        );
      }
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
