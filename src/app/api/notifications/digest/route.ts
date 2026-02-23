/**
 * Digest Email API Route
 *
 * POST /api/notifications/digest?type=daily  - Trigger daily digest for a tenant
 * POST /api/notifications/digest?type=weekly - Trigger weekly summary for a tenant
 *
 * These are meant to be called by a cron job (e.g., Supabase Edge Function,
 * Vercel Cron, or external scheduler) with an authorization header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { sendDailyDigestEmail, sendWeeklySummaryEmail } from '@/lib/emails/send';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function buildUnsubscribeUrl(tenantId: string, userId: string): string {
  const token = Buffer.from(JSON.stringify({ tenantId, userId, ts: Date.now() })).toString('base64url');
  return `${APP_URL}/api/notifications/unsubscribe?token=${token}`;
}

async function getUsersWithEmailEnabled(
  tenantId: string,
  notificationType: string
): Promise<Array<{ auth_id: string; name: string; email: string }>> {
  const supabase = createServiceRoleClient();

  // Get all users in the tenant
  const { data: users } = await supabase
    .from('users')
    .select('auth_id, name, email')
    .eq('tenant_id', tenantId);

  if (!users?.length) return [];

  // Check preferences for each user
  const eligible: typeof users = [];

  for (const user of users) {
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('channels')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.auth_id)
      .eq('notification_type', notificationType)
      .single();

    // Default is email enabled for system_alert
    const emailEnabled = pref
      ? (pref.channels as Record<string, boolean>)?.email !== false
      : true;

    if (emailEnabled) {
      let email = user.email;
      if (!email) {
        const { data: authData } = await supabase.auth.admin.getUserById(user.auth_id);
        email = authData?.user?.email || null;
      }
      if (email) {
        eligible.push({ ...user, email });
      }
    }
  }

  return eligible;
}

async function sendDailyDigests(tenantId: string): Promise<{ sent: number; errors: string[] }> {
  const supabase = createServiceRoleClient();
  const errors: string[] = [];
  let sent = 0;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Get tasks completed in last 24 hours
  const { data: completedTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('updated_at', yesterday.toISOString());

  // Get tasks currently in progress
  const { data: inProgressTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'in_progress');

  // Get escalations from last 24 hours
  const { data: escalations } = await supabase
    .from('escalations')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('created_at', yesterday.toISOString());

  // Get agent summaries
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'terminated');

  const agentSummaries = await Promise.all(
    (agents || []).map(async (agent) => {
      const { count: completed } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('assignee_id', agent.id)
        .eq('status', 'completed')
        .gte('updated_at', yesterday.toISOString());

      const { count: inProgress } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('assignee_id', agent.id)
        .eq('status', 'in_progress');

      const { count: agentEscalations } = await supabase
        .from('escalations')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('agent_id', agent.id)
        .gte('created_at', yesterday.toISOString());

      return {
        name: agent.name,
        tasksCompleted: completed || 0,
        tasksInProgress: inProgress || 0,
        escalations: agentEscalations || 0,
        status: agent.status,
      };
    })
  );

  const users = await getUsersWithEmailEnabled(tenantId, 'system_alert');

  for (const user of users) {
    const result = await sendDailyDigestEmail({
      to: user.email,
      userName: user.name || 'there',
      date: dateStr,
      totalTasksCompleted: completedTasks?.length || 0,
      totalTasksInProgress: inProgressTasks?.length || 0,
      totalEscalations: escalations?.length || 0,
      agents: agentSummaries,
      actionUrl: `${APP_URL}/portal`,
      unsubscribeUrl: buildUnsubscribeUrl(tenantId, user.auth_id),
    });

    if (result.success) {
      sent++;
    } else if (result.error) {
      errors.push(`${user.email}: ${result.error}`);
    }
  }

  return { sent, errors };
}

async function sendWeeklySummaries(tenantId: string): Promise<{ sent: number; errors: string[] }> {
  const supabase = createServiceRoleClient();
  const errors: string[] = [];
  let sent = 0;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const weekRange = `${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Tasks completed this week
  const { data: thisWeekTasks } = await supabase
    .from('tasks')
    .select('id, assignee_id, updated_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('updated_at', weekAgo.toISOString());

  // Tasks completed previous week (for comparison)
  const { data: lastWeekTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('updated_at', twoWeeksAgo.toISOString())
    .lt('updated_at', weekAgo.toISOString());

  const thisWeekCount = thisWeekTasks?.length || 0;
  const lastWeekCount = lastWeekTasks?.length || 0;
  const change = lastWeekCount > 0
    ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
    : thisWeekCount > 0 ? 100 : 0;

  // Active agents
  const { count: activeAgents } = await supabase
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'idle']);

  // Escalations this week
  const { data: weekEscalations } = await supabase
    .from('escalations')
    .select('id, created_at, resolved_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', weekAgo.toISOString());

  // Calculate avg resolution time
  const resolvedEscalations = (weekEscalations || []).filter((e) => e.resolved_at);
  let avgResolutionTime = 'N/A';
  if (resolvedEscalations.length > 0) {
    const totalMs = resolvedEscalations.reduce((sum, e) => {
      return sum + (new Date(e.resolved_at).getTime() - new Date(e.created_at).getTime());
    }, 0);
    const avgMs = totalMs / resolvedEscalations.length;
    const avgHours = avgMs / (1000 * 60 * 60);
    if (avgHours < 1) {
      avgResolutionTime = `${Math.round(avgMs / (1000 * 60))}m`;
    } else if (avgHours < 24) {
      avgResolutionTime = `${avgHours.toFixed(1)}h`;
    } else {
      avgResolutionTime = `${(avgHours / 24).toFixed(1)}d`;
    }
  }

  // Top performer
  let topPerformer: { name: string; tasksCompleted: number } | undefined;
  if (thisWeekTasks && thisWeekTasks.length > 0) {
    const agentCounts: Record<string, number> = {};
    for (const task of thisWeekTasks) {
      if (task.assignee_id) {
        agentCounts[task.assignee_id] = (agentCounts[task.assignee_id] || 0) + 1;
      }
    }
    const topAgentId = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0];
    if (topAgentId) {
      const { data: agent } = await supabase
        .from('agents')
        .select('name')
        .eq('id', topAgentId[0])
        .single();
      if (agent) {
        topPerformer = { name: agent.name, tasksCompleted: topAgentId[1] };
      }
    }
  }

  const users = await getUsersWithEmailEnabled(tenantId, 'system_alert');

  for (const user of users) {
    const result = await sendWeeklySummaryEmail({
      to: user.email,
      userName: user.name || 'there',
      weekRange,
      tasksCompleted: thisWeekCount,
      tasksCompletedChange: change,
      activeAgents: activeAgents || 0,
      totalEscalations: weekEscalations?.length || 0,
      avgResolutionTime,
      topPerformer,
      actionUrl: `${APP_URL}/portal/analytics`,
      unsubscribeUrl: buildUnsubscribeUrl(tenantId, user.auth_id),
    });

    if (result.success) {
      sent++;
    } else if (result.error) {
      errors.push(`${user.email}: ${result.error}`);
    }
  }

  return { sent, errors };
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId } = auth;
  const digestType = request.nextUrl.searchParams.get('type');

  if (!digestType || !['daily', 'weekly'].includes(digestType)) {
    return NextResponse.json(
      { error: 'Invalid digest type. Use ?type=daily or ?type=weekly' },
      { status: 400 }
    );
  }

  try {
    const result = digestType === 'daily'
      ? await sendDailyDigests(tenantId)
      : await sendWeeklySummaries(tenantId);

    return NextResponse.json({
      success: true,
      type: digestType,
      sent: result.sent,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (err) {
    console.error(`${digestType} digest error:`, err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
