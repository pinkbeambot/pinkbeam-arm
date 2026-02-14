/**
 * Assign Intent Handler
 * Issue: #17 - Meta-Agent Natural Language Interface
 * 
 * Handles assigning tasks to agents.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IntentHandlerInput,
  IntentHandlerContext,
  IntentHandlerOutput,
  AssignTaskParams,
} from '@/types/meta-agent';

/**
 * Handle assign intent
 */
export async function handleAssignIntent(
  input: IntentHandlerInput,
  context: IntentHandlerContext
): Promise<IntentHandlerOutput> {
  const { entities, raw_message } = input;
  const { supabase, tenant_id } = context;
  
  try {
    // Parse assignment parameters
    const params = parseAssignParams(raw_message, entities);
    
    if (!params.agent_name && !params.agent_id) {
      return {
        success: false,
        result_summary: 'No agent specified',
        response_message: 'Which agent should I assign this task to? Please specify the agent name.',
        requires_confirmation: false,
      };
    }
    
    if (!params.task_description) {
      return {
        success: false,
        result_summary: 'No task description',
        response_message: 'What task should I assign? Please describe what needs to be done.',
        requires_confirmation: false,
      };
    }
    
    // Find the agent
    let agentId = params.agent_id;
    let agentName = params.agent_name;
    
    if (!agentId && agentName) {
      const { data: agents, error } = await (supabase as SupabaseClient)
        .from('agents')
        .select('id, name, status, capabilities')
        .eq('tenant_id', tenant_id)
        .ilike('name', `%${agentName}%`)
        .limit(5);
      
      if (error) throw error;
      
      if (!agents || agents.length === 0) {
        return {
          success: false,
          result_summary: `Agent "${agentName}" not found`,
          response_message: `I couldn't find an agent named "${agentName}". Use "show my agents" to see who's available.`,
        };
      }
      
      if (agents.length > 1) {
        const agentList = agents.map(a => `• ${a.name}`).join('\n');
        return {
          success: false,
          result_summary: 'Multiple agents found',
          response_message: `I found multiple agents matching "${agentName}":\n\n${agentList}\n\nPlease be more specific about which agent you want to assign the task to.`,
        };
      }
      
      agentId = agents[0].id;
      agentName = agents[0].name;
      
      // Check if agent can receive tasks
      if (agents[0].status === 'terminated') {
        return {
          success: false,
          result_summary: 'Agent terminated',
          response_message: `${agentName} has been terminated and cannot receive new tasks.`,
        };
      }
    }
    
    // Generate task title if not provided
    const taskTitle = params.task_title || generateTaskTitle(params.task_description);
    
    // Create the task
    const { data: task, error } = await (supabase as SupabaseClient)
      .from('tasks')
      .insert({
        tenant_id,
        title: taskTitle,
        description: params.task_description,
        status: 'queued',
        priority: params.priority || 'normal',
        assignee_id: agentId,
        deadline_at: params.deadline,
        parent_task_id: params.parent_task_id,
      })
      .select('*, assignee:assignee_id(id, name)')
      .single();
    
    if (error) throw error;
    
    // Generate response
    let response = `✅ **Task Assigned**\n\n`;
    response += `**${task.title}**\n`;
    response += `Assigned to: **${agentName}**\n`;
    response += `Priority: ${task.priority}\n`;
    if (task.deadline_at) {
      response += `Deadline: ${new Date(task.deadline_at).toLocaleDateString()}\n`;
    }
    response += `\nThe task has been added to ${agentName}'s queue. They'll start working on it based on their priority and current workload.`;
    
    return {
      success: true,
      result: {
        task_id: task.id,
        task_title: task.title,
        assigned_to: { id: agentId, name: agentName },
        priority: task.priority,
        deadline: task.deadline_at,
      },
      result_summary: `Assigned "${taskTitle}" to ${agentName}`,
      response_message: response,
      suggested_followups: [
        `What's ${agentName} working on?`,
        'Show me all pending tasks',
        'Any urgent tasks?',
      ],
    };
  } catch (error) {
    console.error('Error in assign handler:', error);
    return {
      success: false,
      result_summary: 'Failed to assign task',
      response_message: 'I encountered an error while creating the task. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse assign parameters from message and entities
 */
function parseAssignParams(message: string, entities: { 
  agent_names?: string[]; 
  task_descriptions?: string[];
  priorities?: ('low' | 'normal' | 'high' | 'urgent')[];
}): AssignTaskParams {
  const lowerMessage = message.toLowerCase();
  
  // Extract agent name
  const agentName = entities.agent_names?.[0];
  
  // Extract task description
  let taskDescription = entities.task_descriptions?.[0];
  
  // If no task description from entities, try to extract from message
  if (!taskDescription) {
    const patterns = [
      /(?:to|task)\s+(?:.+?\s+)?(?:of|is)\s+(.+?)(?:\.|$|by|with|using)/i,
      /(?:assign|give|create)\s+(?:a\s+)?(?:task\s+)?(?:to\s+\w+\s+)?(?:to\s+)?(.+?)(?:\.|$|with|by)/i,
      /(?:do|handle|work on|take care of|complete)\s+(.+?)(?:\.|$|by|with)/i,
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match?.[1]) {
        taskDescription = match[1].trim();
        break;
      }
    }
  }
  
  // Extract priority
  const priority = entities.priorities?.[0] || 'normal';
  
  // Try to extract deadline
  let deadline: string | undefined;
  const deadlineMatch = message.match(/(?:by|before|due)\s+(tomorrow|next week|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|\d{1,2}\/\d{1,2}(?:\/\d{4})?)/i);
  if (deadlineMatch?.[1]) {
    const deadlineText = deadlineMatch[1].toLowerCase();
    const now = new Date();
    
    if (deadlineText === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      deadline = tomorrow.toISOString();
    } else if (deadlineText === 'next week') {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      deadline = nextWeek.toISOString();
    } else {
      // Try to parse as date
      const parsed = Date.parse(deadlineMatch[1]);
      if (!isNaN(parsed)) {
        deadline = new Date(parsed).toISOString();
      }
    }
  }
  
  return {
    agent_name: agentName,
    task_description: taskDescription || '',
    priority,
    deadline,
  };
}

/**
 * Generate a concise task title from description
 */
function generateTaskTitle(description: string): string {
  // Take first 5-8 words or first 60 characters
  const words = description.split(' ');
  const titleWords = words.slice(0, Math.min(8, words.length));
  let title = titleWords.join(' ');
  
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }
  
  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
}
