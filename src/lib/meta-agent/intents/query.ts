/**
 * Query Intent Handler
 * Issue: #17 - Meta-Agent Natural Language Interface
 * 
 * Handles general queries about the system state.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IntentHandlerInput,
  IntentHandlerContext,
  IntentHandlerOutput,
  QueryParams,
} from '@/types/meta-agent';

/**
 * Handle query intent
 */
export async function handleQueryIntent(
  input: IntentHandlerInput,
  context: IntentHandlerContext
): Promise<IntentHandlerOutput> {
  const { entities, raw_message } = input;
  const { supabase, tenant_id } = context;
  
  try {
    // Parse query parameters
    const params = parseQueryParams(raw_message, entities);
    
    switch (params.query_type) {
      case 'agent_info':
        return await queryAgentInfo(supabase as SupabaseClient, tenant_id, params);
      case 'task_status':
        return await queryTaskStatus(supabase as SupabaseClient, tenant_id, params);
      case 'activity_history':
        return await queryActivityHistory(supabase as SupabaseClient, tenant_id, params);
      case 'performance':
        return await queryPerformance(supabase as SupabaseClient, tenant_id, params);
      case 'general':
      default:
        return await handleGeneralQuery(supabase as SupabaseClient, tenant_id, raw_message, entities);
    }
  } catch (error) {
    console.error('Error in query handler:', error);
    return {
      success: false,
      result_summary: 'Failed to process query',
      response_message: 'I encountered an error while processing your question. Please try rephrasing it.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse query parameters
 */
function parseQueryParams(message: string, entities: { 
  agent_names?: string[]; 
  time_ranges?: string[];
  task_ids?: string[];
}): QueryParams {
  const lowerMessage = message.toLowerCase();
  
  let queryType: QueryParams['query_type'] = 'general';
  
  // Determine query type
  if (/agent|bot/.test(lowerMessage)) {
    queryType = 'agent_info';
  } else if (/task|work|assignment|job/.test(lowerMessage)) {
    queryType = 'task_status';
  } else if (/activity|history|log|what happened/.test(lowerMessage)) {
    queryType = 'activity_history';
  } else if (/performance|metric|stat|how many|how much|average/.test(lowerMessage)) {
    queryType = 'performance';
  }
  
  // Determine time range
  let timeRange: string | undefined;
  if (/today/.test(lowerMessage)) {
    timeRange = 'today';
  } else if (/week|7 days/.test(lowerMessage)) {
    timeRange = 'week';
  } else if (/month|30 days/.test(lowerMessage)) {
    timeRange = 'month';
  }
  
  return {
    query_type: queryType,
    target_entity: entities.agent_names?.[0],
    time_range: timeRange,
  };
}

/**
 * Query agent information
 */
async function queryAgentInfo(
  supabase: SupabaseClient,
  tenant_id: string,
  params: QueryParams
): Promise<IntentHandlerOutput> {
  // If specific agent mentioned, get their info
  if (params.target_entity) {
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*, current_task:current_task_id(id, title, status)')
      .eq('tenant_id', tenant_id)
      .ilike('name', `%${params.target_entity}%`)
      .single();
    
    if (error || !agent) {
      return {
        success: true,
        result: null,
        result_summary: `Agent "${params.target_entity}" not found`,
        response_message: `I couldn't find an agent named "${params.target_entity}".`,
      };
    }
    
    const stats = agent.stats || {};
    
    return {
      success: true,
      result: agent,
      result_summary: `Found agent ${agent.name}`,
      response_message: `**${agent.name}** is a ${agent.role} currently ${agent.status}. They've completed ${stats.tasks_completed || 0} tasks with a total cost of $${(stats.total_cost_usd || 0).toFixed(2)}.`,
    };
  }
  
  // Otherwise get general agent stats
  const { data: agents, error } = await supabase
    .from('agents')
    .select('status, role')
    .eq('tenant_id', tenant_id)
    .neq('status', 'terminated');
  
  if (error) throw error;
  
  const roleCounts: Record<string, number> = {};
  agents?.forEach(agent => {
    roleCounts[agent.role] = (roleCounts[agent.role] || 0) + 1;
  });
  
  const roleSummary = Object.entries(roleCounts)
    .map(([role, count]) => `${count} ${role}s`)
    .join(', ');
  
  return {
    success: true,
    result: agents,
    result_summary: `${agents?.length || 0} agents total`,
    response_message: `You have ${agents?.length || 0} agents in your workforce: ${roleSummary}.`,
  };
}

/**
 * Query task status
 */
async function queryTaskStatus(
  supabase: SupabaseClient,
  tenant_id: string,
  params: QueryParams
): Promise<IntentHandlerOutput> {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('tenant_id', tenant_id);
  
  // Apply time filter
  if (params.time_range === 'today') {
    const today = new Date().toISOString().split('T')[0];
    query = query.gte('created_at', today);
  }
  
  const { data: tasks, error } = await query;
  
  if (error) throw error;
  
  const completed = tasks?.filter(t => t.status === 'completed').length || 0;
  const inProgress = tasks?.filter(t => t.status === 'in_progress').length || 0;
  const failed = tasks?.filter(t => t.status === 'failed').length || 0;
  
  const timeRangeText = params.time_range === 'today' ? 'today' : 
                        params.time_range === 'week' ? 'this week' : 'total';
  
  return {
    success: true,
    result: tasks,
    result_summary: `${tasks?.length || 0} tasks ${timeRangeText}`,
    response_message: `${timeRangeText === 'total' ? 'You have' : 'There are'} **${tasks?.length || 0} tasks** ${timeRangeText}: ${completed} completed, ${inProgress} in progress, ${failed} failed.`,
  };
}

/**
 * Query activity history
 */
async function queryActivityHistory(
  supabase: SupabaseClient,
  tenant_id: string,
  params: QueryParams
): Promise<IntentHandlerOutput> {
  let query = supabase
    .from('activities')
    .select('*, agent:agent_id(name)')
    .eq('tenant_id', tenant_id)
    .order('created_at', { ascending: false })
    .limit(20);
  
  // Apply time filter
  if (params.time_range === 'today') {
    const today = new Date().toISOString().split('T')[0];
    query = query.gte('created_at', today);
  } else if (params.time_range === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    query = query.gte('created_at', weekAgo.toISOString());
  }
  
  const { data: activities, error } = await query;
  
  if (error) throw error;
  
  if (!activities || activities.length === 0) {
    return {
      success: true,
      result: [],
      result_summary: 'No recent activity',
      response_message: 'There has been no recent activity to show.',
    };
  }
  
  // Summarize activity
  const typeCounts: Record<string, number> = {};
  activities.forEach(a => {
    const type = a.type || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  let response = '**Recent Activity:**\n\n';
  activities.slice(0, 10).forEach(activity => {
    const time = new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const agentName = activity.agent?.name || 'System';
    response += `• **${time}** - ${activity.title} (${agentName})\n`;
  });
  
  return {
    success: true,
    result: activities,
    result_summary: `${activities.length} recent activities`,
    response_message: response,
  };
}

/**
 * Query performance metrics
 */
async function queryPerformance(
  supabase: SupabaseClient,
  tenant_id: string,
  params: QueryParams
): Promise<IntentHandlerOutput> {
  const { data: analytics, error } = await supabase
    .from('analytics_daily')
    .select('*')
    .eq('tenant_id', tenant_id)
    .order('date', { ascending: false })
    .limit(7);
  
  if (error) throw error;
  
  if (!analytics || analytics.length === 0) {
    return {
      success: true,
      result: null,
      result_summary: 'No performance data',
      response_message: 'No performance data is available yet. Data is collected daily.',
    };
  }
  
  const latest = analytics[0];
  const totals = analytics.reduce((acc, day) => ({
    tasks_created: acc.tasks_created + day.tasks_created,
    tasks_completed: acc.tasks_completed + day.tasks_completed,
    tasks_failed: acc.tasks_failed + day.tasks_failed,
    cost: acc.cost + (day.total_cost_usd || 0),
  }), { tasks_created: 0, tasks_completed: 0, tasks_failed: 0, cost: 0 });
  
  const successRate = totals.tasks_completed > 0 
    ? Math.round((totals.tasks_completed / (totals.tasks_completed + totals.tasks_failed)) * 100)
    : 0;
  
  let response = `**Performance (Last 7 Days):**\n\n`;
  response += `• Tasks completed: **${totals.tasks_completed}**\n`;
  response += `• Success rate: **${successRate}%**\n`;
  response += `• Total cost: **$${totals.cost.toFixed(2)}**\n`;
  response += `• Today: ${latest.tasks_completed} tasks, $${latest.total_cost_usd.toFixed(2)}\n`;
  
  return {
    success: true,
    result: analytics,
    result_summary: `7-day performance summary`,
    response_message: response,
  };
}

/**
 * Handle general queries
 */
async function handleGeneralQuery(
  supabase: SupabaseClient,
  tenant_id: string,
  message: string,
  entities: { agent_names?: string[]; task_ids?: string[] }
): Promise<IntentHandlerOutput> {
  const lowerMessage = message.toLowerCase();
  
  // Handle common general queries
  if (/what can you do|help|commands/.test(lowerMessage)) {
    return {
      success: true,
      result: null,
      result_summary: 'Help response',
      response_message: `I can help you manage your agent workforce. Here are some things I can do:

**Status & Monitoring:**
• "What's the status of my agents?"
• "Show me [agent name]'s progress"
• "What tasks are urgent?"

**Task Management:**
• "Assign [task] to [agent]"
• "Create a task for [agent] to [do something]"

**Agent Control:**
• "Pause [agent]"
• "Resume [agent]"
• "Create a new [role] agent"

**Information:**
• "How many tasks did we complete this week?"
• "Show me recent escalations"
• "What's our success rate?"

**GitHub:**
• "Create an issue for [description]"

Just ask naturally - I'll do my best to understand!`,
    };
  }
  
  if (/hello|hi|hey/.test(lowerMessage)) {
    return {
      success: true,
      result: null,
      result_summary: 'Greeting',
      response_message: 'Hello! I\'m VALIS, your agent workforce assistant. How can I help you today?',
    };
  }
  
  if (/thank|thanks/.test(lowerMessage)) {
    return {
      success: true,
      result: null,
      result_summary: 'Acknowledgment',
      response_message: 'You\'re welcome! Let me know if you need anything else.',
    };
  }
  
  // Default response for unrecognized queries
  return {
    success: true,
    result: null,
    result_summary: 'Unrecognized query',
    response_message: `I'm not sure I understand. Try asking about your agents, tasks, or say "what can you do" for help.`,
    suggested_followups: [
      'What can you do?',
      'Show me my agents',
      "What's the status?",
    ],
  };
}
