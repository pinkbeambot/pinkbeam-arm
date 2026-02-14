/**
 * Status Intent Handler
 * Issue: #17 - Meta-Agent Natural Language Interface
 * 
 * Handles status queries about agents, tasks, escalations, and the workforce.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IntentHandlerInput,
  IntentHandlerContext,
  IntentHandlerOutput,
  StatusQueryParams,
  WorkforceStatus,
} from '@/types/meta-agent';

/**
 * Handle status intent
 */
export async function handleStatusIntent(
  input: IntentHandlerInput,
  context: IntentHandlerContext
): Promise<IntentHandlerOutput> {
  const { entities, raw_message } = input;
  const { supabase, tenant_id } = context;
  
  try {
    // Determine query scope
    const params = parseStatusQuery(raw_message, entities);
    
    switch (params.scope) {
      case 'workforce':
        return await getWorkforceStatus(supabase as SupabaseClient, tenant_id, params);
      case 'agent':
        return await getAgentStatus(supabase as SupabaseClient, tenant_id, entities);
      case 'tasks':
        return await getTasksStatus(supabase as SupabaseClient, tenant_id, params);
      case 'escalations':
        return await getEscalationsStatus(supabase as SupabaseClient, tenant_id, params);
      case 'decisions':
        return await getDecisionsStatus(supabase as SupabaseClient, tenant_id, params);
      case 'system':
        return await getSystemStatus(supabase as SupabaseClient, tenant_id);
      default:
        return await getWorkforceStatus(supabase as SupabaseClient, tenant_id, params);
    }
  } catch (error) {
    console.error('Error in status handler:', error);
    return {
      success: false,
      result_summary: 'Failed to retrieve status',
      response_message: 'I encountered an error while fetching the status information. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse status query parameters from message and entities
 */
function parseStatusQuery(message: string, entities: { agent_names?: string[]; time_ranges?: string[] }): StatusQueryParams {
  const lowerMessage = message.toLowerCase();
  
  // Determine scope
  let scope: StatusQueryParams['scope'] = 'workforce';
  
  if (/agent|bot/.test(lowerMessage) && entities.agent_names?.length) {
    scope = 'agent';
  } else if (/task/.test(lowerMessage)) {
    scope = 'tasks';
  } else if (/escalation/.test(lowerMessage)) {
    scope = 'escalations';
  } else if (/decision/.test(lowerMessage)) {
    scope = 'decisions';
  } else if (/system|platform/.test(lowerMessage)) {
    scope = 'system';
  }
  
  // Determine time range
  let time_range: StatusQueryParams['time_range'] = 'all';
  if (/today/.test(lowerMessage)) {
    time_range = 'today';
  } else if (/week|7 days/.test(lowerMessage)) {
    time_range = 'week';
  } else if (/month|30 days/.test(lowerMessage)) {
    time_range = 'month';
  }
  
  return {
    scope,
    agent_name: entities.agent_names?.[0],
    time_range,
    include_stats: true,
    include_recent_activity: true,
  };
}

/**
 * Get workforce status
 */
async function getWorkforceStatus(
  supabase: SupabaseClient,
  tenant_id: string,
  params: StatusQueryParams
): Promise<IntentHandlerOutput> {
  // Get agent counts by status
  const { data: agentStats, error: agentError } = await supabase
    .from('agents')
    .select('status')
    .eq('tenant_id', tenant_id)
    .neq('status', 'terminated');
  
  if (agentError) throw agentError;
  
  const statusCounts = {
    total: agentStats?.length || 0,
    active: agentStats?.filter(a => a.status === 'active').length || 0,
    idle: agentStats?.filter(a => a.status === 'idle').length || 0,
    paused: agentStats?.filter(a => a.status === 'paused').length || 0,
    error: agentStats?.filter(a => a.status === 'error').length || 0,
    blocked: agentStats?.filter(a => a.status === 'blocked').length || 0,
    initializing: agentStats?.filter(a => a.status === 'initializing').length || 0,
  };
  
  // Get recent agents
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, name, role, status, current_task_id, stats')
    .eq('tenant_id', tenant_id)
    .neq('status', 'terminated')
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (agentsError) throw agentsError;
  
  // Get active task count
  const { count: activeTasksCount, error: tasksError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenant_id)
    .in('status', ['queued', 'in_progress', 'blocked', 'review']);
  
  if (tasksError) throw tasksError;
  
  // Get open escalations count
  const { count: openEscalations, error: escError } = await supabase
    .from('escalations')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenant_id)
    .in('status', ['open', 'in_progress']);
  
  if (escError) throw escError;
  
  // Get pending decisions count
  const { count: pendingDecisions, error: decError } = await supabase
    .from('decisions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenant_id)
    .eq('status', 'proposed');
  
  if (decError) throw decError;
  
  // Build response
  const status = {
    summary: statusCounts,
    agents: agents || [],
    active_tasks: activeTasksCount || 0,
    open_escalations: openEscalations || 0,
    pending_decisions: pendingDecisions || 0,
  };
  
  // Generate natural language response
  let response = `**Workforce Status:**\n\n`;
  response += `You have **${statusCounts.total} agents** in your workforce:\n`;
  response += `• **${statusCounts.active}** currently working\n`;
  response += `• **${statusCounts.idle}** available for tasks\n`;
  
  if (statusCounts.paused > 0) {
    response += `• **${statusCounts.paused}** paused\n`;
  }
  if (statusCounts.error > 0) {
    response += `• **${statusCounts.error}** in error state ⚠️\n`;
  }
  if (statusCounts.blocked > 0) {
    response += `• **${statusCounts.blocked}** blocked waiting for input\n`;
  }
  
  response += `\n**Current Workload:**\n`;
  response += `• **${activeTasksCount || 0}** active tasks\n`;
  response += `• **${openEscalations || 0}** open escalations`;
  if (openEscalations && openEscalations > 0) {
    response += ` ⚠️`;
  }
  response += `\n`;
  response += `• **${pendingDecisions || 0}** decisions awaiting approval\n`;
  
  if (agents && agents.length > 0) {
    response += `\n**Most Recently Active:**\n`;
    agents.slice(0, 5).forEach(agent => {
      const statusEmoji = {
        active: '🟢',
        idle: '⚪',
        paused: '⏸️',
        error: '🔴',
        blocked: '🟡',
        initializing: '🔵',
      }[agent.status] || '⚪';
      
      const taskInfo = agent.current_task_id ? ' (working)' : '';
      response += `${statusEmoji} **${agent.name}** - ${agent.role}${taskInfo}\n`;
    });
  }
  
  return {
    success: true,
    result: status,
    result_summary: `Workforce status: ${statusCounts.total} agents, ${statusCounts.active} active, ${statusCounts.idle} idle`,
    response_message: response,
    suggested_followups: [
      'Show me the tasks in progress',
      'What are my agents working on?',
      openEscalations && openEscalations > 0 ? 'Show me the open escalations' : null,
      statusCounts.error > 0 ? 'Which agents are in error state?' : null,
    ].filter(Boolean) as string[],
  };
}

/**
 * Get specific agent status
 */
async function getAgentStatus(
  supabase: SupabaseClient,
  tenant_id: string,
  entities: { agent_names?: string[] }
): Promise<IntentHandlerOutput> {
  const agentName = entities.agent_names?.[0];
  
  if (!agentName) {
    return {
      success: false,
      result_summary: 'No agent specified',
      response_message: 'Which agent would you like to know about? Please specify the agent name.',
    };
  }
  
  // Search for agent by name
  const { data: agents, error } = await supabase
    .from('agents')
    .select(`
      *,
      current_task:current_task_id(id, title, status, priority, progress_percent)
    `)
    .eq('tenant_id', tenant_id)
    .ilike('name', `%${agentName}%`)
    .limit(5);
  
  if (error) throw error;
  
  if (!agents || agents.length === 0) {
    return {
      success: true,
      result: null,
      result_summary: `Agent "${agentName}" not found`,
      response_message: `I couldn't find an agent named "${agentName}". Use "show my agents" to see who's in your workforce.`,
    };
  }
  
  if (agents.length > 1) {
    const agentList = agents.map(a => `• ${a.name} (${a.role})`).join('\n');
    return {
      success: true,
      result: agents,
      result_summary: `Found ${agents.length} matching agents`,
      response_message: `I found multiple agents matching "${agentName}":\n\n${agentList}\n\nPlease be more specific about which one you mean.`,
    };
  }
  
  const agent = agents[0];
  
  // Get recent tasks
  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('id, title, status, completed_at')
    .eq('tenant_id', tenant_id)
    .eq('assignee_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(5);
  
  // Get recent activities
  const { data: recentActivities } = await supabase
    .from('activities')
    .select('type, title, created_at')
    .eq('tenant_id', tenant_id)
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(5);
  
  const stats = agent.stats || {};
  
  let response = `**${agent.name}** (${agent.role})\n\n`;
  response += `**Status:** ${agent.status}${agent.status_reason ? ` - ${agent.status_reason}` : ''}\n`;
  
  if (agent.current_task) {
    response += `\n**Current Task:** ${agent.current_task.title}\n`;
    response += `Progress: ${agent.current_task.progress_percent || 0}% | Priority: ${agent.current_task.priority}\n`;
  }
  
  response += `\n**Stats:**\n`;
  response += `• Tasks completed: ${stats.tasks_completed || 0}\n`;
  response += `• Tasks failed: ${stats.tasks_failed || 0}\n`;
  response += `• Escalations raised: ${stats.escalations_raised || 0}\n`;
  response += `• Avg task duration: ${formatDuration(stats.avg_task_duration_seconds || 0)}\n`;
  response += `• Total cost: $${(stats.total_cost_usd || 0).toFixed(2)}\n`;
  
  if (recentTasks && recentTasks.length > 0) {
    response += `\n**Recent Tasks:**\n`;
    recentTasks.forEach(task => {
      const statusEmoji = task.status === 'completed' ? '✅' : 
                          task.status === 'failed' ? '❌' : '📋';
      response += `${statusEmoji} ${task.title}\n`;
    });
  }
  
  return {
    success: true,
    result: agent,
    result_summary: `${agent.name} is ${agent.status}`,
    response_message: response,
    suggested_followups: agent.current_task 
      ? ['What else are they working on?', `Pause ${agent.name}`, `Reassign their task`]
      : ['Assign them a task', `Show ${agent.name}'s recent activity`],
  };
}

/**
 * Get tasks status
 */
async function getTasksStatus(
  supabase: SupabaseClient,
  tenant_id: string,
  params: StatusQueryParams
): Promise<IntentHandlerOutput> {
  let timeFilter: string | null = null;
  
  if (params.time_range === 'today') {
    timeFilter = new Date().toISOString().split('T')[0];
  }
  
  // Get task counts by status
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('status, priority, title, assignee_id, created_at')
    .eq('tenant_id', tenant_id)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  
  const statusCounts = {
    queued: tasks?.filter(t => t.status === 'queued').length || 0,
    in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    blocked: tasks?.filter(t => t.status === 'blocked').length || 0,
    review: tasks?.filter(t => t.status === 'review').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
    failed: tasks?.filter(t => t.status === 'failed').length || 0,
    cancelled: tasks?.filter(t => t.status === 'cancelled').length || 0,
  };
  
  const total = tasks?.length || 0;
  const active = statusCounts.in_progress + statusCounts.queued + statusCounts.blocked + statusCounts.review;
  
  // Get urgent tasks
  const urgentTasks = tasks?.filter(t => t.priority === 'urgent' && t.status !== 'completed' && t.status !== 'cancelled');
  
  let response = `**Task Pipeline Status**\n\n`;
  response += `**Overview:** ${total} total tasks (${active} active)\n\n`;
  response += `**By Status:**\n`;
  response += `• 🟢 In Progress: ${statusCounts.in_progress}\n`;
  response += `• 📋 Queued: ${statusCounts.queued}\n`;
  response += `• 🟡 Blocked: ${statusCounts.blocked}\n`;
  response += `• 👁️ In Review: ${statusCounts.review}\n`;
  response += `• ✅ Completed: ${statusCounts.completed}\n`;
  response += `• ❌ Failed: ${statusCounts.failed}\n`;
  
  if (urgentTasks && urgentTasks.length > 0) {
    response += `\n**⚠️ Urgent Tasks (${urgentTasks.length}):**\n`;
    urgentTasks.slice(0, 5).forEach(task => {
      response += `• ${task.title}\n`;
    });
  }
  
  return {
    success: true,
    result: { statusCounts, urgentTasks },
    result_summary: `${total} tasks, ${active} active, ${urgentTasks?.length || 0} urgent`,
    response_message: response,
    suggested_followups: urgentTasks && urgentTasks.length > 0 
      ? ['Show me all urgent tasks', 'Who is working on urgent tasks?']
      : ['Show me recent completed tasks', 'What tasks are blocked?'],
  };
}

/**
 * Get escalations status
 */
async function getEscalationsStatus(
  supabase: SupabaseClient,
  tenant_id: string,
  params: StatusQueryParams
): Promise<IntentHandlerOutput> {
  const { data: escalations, error } = await supabase
    .from('escalations')
    .select(`
      *,
      agent:agent_id(name, role)
    `)
    .eq('tenant_id', tenant_id)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) throw error;
  
  const criticalCount = escalations?.filter(e => e.urgency === 'critical').length || 0;
  const highCount = escalations?.filter(e => e.urgency === 'high').length || 0;
  
  let response = `**Escalation Status**\n\n`;
  response += `**${escalations?.length || 0} Open Escalations**\n`;
  
  if (criticalCount > 0) {
    response += `🔴 **${criticalCount} Critical** - requires immediate attention\n`;
  }
  if (highCount > 0) {
    response += `🟠 **${highCount} High** - should be addressed soon\n`;
  }
  
  response += `\n**Recent Escalations:**\n`;
  
  if (escalations && escalations.length > 0) {
    escalations.slice(0, 10).forEach(esc => {
      const urgencyEmoji = { critical: '🔴', high: '🟠', normal: '🟡', low: '🟢' }[esc.urgency] || '⚪';
      response += `${urgencyEmoji} **${esc.title}**\n`;
      response += `   From: ${esc.agent?.name || 'Unknown'} | Status: ${esc.status}\n`;
    });
  } else {
    response += `No open escalations! 🎉`;
  }
  
  return {
    success: true,
    result: escalations,
    result_summary: `${escalations?.length || 0} open escalations`,
    response_message: response,
    suggested_followups: escalations && escalations.length > 0 
      ? ['Resolve the critical escalations', 'Show me escalation details']
      : ['Show resolved escalations', 'What were recent escalations about?'],
  };
}

/**
 * Get decisions status
 */
async function getDecisionsStatus(
  supabase: SupabaseClient,
  tenant_id: string,
  params: StatusQueryParams
): Promise<IntentHandlerOutput> {
  const { data: decisions, error } = await supabase
    .from('decisions')
    .select(`
      *,
      agent:agent_id(name)
    `)
    .eq('tenant_id', tenant_id)
    .in('status', ['proposed', 'approved'])
    .order('proposed_at', { ascending: false })
    .limit(20);
  
  if (error) throw error;
  
  const proposedCount = decisions?.filter(d => d.status === 'proposed').length || 0;
  
  let response = `**Decisions Status**\n\n`;
  response += `**${proposedCount} Awaiting Your Decision**\n\n`;
  
  if (decisions && decisions.length > 0) {
    decisions.slice(0, 10).forEach(dec => {
      const statusEmoji = dec.status === 'proposed' ? '⏳' : '✅';
      response += `${statusEmoji} **${dec.title}**\n`;
      response += `   By: ${dec.agent?.name || 'Unknown'} | Confidence: ${Math.round((dec.reasoning?.confidence || 0) * 100)}%\n`;
    });
  } else {
    response += `No pending decisions. All caught up! 🎉`;
  }
  
  return {
    success: true,
    result: decisions,
    result_summary: `${proposedCount} decisions awaiting approval`,
    response_message: response,
    suggested_followups: proposedCount > 0 
      ? ['Show me the proposed decisions', 'Approve all low-risk decisions']
      : ['Show recent decisions', 'What decisions were made this week?'],
  };
}

/**
 * Get system status
 */
async function getSystemStatus(
  supabase: SupabaseClient,
  tenant_id: string
): Promise<IntentHandlerOutput> {
  // Get various system metrics
  const [
    { count: agentCount },
    { count: taskCount },
    { count: escalationCount },
    { count: decisionCount },
    { data: analytics },
  ] = await Promise.all([
    supabase.from('agents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id),
    supabase.from('escalations').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id),
    supabase.from('decisions').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id),
    supabase.from('analytics_daily')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('date', { ascending: false })
      .limit(7),
  ]);
  
  const latestAnalytics = analytics?.[0];
  
  let response = `**System Status**\n\n`;
  response += `**Data Overview:**\n`;
  response += `• Agents: ${agentCount || 0}\n`;
  response += `• Tasks: ${taskCount || 0}\n`;
  response += `• Escalations: ${escalationCount || 0}\n`;
  response += `• Decisions: ${decisionCount || 0}\n`;
  
  if (latestAnalytics) {
    response += `\n**Today's Activity:**\n`;
    response += `• Tasks created: ${latestAnalytics.tasks_created}\n`;
    response += `• Tasks completed: ${latestAnalytics.tasks_completed}\n`;
    response += `• Decisions made: ${latestAnalytics.decisions_made}\n`;
    response += `• Total cost: $${latestAnalytics.total_cost_usd.toFixed(2)}\n`;
  }
  
  return {
    success: true,
    result: { agentCount, taskCount, escalationCount, decisionCount, analytics },
    result_summary: 'System overview retrieved',
    response_message: response,
    suggested_followups: ['Show system health', 'What are my costs this month?'],
  };
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
}
