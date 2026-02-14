/**
 * Broadcast Intent Handler
 * Issue: #17 - Meta-Agent Natural Language Interface
 * 
 * Handles broadcasting messages to multiple agents.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IntentHandlerInput,
  IntentHandlerContext,
  IntentHandlerOutput,
  BroadcastParams,
} from '@/types/meta-agent';

/**
 * Handle broadcast intent
 */
export async function handleBroadcastIntent(
  input: IntentHandlerInput,
  context: IntentHandlerContext
): Promise<IntentHandlerOutput> {
  const { entities, raw_message } = input;
  const { supabase, tenant_id } = context;
  
  try {
    // Parse broadcast parameters
    const params = parseBroadcastParams(raw_message, entities);
    
    // Get target agents
    const { data: agents, error } = await (supabase as SupabaseClient)
      .from('agents')
      .select('id, name, role, status')
      .eq('tenant_id', tenant_id)
      .neq('status', 'terminated');
    
    if (error) throw error;
    
    // Filter based on target scope
    let targetAgents = agents || [];
    
    switch (params.target_scope) {
      case 'by_role':
        if (params.target_roles) {
          targetAgents = targetAgents.filter(a => 
            params.target_roles?.includes(a.role)
          );
        }
        break;
      case 'by_status':
        if (params.target_statuses) {
          targetAgents = targetAgents.filter(a => 
            params.target_statuses?.includes(a.status)
          );
        }
        break;
      case 'specific_agents':
        if (params.target_agent_ids) {
          targetAgents = targetAgents.filter(a => 
            params.target_agent_ids?.includes(a.id)
          );
        }
        break;
      case 'all':
      default:
        // Include all non-terminated agents
        break;
    }
    
    if (targetAgents.length === 0) {
      return {
        success: true,
        result: null,
        result_summary: 'No target agents',
        response_message: 'No agents matched your broadcast criteria.',
      };
    }
    
    // Create messages for each agent
    const messages = targetAgents.map(agent => ({
      tenant_id,
      protocol_version: '1.0',
      message_type: 'message.broadcast' as const,
      from_agent_id: null, // From system/CEO
      to_agent_id: agent.id,
      to_broadcast: true,
      payload: {
        content: params.message,
        priority: params.priority,
        from: 'CEO',
        timestamp: new Date().toISOString(),
      },
      priority: params.priority || 'normal',
    }));
    
    // Insert messages
    const { error: msgError } = await (supabase as SupabaseClient)
      .from('messages')
      .insert(messages);
    
    if (msgError) throw msgError;
    
    // Generate response
    let response = `📢 **Broadcast Sent**\n\n`;
    response += `Message sent to **${targetAgents.length}** agent${targetAgents.length !== 1 ? 's' : ''}:\n\n`;
    response += `> "${params.message}"\n\n`;
    
    if (targetAgents.length <= 10) {
      response += '**Recipients:**\n';
      targetAgents.forEach(agent => {
        const statusEmojis: Record<string, string> = {
          active: '🟢',
          idle: '⚪',
          paused: '⏸️',
          error: '🔴',
          blocked: '🟡',
          initializing: '🔵',
        };
        const statusEmoji = statusEmojis[agent.status] || '⚪';
        response += `${statusEmoji} ${agent.name}\n`;
      });
    }
    
    return {
      success: true,
      result: {
        recipients_count: targetAgents.length,
        recipients: targetAgents.map(a => ({ id: a.id, name: a.name, status: a.status })),
        message_sent: params.message,
      },
      result_summary: `Broadcast sent to ${targetAgents.length} agents`,
      response_message: response,
      suggested_followups: [
        'Show me my agents',
        `What are ${targetAgents[0].name} and others working on?`,
        'Send another message',
      ],
    };
  } catch (error) {
    console.error('Error in broadcast handler:', error);
    return {
      success: false,
      result_summary: 'Failed to broadcast message',
      response_message: 'I encountered an error while sending the broadcast. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse broadcast parameters
 */
function parseBroadcastParams(message: string, entities: { 
  raw_entities?: Record<string, unknown>;
}): BroadcastParams {
  const lowerMessage = message.toLowerCase();
  
  // Extract the message content
  let broadcastMessage = '';
  
  const messagePatterns = [
    /(?:broadcast|notify|tell|send)\s+(?:to\s+)?(?:all\s+)?(?:agents?\s+)?(?:that\s+)?["']?(.+?)["']?(?:\.|$)/i,
    /(?:say|message)\s+["']?(.+?)["']?(?:\s+to\s+all)/i,
  ];
  
  for (const pattern of messagePatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      broadcastMessage = match[1].trim();
      break;
    }
  }
  
  // If no specific message found, use the whole thing minus common prefixes
  if (!broadcastMessage) {
    broadcastMessage = message
      .replace(/^(broadcast|notify|tell|send|say)\s+(to\s+)?(all\s+)?(agents?\s+)?(that\s+)?/i, '')
      .replace(/[.!]$/, '')
      .trim();
  }
  
  // Determine target scope
  let targetScope: BroadcastParams['target_scope'] = 'all';
  
  if (/all\s+(?:idle|available)/i.test(lowerMessage)) {
    targetScope = 'by_status';
  } else if (/all\s+managers?/i.test(lowerMessage)) {
    targetScope = 'by_role';
  } else if (/all\s+workers?/i.test(lowerMessage)) {
    targetScope = 'by_role';
  }
  
  // Determine priority
  let priority: BroadcastParams['priority'] = 'normal';
  if (/urgent|important|asap/i.test(lowerMessage)) {
    priority = 'urgent';
  } else if (/high priority/i.test(lowerMessage)) {
    priority = 'high';
  }
  
  // Build target filters based on scope
  const targetRoles: string[] = [];
  const targetStatuses: string[] = [];
  
  if (targetScope === 'by_role') {
    if (/manager/i.test(lowerMessage)) targetRoles.push('manager');
    if (/worker/i.test(lowerMessage)) targetRoles.push('worker');
    if (/specialist/i.test(lowerMessage)) targetRoles.push('specialist');
    if (targetRoles.length === 0) targetRoles.push('worker', 'manager', 'specialist');
  }
  
  if (targetScope === 'by_status') {
    if (/idle|available/i.test(lowerMessage)) targetStatuses.push('idle');
    if (/active|working/i.test(lowerMessage)) targetStatuses.push('active');
    if (targetStatuses.length === 0) targetStatuses.push('idle', 'active');
  }
  
  return {
    message: broadcastMessage || 'Message from CEO',
    target_scope: targetScope,
    target_roles: targetRoles.length > 0 ? targetRoles : undefined,
    target_statuses: targetStatuses.length > 0 ? targetStatuses : undefined,
    priority,
  };
}
