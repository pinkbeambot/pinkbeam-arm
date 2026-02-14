/**
 * Control Intent Handler
 * Issue: #17 - Meta-Agent Natural Language Interface
 * 
 * Handles agent control commands: pause, resume, terminate, escalate.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IntentHandlerInput,
  IntentHandlerContext,
  IntentHandlerOutput,
  MetaAgentIntent,
} from '@/types/meta-agent';

/**
 * Handle control intent (pause, resume, terminate, escalate)
 */
export async function handleControlIntent(
  input: IntentHandlerInput,
  context: IntentHandlerContext
): Promise<IntentHandlerOutput> {
  const { intent, entities, raw_message } = input;
  const { supabase, tenant_id } = context;
  
  try {
    const agentName = entities.agent_names?.[0];
    
    if (!agentName) {
      return {
        success: false,
        result_summary: 'No agent specified',
        response_message: `Which agent would you like to ${intent}? Please specify the agent name.`,
      };
    }
    
    // Find the agent
    const { data: agents, error } = await (supabase as SupabaseClient)
      .from('agents')
      .select('id, name, status, current_task_id')
      .eq('tenant_id', tenant_id)
      .ilike('name', `%${agentName}%`)
      .neq('status', 'terminated')
      .limit(5);
    
    if (error) throw error;
    
    if (!agents || agents.length === 0) {
      return {
        success: false,
        result_summary: `Agent "${agentName}" not found`,
        response_message: `I couldn't find an active agent named "${agentName}".`,
      };
    }
    
    if (agents.length > 1) {
      const agentList = agents.map(a => `• ${a.name} (${a.status})`).join('\n');
      return {
        success: false,
        result_summary: 'Multiple agents found',
        response_message: `I found multiple agents matching "${agentName}":\n\n${agentList}\n\nPlease be more specific.`,
      };
    }
    
    const agent = agents[0];
    
    // Execute the control action
    switch (intent) {
      case 'pause':
        return await pauseAgent(supabase as SupabaseClient, tenant_id, agent);
      case 'resume':
        return await resumeAgent(supabase as SupabaseClient, tenant_id, agent);
      case 'terminate':
        return await terminateAgent(supabase as SupabaseClient, tenant_id, agent, raw_message);
      case 'escalate':
        return await escalateAgent(supabase as SupabaseClient, tenant_id, agent, raw_message);
      default:
        return {
          success: false,
          result_summary: 'Unknown control action',
          response_message: `I don't know how to ${intent} an agent.`,
        };
    }
  } catch (error) {
    console.error(`Error in ${input.intent} handler:`, error);
    return {
      success: false,
      result_summary: `Failed to ${input.intent} agent`,
      response_message: `I encountered an error while trying to ${input.intent} the agent. Please try again.`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pause an agent
 */
async function pauseAgent(
  supabase: SupabaseClient,
  tenant_id: string,
  agent: { id: string; name: string; status: string; current_task_id?: string }
): Promise<IntentHandlerOutput> {
  if (agent.status === 'paused') {
    return {
      success: true,
      result: null,
      result_summary: 'Agent already paused',
      response_message: `${agent.name} is already paused.`,
    };
  }
  
  if (agent.status === 'terminated') {
    return {
      success: false,
      result: null,
      result_summary: 'Cannot pause terminated agent',
      response_message: `${agent.name} has been terminated and cannot be paused.`,
    };
  }
  
  const { error } = await supabase
    .from('agents')
    .update({
      status: 'paused',
      status_reason: 'Paused by user via VALIS',
      updated_at: new Date().toISOString(),
    })
    .eq('id', agent.id)
    .eq('tenant_id', tenant_id);
  
  if (error) throw error;
  
  let response = `⏸️ **${agent.name} Paused**\n\n`;
  response += `${agent.name} has been paused and will not take on new tasks.`;
  
  if (agent.current_task_id) {
    response += `\n\nThey will complete their current task before stopping.`;
  }
  
  response += `\n\nUse "resume ${agent.name}" when you're ready for them to continue working.`;
  
  return {
    success: true,
    result: { agent_id: agent.id, new_status: 'paused' },
    result_summary: `Paused ${agent.name}`,
    response_message: response,
    suggested_followups: [
      `Resume ${agent.name}`,
      `What is ${agent.name} working on?`,
      'Show me paused agents',
    ],
  };
}

/**
 * Resume an agent
 */
async function resumeAgent(
  supabase: SupabaseClient,
  tenant_id: string,
  agent: { id: string; name: string; status: string }
): Promise<IntentHandlerOutput> {
  if (agent.status !== 'paused' && agent.status !== 'blocked') {
    return {
      success: true,
      result: null,
      result_summary: 'Agent not paused',
      response_message: `${agent.name} is already active (${agent.status}). No action needed.`,
    };
  }
  
  const { error } = await supabase
    .from('agents')
    .update({
      status: 'idle',
      status_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agent.id)
    .eq('tenant_id', tenant_id);
  
  if (error) throw error;
  
  return {
    success: true,
    result: { agent_id: agent.id, new_status: 'idle' },
    result_summary: `Resumed ${agent.name}`,
    response_message: `▶️ **${agent.name} Resumed**\n\n${agent.name} is now active and ready to take on tasks.`,
    suggested_followups: [
      `Assign a task to ${agent.name}`,
      `What's ${agent.name} working on?`,
      'Show me my agents',
    ],
  };
}

/**
 * Terminate an agent
 */
async function terminateAgent(
  supabase: SupabaseClient,
  tenant_id: string,
  agent: { id: string; name: string; status: string; current_task_id?: string },
  reason: string
): Promise<IntentHandlerOutput> {
  // Check if agent is already terminated
  if (agent.status === 'terminated') {
    return {
      success: true,
      result: null,
      result_summary: 'Agent already terminated',
      response_message: `${agent.name} has already been terminated.`,
    };
  }
  
  // Warn if agent has a current task
  let warning = '';
  if (agent.current_task_id) {
    warning = `\n\n⚠️ **Warning:** ${agent.name} is currently working on a task. Terminating will cancel this work.`;
  }
  
  const { error } = await supabase
    .from('agents')
    .update({
      status: 'terminated',
      status_reason: `Terminated by user via VALIS: ${reason}`,
      terminated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', agent.id)
    .eq('tenant_id', tenant_id);
  
  if (error) throw error;
  
  let response = `🛑 **${agent.name} Terminated**${warning}\n\n`;
  response += `${agent.name} has been terminated and will no longer be available.`;
  
  return {
    success: true,
    result: { agent_id: agent.id, new_status: 'terminated' },
    result_summary: `Terminated ${agent.name}`,
    response_message: response,
    requires_confirmation: !!agent.current_task_id,
    suggested_followups: [
      'Show me my agents',
      'Create a new agent',
      `Reassign ${agent.name}'s tasks`,
    ],
  };
}

/**
 * Create an escalation for an agent
 */
async function escalateAgent(
  supabase: SupabaseClient,
  tenant_id: string,
  agent: { id: string; name: string; current_task_id?: string },
  description: string
): Promise<IntentHandlerOutput> {
  // Extract escalation details from description
  const titleMatch = description.match(/(?:about|regarding|for)\s+(.+?)(?:\.|$)/i);
  const title = titleMatch?.[1] || `Escalation for ${agent.name}`;
  
  const { data: escalation, error } = await supabase
    .from('escalations')
    .insert({
      tenant_id,
      agent_id: agent.id,
      task_id: agent.current_task_id,
      type: 'clarification',
      urgency: 'normal',
      status: 'open',
      title: title.substring(0, 500),
      description: description,
      situation_context: {
        created_via: 'valis',
        agent_name: agent.name,
      },
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    success: true,
    result: escalation,
    result_summary: `Created escalation for ${agent.name}`,
    response_message: `📣 **Escalation Created**\n\nAn escalation has been created for ${agent.name} regarding "${title}".\n\nYou can view and resolve it in the Escalations section.`,
    suggested_followups: [
      'Show me open escalations',
      `What's ${agent.name} working on?`,
      'Resolve the escalation',
    ],
  };
}
