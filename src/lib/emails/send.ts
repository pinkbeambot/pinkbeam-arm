import * as React from 'react';
import { resend, isResendConfigured, EMAIL_FROM } from '@/lib/resend';
import { EscalationEmail } from './escalation';
import { TaskCompleteEmail } from './task-complete';
import { DailyDigestEmail } from './daily-digest';
import { WeeklySummaryEmail } from './weekly-summary';

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
