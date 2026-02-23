import * as React from 'react';
import { resend, isResendConfigured, EMAIL_FROM } from '@/lib/resend';
import { EscalationEmail } from './escalation';
import { TaskCompleteEmail } from './task-complete';
import { DailyDigestEmail } from './daily-digest';
import { WeeklySummaryEmail } from './weekly-summary';
import { WelcomeEmail } from './welcome';
import { DecisionEmail } from './decision';
import { BillingEmail } from './billing';

// ============================================================================
// Types
// ============================================================================

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EscalationEmailData {
  to: string;
  userName: string;
  agentName: string;
  escalationTitle: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  message: string;
  actionUrl: string;
  unsubscribeUrl: string;
}

interface TaskCompleteEmailData {
  to: string;
  userName: string;
  taskTitle: string;
  agentName: string;
  completedAt: string;
  duration?: string;
  actionUrl: string;
  unsubscribeUrl: string;
}

interface DailyDigestEmailData {
  to: string;
  userName: string;
  date: string;
  totalTasksCompleted: number;
  totalTasksInProgress: number;
  totalEscalations: number;
  agents: Array<{
    name: string;
    tasksCompleted: number;
    tasksInProgress: number;
    escalations: number;
    status: string;
  }>;
  actionUrl: string;
  unsubscribeUrl: string;
}

interface WeeklySummaryEmailData {
  to: string;
  userName: string;
  weekRange: string;
  tasksCompleted: number;
  tasksCompletedChange: number;
  activeAgents: number;
  totalEscalations: number;
  avgResolutionTime: string;
  topPerformer?: { name: string; tasksCompleted: number };
  actionUrl: string;
  unsubscribeUrl: string;
}

interface WelcomeEmailData {
  to: string;
  userName: string;
  loginUrl: string;
  unsubscribeUrl: string;
}

interface DecisionEmailData {
  to: string;
  userName: string;
  agentName: string;
  decisionTitle: string;
  proposedAction: string;
  reasoning: string;
  deadline?: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  actionUrl: string;
  unsubscribeUrl: string;
}

interface BillingEmailData {
  to: string;
  userName: string;
  emailType: 'invoice' | 'payment_success' | 'payment_failed' | 'subscription_updated' | 'usage_alert';
  amount?: string;
  currency?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  planName?: string;
  usagePercent?: number;
  paymentMethod?: string;
  failureReason?: string;
  actionUrl: string;
  unsubscribeUrl: string;
}

// ============================================================================
// Helper
// ============================================================================

async function renderEmail(element: React.ReactElement): Promise<string> {
  // Dynamic import to avoid Next.js Server Component restriction
  const { renderToStaticMarkup } = await import('react-dom/server');
  const html = renderToStaticMarkup(element);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f9fafb;">${html}</body></html>`;
}

// ============================================================================
// Send Functions
// ============================================================================

export async function sendEscalationEmail(data: EscalationEmailData): Promise<SendEmailResult> {
  if (!isResendConfigured() || !resend) {
    return { success: false, error: 'Email service not configured' };
  }

  const urgencySubjects: Record<string, string> = {
    critical: `[CRITICAL] Escalation: ${data.escalationTitle}`,
    high: `[HIGH] Escalation: ${data.escalationTitle}`,
    normal: `Escalation: ${data.escalationTitle}`,
    low: `Escalation: ${data.escalationTitle}`,
  };

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: urgencySubjects[data.urgency] || `Escalation: ${data.escalationTitle}`,
      html: await renderEmail(
        React.createElement(EscalationEmail, {
          userName: data.userName,
          agentName: data.agentName,
          escalationTitle: data.escalationTitle,
          urgency: data.urgency,
          message: data.message,
          actionUrl: data.actionUrl,
          unsubscribeUrl: data.unsubscribeUrl,
        })
      ),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendTaskCompleteEmail(data: TaskCompleteEmailData): Promise<SendEmailResult> {
  if (!isResendConfigured() || !resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `Task Completed: ${data.taskTitle}`,
      html: await renderEmail(
        React.createElement(TaskCompleteEmail, {
          userName: data.userName,
          taskTitle: data.taskTitle,
          agentName: data.agentName,
          completedAt: data.completedAt,
          duration: data.duration,
          actionUrl: data.actionUrl,
          unsubscribeUrl: data.unsubscribeUrl,
        })
      ),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendDailyDigestEmail(data: DailyDigestEmailData): Promise<SendEmailResult> {
  if (!isResendConfigured() || !resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `Daily Digest — ${data.date}`,
      html: await renderEmail(
        React.createElement(DailyDigestEmail, {
          userName: data.userName,
          date: data.date,
          totalTasksCompleted: data.totalTasksCompleted,
          totalTasksInProgress: data.totalTasksInProgress,
          totalEscalations: data.totalEscalations,
          agents: data.agents,
          actionUrl: data.actionUrl,
          unsubscribeUrl: data.unsubscribeUrl,
        })
      ),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendWeeklySummaryEmail(data: WeeklySummaryEmailData): Promise<SendEmailResult> {
  if (!isResendConfigured() || !resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `Weekly Summary — ${data.weekRange}`,
      html: await renderEmail(
        React.createElement(WeeklySummaryEmail, {
          userName: data.userName,
          weekRange: data.weekRange,
          tasksCompleted: data.tasksCompleted,
          tasksCompletedChange: data.tasksCompletedChange,
          activeAgents: data.activeAgents,
          totalEscalations: data.totalEscalations,
          avgResolutionTime: data.avgResolutionTime,
          topPerformer: data.topPerformer,
          actionUrl: data.actionUrl,
          unsubscribeUrl: data.unsubscribeUrl,
        })
      ),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<SendEmailResult> {
  if (!isResendConfigured() || !resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: 'Welcome to Pink Beam ARM!',
      html: await renderEmail(
        React.createElement(WelcomeEmail, {
          userName: data.userName,
          loginUrl: data.loginUrl,
          unsubscribeUrl: data.unsubscribeUrl,
        })
      ),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendDecisionEmail(data: DecisionEmailData): Promise<SendEmailResult> {
  if (!isResendConfigured() || !resend) {
    return { success: false, error: 'Email service not configured' };
  }

  const urgencySubjects: Record<string, string> = {
    critical: `[ACTION REQUIRED] Decision: ${data.decisionTitle}`,
    high: `[ACTION REQUIRED] Decision: ${data.decisionTitle}`,
    normal: `Decision Requiring Approval: ${data.decisionTitle}`,
    low: `Decision: ${data.decisionTitle}`,
  };

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: urgencySubjects[data.urgency] || `Decision: ${data.decisionTitle}`,
      html: await renderEmail(
        React.createElement(DecisionEmail, {
          userName: data.userName,
          agentName: data.agentName,
          decisionTitle: data.decisionTitle,
          proposedAction: data.proposedAction,
          reasoning: data.reasoning,
          deadline: data.deadline,
          urgency: data.urgency,
          actionUrl: data.actionUrl,
          unsubscribeUrl: data.unsubscribeUrl,
        })
      ),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendBillingEmail(data: BillingEmailData): Promise<SendEmailResult> {
  if (!isResendConfigured() || !resend) {
    return { success: false, error: 'Email service not configured' };
  }

  const subjectMap: Record<string, string> = {
    invoice: 'Your Pink Beam Invoice is Ready',
    payment_success: 'Payment Confirmation - Pink Beam',
    payment_failed: 'Payment Failed - Action Required',
    subscription_updated: 'Your Subscription Has Been Updated',
    usage_alert: 'Usage Limit Approaching - Pink Beam',
  };

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: subjectMap[data.emailType] || 'Pink Beam Billing Notification',
      html: await renderEmail(
        React.createElement(BillingEmail, {
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
          actionUrl: data.actionUrl,
          unsubscribeUrl: data.unsubscribeUrl,
        })
      ),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
