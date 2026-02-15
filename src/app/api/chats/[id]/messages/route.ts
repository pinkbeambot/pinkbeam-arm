import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(10000),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Edge Function URL
const EDGE_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-agent-response`
  : null;

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
 * Send a message to the chat and trigger agent response
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

    // Verify the chat belongs to the current user and get agent info
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        id,
        agent_id,
        agent:agents(id, name, avatar_url, role, status, description, model, llm_config, configuration)
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

    // Trigger agent response via Edge Function (async - don't wait for it)
    // The agent response will be delivered via Supabase Realtime
    triggerAgentResponseEdgeFunction(
      chatId,
      chat.agent_id,
      tenantId,
      content.trim(),
      request.headers.get('authorization') || ''
    ).catch((err: Error) => console.error('Error triggering agent response:', err));

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
 * This runs asynchronously and updates the chat via Supabase Realtime
 */
async function triggerAgentResponseEdgeFunction(
  chatId: string,
  agentId: string,
  tenantId: string,
  userMessage: string,
  authHeader: string
): Promise<void> {
  // Check if edge function URL is configured
  if (!EDGE_FUNCTION_URL) {
    console.error('Edge Function URL not configured');
    // Fall back to simple response generation
    await generateSimpleAgentResponse(chatId, agentId, tenantId, userMessage);
    return;
  }

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        chat_id: chatId,
        agent_id: agentId,
        tenant_id: tenantId,
        user_message: userMessage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Edge Function error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      );
    }

    const result = await response.json();
    console.log('Agent response generated:', result);
  } catch (error) {
    console.error('Error calling Edge Function:', error);
    // Fall back to simple response on error
    await generateSimpleAgentResponse(chatId, agentId, tenantId, userMessage);
  }
}

/**
 * Fallback simple agent response generator
 * Used when Edge Function is unavailable or fails
 */
async function generateSimpleAgentResponse(
  chatId: string,
  agentId: string,
  tenantId: string,
  userMessage: string
): Promise<void> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/service-role');
    const supabase = createServiceRoleClient();

    // Get agent details
    const { data: agent } = await supabase
      .from('agents')
      .select('name, description, role')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Generate a simple response
    let response = `Hello! I'm ${agent.name}. `;

    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      response += 'How can I help you today?';
    } else if (userMessage.toLowerCase().includes('help')) {
      response += 'I\'d be happy to help! What do you need assistance with?';
    } else if (userMessage.toLowerCase().includes('task')) {
      response += 'I can help you with tasks. Would you like me to create a new task or check on existing ones?';
    } else if (userMessage.toLowerCase().includes('escalation')) {
      response += 'I see you mentioned escalations. I can help you view or manage escalations. What would you like to do?';
    } else {
      response += `I received your message: "${userMessage}". I'm here to assist you with any questions or tasks you have!`;
    }

    // Store the agent response
    const { error: insertError } = await supabase.from('chat_messages').insert({
      chat_id: chatId,
      role: 'agent',
      content: response,
      metadata: {
        processing_time_ms: 500,
        model_used: 'fallback-simple',
        note: 'Fallback response - Edge Function unavailable',
      },
    });

    if (insertError) {
      console.error('Error storing fallback agent response:', insertError);
    }
  } catch (error) {
    console.error('Error in fallback response generation:', error);
  }
}
