/**
 * Email Notification Service
 *
 * Server-side service that checks user notification preferences before
 * sending emails. Integrates with the existing notification system.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { sendEscalationEmail, sendTaskCompleteEmail } from './send';
import type { Notification, NotificationPriority } from '@/types/notification';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Priority ordering for threshold checks
const PRIORITY_LEVELS: Record<NotificationPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};

interface UserEmailInfo {
  email: string;
  name: string;
  userId: string;
}

/**
 * Look up user email and name from the users + auth tables.
 */
async function getUserEmailInfo(
  tenantId: string,
  userId: string
): Promise<UserEmailInfo | null> {
  const supabase = createServiceRoleClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('auth_id, full_name, email')
    .eq('tenant_id', tenantId)
    .eq('auth_id', userId)
    .single();

  if (error || !user) return null;

  // If the users table has email directly, use it
  if (user.email) {
    return {
      email: user.email,
      name: user.full_name || 'there',
      userId,
    };
  }

  // Fall back to auth.users
  const { data: authData } = await supabase.auth.admin.getUserById(userId);
  if (!authData?.user?.email) return null;

  return {
    email: authData.user.email,
    name: user.full_name || 'there',
    userId,
  };
}

/**
 * Check if a user has email enabled for the given notification type and priority.
 */
async function shouldSendEmail(
  tenantId: string,
  userId: string,
  notificationType: string,
  priority: NotificationPriority = 'normal'
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data: pref } = await supabase
    .from('notification_preferences')
    .select('channels, min_priority, quiet_hours')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .single();

  // If no preference exists, use defaults: email is enabled for task_assigned,
  // escalation_received, decision_required, system_alert
  if (!pref) {
    const emailEnabledByDefault = [
      'task_assigned',
      'escalation_received',
      'decision_required',
      'system_alert',
      'warning',
      'error',
    ];
    return emailEnabledByDefault.includes(notificationType);
  }

  // Check if email channel is enabled
  const channels = pref.channels as Record<string, boolean>;
  if (!channels?.email) return false;

  // Check priority threshold
  const minPriority = (pref.min_priority || 'low') as NotificationPriority;
  if (PRIORITY_LEVELS[priority] < PRIORITY_LEVELS[minPriority]) return false;

  // Check quiet hours
  if (pref.quiet_hours) {
    const qh = pref.quiet_hours as { enabled: boolean; start: string; end: string; timezone: string };
    if (qh.enabled) {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: qh.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const currentTime = formatter.format(now);
        const [startH, startM] = qh.start.split(':').map(Number);
        const [endH, endM] = qh.end.split(':').map(Number);
        const [curH, curM] = currentTime.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const currentMinutes = curH * 60 + curM;

        // Handle overnight quiet hours (e.g., 22:00 - 08:00)
        if (startMinutes > endMinutes) {
          if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
            return false;
          }
        } else {
          if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            return false;
          }
        }
      } catch {
        // If timezone parsing fails, don't block the email
      }
    }
  }

  return true;
}

function buildUnsubscribeUrl(tenantId: string, userId: string): string {
  const token = Buffer.from(JSON.stringify({ tenantId, userId, ts: Date.now() })).toString('base64url');
  return `${APP_URL}/api/notifications/unsubscribe?token=${token}`;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Process a notification and send an email if the user's preferences allow it.
 * Called after a notification is created in the database.
 */
export async function processNotificationEmail(notification: Notification): Promise<{ sent: boolean; error?: string }> {
  const { tenant_id, user_id, type, priority } = notification;

  if (!user_id) {
    return { sent: false, error: 'No user_id on notification' };
  }

  // Check preferences
  const shouldSend = await shouldSendEmail(
    tenant_id,
    user_id,
    type,
    (priority || 'normal') as NotificationPriority
  );

  if (!shouldSend) {
    return { sent: false, error: 'Email disabled by user preferences' };
  }

  // Get user info
  const userInfo = await getUserEmailInfo(tenant_id, user_id);
  if (!userInfo) {
    return { sent: false, error: 'User email not found' };
  }

  const unsubscribeUrl = buildUnsubscribeUrl(tenant_id, user_id);

  // Route to the appropriate send function based on notification type
  switch (type) {
    case 'escalation_received': {
      const result = await sendEscalationEmail({
        to: userInfo.email,
        userName: userInfo.name,
        agentName: notification.metadata?.agent_name as string || 'An agent',
        escalationTitle: notification.title,
        urgency: (notification.metadata?.escalation_urgency as 'low' | 'normal' | 'high' | 'critical') || 'normal',
        message: notification.message,
        actionUrl: notification.action_url || `${APP_URL}/portal/escalations`,
        unsubscribeUrl,
      });
      return { sent: result.success, error: result.error };
    }

    case 'task_assigned': {
      // For task_assigned, we send a task-complete style email if the status is completed
      // Otherwise, we use a generic notification approach
      if (notification.metadata?.task_id) {
        const result = await sendTaskCompleteEmail({
          to: userInfo.email,
          userName: userInfo.name,
          taskTitle: notification.metadata.task_title as string || notification.title,
          agentName: notification.metadata.assigner_name as string || 'System',
          completedAt: new Date().toISOString(),
          actionUrl: notification.action_url || `${APP_URL}/portal/tasks`,
          unsubscribeUrl,
        });
        return { sent: result.success, error: result.error };
      }
      return { sent: false, error: 'Missing task metadata' };
    }

    case 'decision_required':
    case 'system_alert':
    case 'warning':
    case 'error': {
      // Use escalation template as a generic alert email for these types
      const result = await sendEscalationEmail({
        to: userInfo.email,
        userName: userInfo.name,
        agentName: notification.metadata?.agent_name as string || 'System',
        escalationTitle: notification.title,
        urgency: type === 'error' ? 'critical' : type === 'warning' ? 'high' : 'normal',
        message: notification.message,
        actionUrl: notification.action_url || `${APP_URL}/portal`,
        unsubscribeUrl,
      });
      return { sent: result.success, error: result.error };
    }

    default:
      return { sent: false, error: `Unsupported notification type for email: ${type}` };
  }
}

/**
 * Send emails for a completed task to all users in the tenant who want notifications.
 */
export async function sendTaskCompletionEmails(
  tenantId: string,
  taskId: string,
  taskTitle: string,
  agentName: string,
  completedAt: string,
  duration?: string
): Promise<{ sent: number; errors: string[] }> {
  const supabase = createServiceRoleClient();
  const errors: string[] = [];
  let sent = 0;

  // Get all users in the tenant
  const { data: users } = await supabase
    .from('users')
    .select('auth_id, full_name, email')
    .eq('tenant_id', tenantId);

  if (!users?.length) {
    return { sent: 0, errors: ['No users found in tenant'] };
  }

  for (const user of users) {
    const shouldSend = await shouldSendEmail(tenantId, user.auth_id, 'task_assigned', 'normal');
    if (!shouldSend) continue;

    let email = user.email;
    if (!email) {
      const { data: authData } = await supabase.auth.admin.getUserById(user.auth_id);
      email = authData?.user?.email || null;
    }
    if (!email) continue;

    const unsubscribeUrl = buildUnsubscribeUrl(tenantId, user.auth_id);
    const result = await sendTaskCompleteEmail({
      to: email,
      userName: user.full_name || 'there',
      taskTitle,
      agentName,
      completedAt,
      duration,
      actionUrl: `${APP_URL}/portal/tasks/${taskId}`,
      unsubscribeUrl,
    });

    if (result.success) {
      sent++;
    } else if (result.error) {
      errors.push(`${email}: ${result.error}`);
    }
  }

  return { sent, errors };
}
