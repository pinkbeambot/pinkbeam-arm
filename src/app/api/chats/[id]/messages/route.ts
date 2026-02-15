import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(10000),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chats/[id]/messages
 * Get messages for a specific chat
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    const { id: chatId } = await params;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const before = searchParams.get('before');

    // Verify the chat belongs to the current user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    // Call the database function to get messages with agent info
    const { data: messages, error } = await supabase.rpc('get_chat_messages', {
      p_chat_id: chatId,
      p_limit: limit,
      p_before: before || null,
    });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Check if there are more messages
    const hasMore = messages && messages.length === limit;

    // Transform the response
    const formattedMessages = messages?.map((msg: Record<string, unknown>) => ({
      id: msg.id,
      chat_id: msg.chat_id,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata || {},
      created_at: msg.created_at,
      agent_name: msg.agent_name,
      agent_avatar: msg.agent_avatar,
    })) || [];

    return NextResponse.json({
      messages: formattedMessages,
      has_more: hasMore,
    });
  } catch (error) {
    console.error('Error in GET /api/chats/[id]/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats/[id]/messages
 * Send a message to the chat
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    const { id: chatId } = await params;

    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content } = parsed.data;

    // Verify the chat belongs to the current user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        id,
        agent_id,
        agent:agents(id, name, avatar_url, role, status, description, model, llm_config)
      `)
      .eq('id', chatId)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    // Insert the user message
    const { data: userMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        role: 'user',
        content: content.trim(),
        metadata: {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // Trigger agent response (async - don't wait for it)
    // In production, this would be an Edge Function or background job
    triggerAgentResponse(supabase, chatId, chat.agent_id, tenantId, content.trim())
      .catch((err: Error) => console.error('Error triggering agent response:', err));

    return NextResponse.json({
      message: userMessage,
    });
  } catch (error) {
    console.error('Error in POST /api/chats/[id]/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Trigger agent response via Edge Function
 */
async function triggerAgentResponse(
  supabase: Awaited<ReturnType<typeof authenticateRequest>> extends infer R ? R extends { supabase: infer S } ? S : never : never,
  chatId: string,
  agentId: string,
  tenantId: string,
  userMessage: string
) {
  try {
    // For MVP, we'll generate a simple agent response
    // In production, this would call an Edge Function that:
    // 1. Fetches context (activities, tasks, decisions, escalations)
    // 2. Builds system prompt
    // 3. Calls LLM
    // 4. Stores and broadcasts response

    // Get agent details
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get context for the agent
    const context = await fetchAgentContext(supabase, agentId, tenantId);

    // Generate a simple response (in production, this would call an LLM)
    const response = generateAgentResponse(agent, context, userMessage);

    // Store the agent response
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        role: 'agent',
        content: response,
        metadata: {
          processing_time_ms: 500,
          model_used: agent.model || 'claude-3-5-sonnet-20241022',
        },
      });

    if (insertError) {
      console.error('Error storing agent response:', insertError);
    }
  } catch (error) {
    console.error('Error in triggerAgentResponse:', error);
  }
}

/**
 * Fetch context for agent response
 */
async function fetchAgentContext(
  supabase: Awaited<ReturnType<typeof authenticateRequest>> extends infer R ? R extends { supabase: infer S } ? S : never : never,
  agentId: string,
  tenantId: string
) {
  // Fetch context in parallel using Promise.all()
  const [
    { data: activities },
    { data: tasks },
    { data: decisions },
    { data: escalations },
  ] = await Promise.all([
    // Fetch recent activities
    supabase
      .from('activities')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Fetch active tasks
    supabase
      .from('tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('assignee_id', agentId)
      .in('status', ['queued', 'in_progress', 'blocked', 'review'])
      .order('created_at', { ascending: false })
      .limit(10),

    // Fetch recent decisions
    supabase
      .from('decisions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Fetch open escalations
    supabase
      .from('escalations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return {
    activities: activities || [],
    tasks: tasks || [],
    decisions: decisions || [],
    escalations: escalations || [],
  };
}

/**
 * Generate a simple agent response (placeholder for LLM)
 */
function generateAgentResponse(
  agent: Record<string, unknown>,
  context: {
    activities: Record<string, unknown>[];
    tasks: Record<string, unknown>[];
    decisions: Record<string, unknown>[];
    escalations: Record<string, unknown>[];
  },
  _userMessage: string
): string {
  const agentName = agent.name as string;
  const activities = context.activities || [];
  const tasks = context.tasks || [];
  const escalations = context.escalations || [];

  // Build a contextual response based on available data
  let response = `Hello! I'm ${agentName}. `;

  // Reference recent activities if relevant
  if (activities.length > 0) {
    const recentActivity = activities[0];
    const title = recentActivity.title as string;
    response += `I see you've been working on "${title}". `;
  }

  // Reference active tasks
  if (tasks.length > 0) {
    const activeTasks = tasks.filter((t) => t.status === 'in_progress');
    if (activeTasks.length > 0) {
      response += `I'm currently working on ${activeTasks.length} task${activeTasks.length > 1 ? 's' : ''}. `;
    }
  }

  // Reference escalations
  if (escalations.length > 0) {
    response += `I also have ${escalations.length} open escalation${escalations.length > 1 ? 's' : ''} that need attention. `;
  }

  response += `\n\nHow can I help you today?`;

  return response;
}
