/**
 * Spawn Intent Handler
 * Issue: #17 - Meta-Agent Natural Language Interface
 * 
 * Handles spawning new agents.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IntentHandlerInput,
  IntentHandlerContext,
  IntentHandlerOutput,
} from '@/types/meta-agent';

/**
 * Handle spawn intent
 */
export async function handleSpawnIntent(
  input: IntentHandlerInput,
  context: IntentHandlerContext
): Promise<IntentHandlerOutput> {
  const { entities, raw_message } = input;
  const { supabase, tenant_id, user_id } = context;
  
  try {
    // Parse spawn parameters
    const params = parseSpawnParams(raw_message, entities);
    
    // Validate we have minimum info
    if (!params.name && !params.role) {
      return {
        success: false,
        result_summary: 'Insufficient information',
        response_message: 'To create a new agent, I need to know what role they should have. For example:\n• "Create a worker agent for data processing"\n• "Spawn a marketing manager"\n• "Add a new sales agent"',
      };
    }
    
    // Generate agent name if not provided
    const agentName = params.name || generateAgentName(params.role, params.purpose);
    
    // Check for name conflicts
    const { data: existing, error: checkError } = await (supabase as SupabaseClient)
      .from('agents')
      .select('id')
      .eq('tenant_id', tenant_id)
      .ilike('name', agentName)
      .maybeSingle();
    
    if (existing) {
      return {
        success: false,
        result_summary: 'Name conflict',
        response_message: `An agent named "${agentName}" already exists. Please choose a different name or specify a unique identifier.`,
      };
    }
    
    // Determine capabilities based on role
    const capabilities = getCapabilitiesForRole(params.role);
    
    // Create the agent
    const { data: agent, error } = await (supabase as SupabaseClient)
      .from('agents')
      .insert({
        tenant_id,
        name: agentName,
        slug: agentName.toLowerCase().replace(/\s+/g, '-'),
        role: params.role,
        status: 'idle',
        description: params.purpose,
        capabilities,
        llm_config: {
          provider: 'anthropic',
          model: params.model || 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          max_tokens: 4096,
        },
        config: {
          created_by: 'valis',
          created_from: raw_message,
        },
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Generate response
    let response = `✅ **Agent Created**\n\n`;
    response += `**${agent.name}** (${agent.role})\n`;
    if (params.purpose) {
      response += `Purpose: ${params.purpose}\n`;
    }
    response += `Status: **${agent.status}**\n`;
    response += `Capabilities: ${capabilities.join(', ')}\n\n`;
    response += `${agent.name} is ready to receive tasks. Use "assign [task] to ${agent.name}" to get them started.`;
    
    return {
      success: true,
      result: agent,
      result_summary: `Created ${agent.role} agent "${agent.name}"`,
      response_message: response,
      suggested_followups: [
        `Assign a task to ${agent.name}`,
        `What can ${agent.name} do?`,
        'Show me all my agents',
      ],
    };
  } catch (error) {
    console.error('Error in spawn handler:', error);
    return {
      success: false,
      result_summary: 'Failed to create agent',
      response_message: 'I encountered an error while creating the agent. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse spawn parameters
 */
function parseSpawnParams(message: string, entities: { 
  agent_names?: string[];
  agent_roles?: string[];
  raw_entities?: Record<string, unknown>;
}): { 
  name?: string; 
  role: 'worker' | 'manager' | 'specialist' | 'system';
  purpose?: string;
  model?: string;
} {
  const lowerMessage = message.toLowerCase();
  
  // Determine role
  let role: 'worker' | 'manager' | 'specialist' | 'system' = 'worker';
  
  if (/manager|lead|supervisor|coordinator/i.test(lowerMessage)) {
    role = 'manager';
  } else if (/specialist|expert|analyst|engineer/i.test(lowerMessage)) {
    role = 'specialist';
  } else if (/system|infrastructure|core/i.test(lowerMessage)) {
    role = 'system';
  }
  
  // Try to extract name
  let name: string | undefined;
  
  const namePatterns = [
    /(?:named?|called?)\s+["']?([\w\s]+)["']?(?:\s+(?:to|for|that))/i,
    /(?:create|spawn|make|add)\s+(?:a|an)?\s*(?:new\s+)?\w+\s+(?:agent|bot)\s+(?:named?|called?)\s+["']?([\w\s]+)["']?/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      name = match[1].trim();
      break;
    }
  }
  
  // Extract purpose/description
  let purpose: string | undefined;
  const purposePatterns = [
    /(?:to|for)\s+(.+?)(?:\.|$)/i,
    /(?:that|who)\s+(?:will|can)\s+(.+?)(?:\.|$)/i,
  ];
  
  for (const pattern of purposePatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      purpose = match[1].trim();
      break;
    }
  }
  
  // Extract model preference if specified
  let model: string | undefined;
  if (/claude.?3/i.test(lowerMessage)) {
    model = 'claude-3-opus-20240229';
  } else if (/gpt-?4/i.test(lowerMessage)) {
    model = 'gpt-4-turbo-preview';
  }
  
  return { name, role, purpose, model };
}

/**
 * Generate a unique agent name
 */
function generateAgentName(role: string, purpose?: string): string {
  const prefixes: Record<string, string[]> = {
    worker: ['Task', 'Work', 'Helper', 'Assist'],
    manager: ['Lead', 'Coord', 'Manage', 'Super'],
    specialist: ['Expert', 'Pro', 'Spec', 'Tech'],
    system: ['Sys', 'Core', 'Base', 'Infra'],
  };
  
  const prefixList = prefixes[role] || prefixes.worker;
  const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];
  
  // If purpose provided, use it to generate name
  if (purpose) {
    const purposeWords = purpose.split(' ').slice(0, 2);
    const purposeSuffix = purposeWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    return `${prefix}${purposeSuffix}`;
  }
  
  // Otherwise use random suffix
  const suffix = Math.floor(Math.random() * 1000);
  return `${prefix}Bot${suffix}`;
}

/**
 * Get default capabilities for a role
 */
function getCapabilitiesForRole(role: string): string[] {
  const capabilities: Record<string, string[]> = {
    ceo: ['spawn', 'delegate', 'decide', 'escalate', 'access_external', 'modify_config'],
    manager: ['spawn', 'delegate', 'decide', 'escalate', 'access_external'],
    worker: ['decide', 'escalate'],
    specialist: ['decide', 'escalate', 'access_external'],
    system: ['spawn', 'delegate', 'decide', 'modify_config'],
  };
  
  return capabilities[role] || ['decide', 'escalate'];
}
