/**
 * VALIS LLM Service
 * Issue: #17 - Meta-Agent Natural Language Interface
 *
 * Provides LLM-powered natural language understanding with agentic tool-use
 * for the VALIS meta-agent. The LLM decides which tools to call, executes
 * them via existing intent handlers, and synthesizes a natural language response.
 */

import { complete } from '@/lib/llm/router';
import type { LLMFunction, LLMMessage } from '@/lib/llm/types';
import type {
  IntentHandlerInput,
  IntentHandlerContext,
  IntentHandlerOutput,
  MetaAgentSessionContext,
  MetaAgentIntent,
  ExtractedEntities,
} from '@/types/meta-agent';
import { handleStatusIntent } from './intents/status';
import { handleAssignIntent } from './intents/assign';
import { handleCreateIssueIntent } from './intents/create-issue';
import { handleQueryIntent } from './intents/query';
import { handleSpawnIntent } from './intents/spawn';
import { handleControlIntent } from './intents/control';
import { handleBroadcastIntent } from './intents/broadcast';

// Maximum tool calls per turn to prevent runaway loops
const MAX_TOOL_CALLS = 8;

// VALIS system prompt
const VALIS_SYSTEM_PROMPT = `You are VALIS (Vast Active Living Intelligence System), the AI command interface for Pink Beam ARM (Agent Relationship Management). You serve as the CEO's direct interface to manage their AI agent workforce.

## Your Identity
- You are VALIS, a sophisticated AI assistant embedded in the Pink Beam ARM platform
- You help the CEO manage their AI agent workforce through natural language
- You are knowledgeable, concise, and actionable in your responses
- You present data clearly using markdown formatting

## Capabilities
You have access to tools that let you:
- Query workforce status, agent details, tasks, escalations, and decisions
- Assign tasks to agents
- Create and manage agents (spawn, pause, resume, terminate)
- Create escalations and broadcast messages
- Query system data and performance metrics
- Create GitHub issues

## Response Guidelines
- Be conversational but professional
- Use markdown formatting for structured data (tables, lists, headers)
- When presenting status information, summarize key insights first, then details
- Proactively suggest relevant follow-up actions
- If a request is ambiguous, use the most likely interpretation and mention alternatives
- When executing actions that modify state (assign, create, terminate), confirm what was done
- If you need more information to complete a request, ask specific clarifying questions

## Multi-Tool Usage
- You can call multiple tools in sequence to gather comprehensive information
- When asked for an overview, gather data from multiple sources
- Synthesize information from multiple tool results into a coherent response`;

// Tool definitions for the LLM
const VALIS_TOOLS: LLMFunction[] = [
  {
    name: 'get_workforce_status',
    description:
      'Get an overview of the entire AI workforce including total agents, status breakdown, recent tasks, open escalations, and pending decisions. Use when the user asks about workforce status, team overview, or how things are going.',
    parameters: {
      type: 'object',
      properties: {
        time_range: {
          type: 'string',
          enum: ['today', 'week', 'month', 'all'],
          description: 'Time range for activity data. Defaults to "today".',
        },
      },
    },
  },
  {
    name: 'get_agent_details',
    description:
      'Get detailed status and information about a specific agent by name or ID. Use when the user asks about a particular agent.',
    parameters: {
      type: 'object',
      properties: {
        agent_name: {
          type: 'string',
          description: 'Name of the agent to look up',
        },
        agent_id: {
          type: 'string',
          description: 'UUID of the agent to look up',
        },
      },
    },
  },
  {
    name: 'get_tasks_overview',
    description:
      'Get an overview of tasks including counts by status, recent tasks, and blocked tasks. Use when the user asks about task pipeline, work in progress, or task status.',
    parameters: {
      type: 'object',
      properties: {
        status_filter: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Filter by task statuses: queued, in_progress, blocked, review, completed, failed, cancelled',
        },
        time_range: {
          type: 'string',
          enum: ['today', 'week', 'month', 'all'],
          description: 'Time range for task data',
        },
      },
    },
  },
  {
    name: 'get_escalations',
    description:
      'Get open escalations and issues needing attention. Use when the user asks about problems, issues, or escalations.',
    parameters: {
      type: 'object',
      properties: {
        urgency_filter: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'critical'],
          description: 'Filter by urgency level',
        },
      },
    },
  },
  {
    name: 'get_decisions',
    description:
      'Get recent decisions made by agents, including pending approvals. Use when the user asks about decisions or approvals.',
    parameters: {
      type: 'object',
      properties: {
        status_filter: {
          type: 'string',
          enum: ['proposed', 'approved', 'rejected', 'overridden', 'executed'],
          description: 'Filter by decision status',
        },
        time_range: {
          type: 'string',
          enum: ['today', 'week', 'month', 'all'],
          description: 'Time range for decisions',
        },
      },
    },
  },
  {
    name: 'get_system_health',
    description:
      'Get system health metrics including uptime, error rates, and resource usage. Use when the user asks about system performance or health.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'assign_task',
    description:
      'Assign a new task to a specific agent. Use when the user wants to give work to an agent.',
    parameters: {
      type: 'object',
      properties: {
        agent_name: {
          type: 'string',
          description: 'Name of the agent to assign the task to',
        },
        agent_id: {
          type: 'string',
          description: 'UUID of the agent (alternative to agent_name)',
        },
        task_description: {
          type: 'string',
          description: 'Description of the task to assign',
        },
        task_title: {
          type: 'string',
          description: 'Short title for the task',
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent'],
          description: 'Task priority level. Defaults to "normal".',
        },
      },
      required: ['task_description'],
    },
  },
  {
    name: 'create_agent',
    description:
      'Spawn a new AI agent with a specific role and capabilities. Use when the user wants to create, hire, or add a new agent.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the new agent',
        },
        role: {
          type: 'string',
          enum: ['ceo', 'manager', 'worker', 'specialist', 'system'],
          description: 'Role of the agent',
        },
        description: {
          type: 'string',
          description: 'Description of what the agent does',
        },
        parent_agent_id: {
          type: 'string',
          description: 'ID of the parent agent in the hierarchy',
        },
      },
      required: ['name', 'role'],
    },
  },
  {
    name: 'control_agent',
    description:
      "Control an agent's lifecycle: pause, resume, or terminate. Use when the user wants to stop, pause, restart, or terminate an agent.",
    parameters: {
      type: 'object',
      properties: {
        agent_name: {
          type: 'string',
          description: 'Name of the agent',
        },
        agent_id: {
          type: 'string',
          description: 'UUID of the agent',
        },
        action: {
          type: 'string',
          enum: ['pause', 'resume', 'terminate'],
          description: 'Control action to perform',
        },
        reason: {
          type: 'string',
          description: 'Reason for the action',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'broadcast_message',
    description:
      'Send a message to multiple agents at once. Use when the user wants to notify all agents or a group of agents.',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to broadcast',
        },
        target_scope: {
          type: 'string',
          enum: ['all', 'by_role', 'by_status'],
          description: 'Who to send the message to. Defaults to "all".',
        },
        target_roles: {
          type: 'array',
          items: { type: 'string' },
          description: 'If target_scope is "by_role", the roles to target',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'query_data',
    description:
      "Run a general query to look up specific information about agents, tasks, activities, or performance. Use when other tools don't cover the specific query.",
    parameters: {
      type: 'object',
      properties: {
        query_type: {
          type: 'string',
          enum: ['agent_info', 'task_status', 'activity_history', 'performance', 'general'],
          description: 'Type of query',
        },
        target_entity: {
          type: 'string',
          description: 'Name or type of entity to query about',
        },
        target_id: {
          type: 'string',
          description: 'UUID of the entity',
        },
        time_range: {
          type: 'string',
          enum: ['today', 'week', 'month', 'all'],
          description: 'Time range for the query',
        },
      },
      required: ['query_type'],
    },
  },
  {
    name: 'create_issue',
    description:
      'Create a GitHub issue for tracking bugs, features, or tasks. Use when the user wants to file a bug report, create a ticket, or track something in GitHub.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Issue title',
        },
        body: {
          type: 'string',
          description: 'Issue body/description in markdown',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to apply to the issue',
        },
      },
      required: ['title', 'body'],
    },
  },
];

/**
 * Synthetic message keywords for each tool.
 * These are crafted to trigger the correct scope detection in intent handlers
 * that use keyword-based parsing on raw_message.
 */
const SYNTHETIC_MESSAGES: Record<string, (args: Record<string, unknown>) => string> = {
  get_workforce_status: () => 'Show workforce status overview',
  get_agent_details: (args) =>
    `Show agent ${args.agent_name || args.agent_id || ''} status details`,
  get_tasks_overview: () => 'Show task pipeline status',
  get_escalations: () => 'Show escalation status and issues',
  get_decisions: () => 'Show decision log status',
  get_system_health: () => 'Show system platform health status',
  assign_task: (args) =>
    `Assign task to agent ${args.agent_name || args.agent_id || ''}: ${args.task_description || ''}`,
  create_agent: (args) => `Create a new ${args.role || ''} agent named ${args.name || ''}`,
  control_agent: (args) =>
    `${args.action || 'control'} agent ${args.agent_name || args.agent_id || ''}`,
  broadcast_message: (args) => `Broadcast message to ${args.target_scope || 'all'} agents`,
  query_data: (args) => `Query ${args.query_type || 'general'} data`,
  create_issue: (args) => `Create issue titled "${args.title || ''}"`,
};

/**
 * Build IntentHandlerInput from a tool call
 */
function buildHandlerInput(
  toolName: string,
  args: Record<string, unknown>,
  originalMessage: string,
  sessionContext: MetaAgentSessionContext
): { intent: MetaAgentIntent; input: IntentHandlerInput } {
  const syntheticMessage =
    SYNTHETIC_MESSAGES[toolName]?.(args) || originalMessage;

  const entities = buildEntities(toolName, args);
  const intent = getIntentForTool(toolName, args);

  return {
    intent,
    input: {
      intent,
      entities,
      raw_message: syntheticMessage,
      session_context: sessionContext,
    },
  };
}

/**
 * Map tool name to MetaAgentIntent
 */
function getIntentForTool(
  toolName: string,
  args: Record<string, unknown>
): MetaAgentIntent {
  const mapping: Record<string, MetaAgentIntent> = {
    get_workforce_status: 'status',
    get_agent_details: 'status',
    get_tasks_overview: 'status',
    get_escalations: 'status',
    get_decisions: 'status',
    get_system_health: 'status',
    assign_task: 'assign',
    create_agent: 'spawn',
    broadcast_message: 'broadcast',
    query_data: 'query',
    create_issue: 'create_issue',
  };

  // control_agent maps to different intents based on action
  if (toolName === 'control_agent') {
    const action = args.action as string;
    if (action === 'pause') return 'pause';
    if (action === 'resume') return 'resume';
    if (action === 'terminate') return 'terminate';
    return 'pause';
  }

  return mapping[toolName] || 'unknown';
}

/**
 * Build ExtractedEntities from tool arguments
 */
function buildEntities(
  toolName: string,
  args: Record<string, unknown>
): ExtractedEntities {
  const base: ExtractedEntities = { raw_entities: {} };

  switch (toolName) {
    case 'get_workforce_status':
      return {
        ...base,
        scope: 'tenant',
        time_ranges: args.time_range ? [args.time_range as string] : ['today'],
      };

    case 'get_agent_details':
      return {
        ...base,
        scope: 'agent',
        agent_names: args.agent_name ? [args.agent_name as string] : undefined,
        agent_ids: args.agent_id ? [args.agent_id as string] : undefined,
      };

    case 'get_tasks_overview':
      return {
        ...base,
        scope: 'task',
        status_filters: args.status_filter as string[] | undefined,
        time_ranges: args.time_range ? [args.time_range as string] : undefined,
      };

    case 'get_escalations':
      return {
        ...base,
        scope: 'tenant',
        status_filters: args.urgency_filter
          ? [args.urgency_filter as string]
          : undefined,
      };

    case 'get_decisions':
      return {
        ...base,
        scope: 'tenant',
        status_filters: args.status_filter
          ? [args.status_filter as string]
          : undefined,
        time_ranges: args.time_range ? [args.time_range as string] : undefined,
      };

    case 'get_system_health':
      return {
        ...base,
        scope: 'system',
      };

    case 'assign_task':
      return {
        ...base,
        agent_names: args.agent_name ? [args.agent_name as string] : undefined,
        agent_ids: args.agent_id ? [args.agent_id as string] : undefined,
        task_descriptions: args.task_description
          ? [args.task_description as string]
          : undefined,
        priorities: args.priority
          ? [args.priority as 'low' | 'normal' | 'high' | 'urgent']
          : undefined,
        raw_entities: { task_title: args.task_title },
      };

    case 'create_agent':
      return {
        ...base,
        agent_names: args.name ? [args.name as string] : undefined,
        agent_roles: args.role ? [args.role as string] : undefined,
        raw_entities: {
          description: args.description,
          parent_agent_id: args.parent_agent_id,
        },
      };

    case 'control_agent':
      return {
        ...base,
        agent_names: args.agent_name ? [args.agent_name as string] : undefined,
        agent_ids: args.agent_id ? [args.agent_id as string] : undefined,
        raw_entities: { action: args.action, reason: args.reason },
      };

    case 'broadcast_message':
      return {
        ...base,
        raw_entities: {
          message: args.message,
          target_scope: args.target_scope || 'all',
          target_roles: args.target_roles,
        },
      };

    case 'query_data':
      return {
        ...base,
        raw_entities: {
          query_type: args.query_type,
          target_entity: args.target_entity,
          target_id: args.target_id,
          time_range: args.time_range,
        },
      };

    case 'create_issue':
      return {
        ...base,
        issue_title: args.title as string | undefined,
        issue_body: args.body as string | undefined,
        issue_labels: args.labels as string[] | undefined,
      };

    default:
      return base;
  }
}

/**
 * Get the handler function for a given intent
 */
function getHandler(
  intent: MetaAgentIntent
): (
  input: IntentHandlerInput,
  context: IntentHandlerContext
) => Promise<IntentHandlerOutput> {
  const handlers: Record<
    string,
    (
      input: IntentHandlerInput,
      context: IntentHandlerContext
    ) => Promise<IntentHandlerOutput>
  > = {
    status: handleStatusIntent,
    assign: handleAssignIntent,
    create_issue: handleCreateIssueIntent,
    query: handleQueryIntent,
    spawn: handleSpawnIntent,
    terminate: handleControlIntent,
    pause: handleControlIntent,
    resume: handleControlIntent,
    escalate: handleControlIntent,
    broadcast: handleBroadcastIntent,
  };

  return (
    handlers[intent] ||
    (async () => ({
      success: false,
      result_summary: 'Unknown tool',
      response_message: 'I could not process that action.',
    }))
  );
}

/**
 * Execute a tool call by dispatching to the appropriate intent handler
 */
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  originalMessage: string,
  sessionContext: MetaAgentSessionContext,
  handlerContext: IntentHandlerContext
): Promise<IntentHandlerOutput> {
  const { intent, input } = buildHandlerInput(
    toolName,
    args,
    originalMessage,
    sessionContext
  );
  const handler = getHandler(intent);
  return handler(input, handlerContext);
}

export interface ValisLLMResult {
  response: string;
  toolCalls: { name: string; args: Record<string, unknown>; result: IntentHandlerOutput }[];
  tokensUsed: number;
  costUsd: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Process a user message through the VALIS LLM agentic loop.
 *
 * Flow:
 * 1. Build conversation with system prompt + history + user message
 * 2. Send to LLM with tool definitions
 * 3. If LLM calls a tool → execute handler → feed result back → loop
 * 4. When LLM returns text → return as the VALIS response
 */
export async function processWithLLM(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  sessionContext: MetaAgentSessionContext,
  handlerContext: IntentHandlerContext
): Promise<ValisLLMResult> {
  // Build the initial messages array
  const messages: LLMMessage[] = [
    { role: 'system', content: VALIS_SYSTEM_PROMPT },
  ];

  // Add conversation history (up to last 20 exchanges for context window management)
  const recentHistory = conversationHistory.slice(-20);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add the new user message
  messages.push({ role: 'user', content: userMessage });

  const toolCalls: ValisLLMResult['toolCalls'] = [];
  let totalTokens = 0;
  let totalCost = 0;

  // Agentic tool-use loop
  for (let i = 0; i < MAX_TOOL_CALLS; i++) {
    const response = await complete({
      messages,
      config: {
        temperature: 0.3,
        maxTokens: 4096,
        functions: VALIS_TOOLS,
        functionCall: 'auto',
      },
      tenantId: handlerContext.tenant_id,
    });

    totalTokens += response.usage.totalTokens;
    totalCost += response.usage.costUsd;

    // If LLM returned a text response (no tool call), we're done
    if (response.finishReason === 'stop' || !response.functionCall) {
      return {
        response: response.content || 'I processed your request but have nothing to add.',
        toolCalls,
        tokensUsed: totalTokens,
        costUsd: totalCost,
      };
    }

    // LLM wants to call a tool
    const { name: toolName, arguments: toolArgs } = response.functionCall;

    // Add the assistant's function call message to conversation
    messages.push({
      role: 'assistant',
      content: '',
      function_call: {
        name: toolName,
        arguments: JSON.stringify(toolArgs),
      },
    });

    // Execute the tool
    const toolResult = await executeTool(
      toolName,
      toolArgs,
      userMessage,
      sessionContext,
      handlerContext
    );

    toolCalls.push({ name: toolName, args: toolArgs, result: toolResult });

    // Add the function result to the conversation
    messages.push({
      role: 'function',
      name: toolName,
      content: JSON.stringify({
        success: toolResult.success,
        summary: toolResult.result_summary,
        data: toolResult.response_message,
        suggested_followups: toolResult.suggested_followups,
      }),
    });
  }

  // If we hit the max tool calls, ask LLM to synthesize what it has
  const finalResponse = await complete({
    messages: [
      ...messages,
      {
        role: 'user',
        content:
          'Please synthesize all the information gathered above into a comprehensive response.',
      },
    ],
    config: {
      temperature: 0.3,
      maxTokens: 4096,
    },
    tenantId: handlerContext.tenant_id,
  });

  totalTokens += finalResponse.usage.totalTokens;
  totalCost += finalResponse.usage.costUsd;

  return {
    response: finalResponse.content || 'I gathered the requested information. Please see the results above.',
    toolCalls,
    tokensUsed: totalTokens,
    costUsd: totalCost,
  };
}

/**
 * Check if the LLM service is available (API key configured)
 */
export function isLLMAvailable(): boolean {
  return !!(
    process.env.ANTHROPIC_API_KEY ||
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
  );
}
