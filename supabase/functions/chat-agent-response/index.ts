/**
 * Chat Agent Response Edge Function
 * Generates agent responses using Claude LLM
 * 
 * Triggered when a user sends a message in chat
 * 1. Fetches message history for context
 * 2. Builds system prompt with agent personality
 * 3. Calls Claude API
 * 4. Stores and broadcasts agent response
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

// Claude API constants
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
const CLAUDE_VERSION = '2023-06-01';

// Logger
const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', context: 'chat-agent-response', message, ...meta }));
  },
  error: (message: string, error: unknown, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'error',
      context: 'chat-agent-response',
      message,
      error: error instanceof Error ? error.message : String(error),
      ...meta,
    }));
  },
};

// Create Supabase admin client
function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Request schema
const requestSchema = z.object({
  chat_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  user_message: z.string().min(1).max(10000),
});

// Message types
interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  role: string;
  status: string;
  llm_config?: {
    provider?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  };
  configuration?: {
    instructions?: {
      system_prompt?: string;
    };
  };
}

interface AgentContext {
  activities: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    created_at: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
  }>;
  decisions: Array<{
    id: string;
    title: string;
    status: string;
    confidence: number;
  }>;
  escalations: Array<{
    id: string;
    title: string;
    urgency: string;
    status: string;
  }>;
}

// Claude API types
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Error response helper
function errorResponse(code: string, message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Success response helper
function successResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Fetch message history for context
 */
async function fetchMessageHistory(
  supabase: ReturnType<typeof createAdminClient>,
  chatId: string,
  limit = 20
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch message history: ${error.message}`);
  }

  // Return in chronological order (oldest first)
  return (data || []).reverse();
}

/**
 * Fetch agent details
 */
async function fetchAgent(
  supabase: ReturnType<typeof createAdminClient>,
  agentId: string
): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, description, role, status, llm_config, configuration')
    .eq('id', agentId)
    .single();

  if (error) {
    logger.error('Failed to fetch agent', error, { agentId });
    return null;
  }

  return data as Agent;
}

/**
 * Fetch agent context (activities, tasks, decisions, escalations)
 */
async function fetchAgentContext(
  supabase: ReturnType<typeof createAdminClient>,
  agentId: string,
  tenantId: string
): Promise<AgentContext> {
  const [activitiesRes, tasksRes, decisionsRes, escalationsRes] = await Promise.all([
    // Recent activities
    supabase
      .from('activities')
      .select('id, type, title, description, created_at')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Active tasks
    supabase
      .from('tasks')
      .select('id, title, status, priority')
      .eq('tenant_id', tenantId)
      .eq('assigned_agent_id', agentId)
      .in('status', ['queued', 'in_progress', 'blocked', 'review'])
      .order('created_at', { ascending: false })
      .limit(5),

    // Recent decisions
    supabase
      .from('decisions')
      .select('id, title, status, confidence')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Open escalations
    supabase
      .from('escalations')
      .select('id, title, urgency, status')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return {
    activities: activitiesRes.data || [],
    tasks: tasksRes.data || [],
    decisions: decisionsRes.data || [],
    escalations: escalationsRes.data || [],
  };
}

/**
 * Build system prompt for the agent
 */
function buildSystemPrompt(agent: Agent, context: AgentContext): string {
  const parts: string[] = [];

  // Agent identity
  parts.push(`You are ${agent.name}, an AI agent with the role of ${agent.role}.`);

  if (agent.description) {
    parts.push(`\nAbout you: ${agent.description}`);
  }

  // Custom system prompt from configuration
  if (agent.configuration?.instructions?.system_prompt) {
    parts.push(`\n${agent.configuration.instructions.system_prompt}`);
  }

  // Context information
  parts.push('\n## Your Current Context');

  // Active tasks
  if (context.tasks.length > 0) {
    parts.push(`\n### Active Tasks (${context.tasks.length})`);
    for (const task of context.tasks.slice(0, 3)) {
      parts.push(`- ${task.title} (${task.status}, ${task.priority} priority)`);
    }
  }

  // Recent activities
  if (context.activities.length > 0) {
    parts.push(`\n### Recent Activities`);
    for (const activity of context.activities.slice(0, 3)) {
      parts.push(`- ${activity.title}${activity.description ? `: ${activity.description}` : ''}`);
    }
  }

  // Open escalations
  if (context.escalations.length > 0) {
    parts.push(`\n### Open Escalations (${context.escalations.length})`);
    for (const escalation of context.escalations.slice(0, 2)) {
      parts.push(`- ${escalation.title} (${escalation.urgency} urgency)`);
    }
  }

  // Guidelines
  parts.push(`
## Guidelines
- Be helpful, professional, and concise in your responses
- Reference relevant context when appropriate
- If you're unsure about something, say so honestly
- You can ask clarifying questions when needed
- Your responses should be natural and conversational
`);

  return parts.join('\n');
}

/**
 * Build conversation messages for Claude
 */
function buildConversationMessages(
  history: ChatMessage[],
  currentUserMessage: string,
  systemPrompt: string
): { system: string; messages: ClaudeMessage[] } {
  const messages: ClaudeMessage[] = [];

  // Add message history (excluding the most recent user message which we'll add separately)
  for (const msg of history) {
    // Skip the current user message (it's the last one)
    if (msg.role === 'user' && msg.content === currentUserMessage) {
      continue;
    }

    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'agent') {
      messages.push({ role: 'assistant', content: msg.content });
    }
    // Skip system messages - they're handled separately in Claude's API
  }

  // Add current user message
  messages.push({ role: 'user', content: currentUserMessage });

  return { system: systemPrompt, messages };
}

/**
 * Call Claude API
 */
async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  config?: { temperature?: number; max_tokens?: number }
): Promise<{ content: string; usage: { input_tokens: number; output_tokens: number } }> {
  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: config?.max_tokens || 4096,
    temperature: config?.temperature ?? 0.7,
    system: systemPrompt,
    messages,
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': CLAUDE_VERSION,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
    );
  }

  const data: ClaudeResponse = await response.json();

  // Extract text content
  let content = '';
  for (const block of data.content) {
    if (block.type === 'text') {
      content += block.text;
    }
  }

  return {
    content,
    usage: data.usage,
  };
}

/**
 * Store agent response in database
 */
async function storeAgentResponse(
  supabase: ReturnType<typeof createAdminClient>,
  chatId: string,
  content: string,
  metadata: {
    model_used: string;
    processing_time_ms: number;
    input_tokens: number;
    output_tokens: number;
  }
): Promise<void> {
  const { error } = await supabase.from('chat_messages').insert({
    chat_id: chatId,
    role: 'agent',
    content,
    metadata,
  });

  if (error) {
    throw new Error(`Failed to store agent response: ${error.message}`);
  }
}

/**
 * Main handler
 */
async function handleGenerateResponse(req: Request): Promise<Response> {
  const startTime = Date.now();

  try {
    // Parse and validate request
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        400
      );
    }

    const { chat_id, agent_id, tenant_id, user_message } = parsed.data;

    logger.info('Generating agent response', { chat_id, agent_id, tenant_id });

    const supabase = createAdminClient();

    // Fetch agent and context in parallel
    const [agent, messageHistory] = await Promise.all([
      fetchAgent(supabase, agent_id),
      fetchMessageHistory(supabase, chat_id, 20),
    ]);

    if (!agent) {
      return errorResponse('AGENT_NOT_FOUND', 'Agent not found', 404);
    }

    // Fetch additional context
    const context = await fetchAgentContext(supabase, agent_id, tenant_id);

    // Build prompts
    const systemPrompt = buildSystemPrompt(agent, context);
    const { system, messages } = buildConversationMessages(messageHistory, user_message, systemPrompt);

    logger.info('Calling Claude API', {
      chat_id,
      agent_id,
      message_count: messages.length,
    });

    // Call Claude
    const llmConfig = agent.llm_config || {};
    const claudeResponse = await callClaude(system, messages, {
      temperature: llmConfig.temperature ?? 0.7,
      max_tokens: llmConfig.max_tokens ?? 4096,
    });

    const processingTime = Date.now() - startTime;

    // Store response (triggers realtime update)
    await storeAgentResponse(supabase, chat_id, claudeResponse.content, {
      model_used: llmConfig.model || CLAUDE_MODEL,
      processing_time_ms: processingTime,
      input_tokens: claudeResponse.usage.input_tokens,
      output_tokens: claudeResponse.usage.output_tokens,
    });

    logger.info('Agent response generated successfully', {
      chat_id,
      agent_id,
      processing_time_ms: processingTime,
      input_tokens: claudeResponse.usage.input_tokens,
      output_tokens: claudeResponse.usage.output_tokens,
    });

    return successResponse({
      chat_id,
      processing_time_ms: processingTime,
      tokens_used: {
        input: claudeResponse.usage.input_tokens,
        output: claudeResponse.usage.output_tokens,
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to generate agent response', error, {
      processing_time_ms: processingTime,
    });

    return errorResponse(
      'GENERATION_FAILED',
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
}

/**
 * HTTP handler
 */
export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST requests are allowed', 405);
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/chat-agent-response\/?/, '') || '';

  // Health check endpoint
  if (path === 'health' && req.method === 'GET') {
    return successResponse({ status: 'healthy' });
  }

  // Main endpoint
  if (!path && req.method === 'POST') {
    return handleGenerateResponse(req);
  }

  return errorResponse('NOT_FOUND', 'Unknown endpoint', 404);
}

Deno.serve(handler);
