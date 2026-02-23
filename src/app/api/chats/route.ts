import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { z } from 'zod';

const createChatSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
});

/**
 * GET /api/chats
 * List all chats for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Call the database function to get user chats with agent info
    const { data: chats, error } = await supabase.rpc('get_user_chats', {
      p_tenant_id: tenantId,
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching chats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chats' },
        { status: 500 }
      );
    }

    // Transform the response to match our types
    const formattedChats = chats?.map((chat: Record<string, unknown>) => ({
      id: chat.id,
      tenant_id: tenantId,
      user_id: userId,
      agent_id: chat.agent_id,
      agent: {
        id: chat.agent_id as string,
        name: chat.agent_name as string,
        avatar_url: chat.agent_avatar as string | undefined,
        role: chat.agent_role as string,
        status: chat.agent_status as string,
      },
      last_message: chat.last_message as string | undefined,
      last_message_at: chat.last_message_at as string | undefined,
      unread_count: Number(chat.unread_count) || 0,
      created_at: chat.created_at as string,
      updated_at: chat.updated_at as string,
    })) || [];

    return apiSuccess(formattedChats);
  } catch (error) {
    console.error('Error in GET /api/chats:', error);
    return apiError('Internal server error', 500);
  }
}

/**
 * POST /api/chats
 * Create a new chat with an agent
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    const body = await request.json();
    const parsed = createChatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { agent_id } = parsed.data;

    // Use the database function to get or create the chat
    const { data: chatId, error: chatError } = await supabase.rpc(
      'get_or_create_chat',
      {
        p_tenant_id: tenantId,
        p_user_id: userId,
        p_agent_id: agent_id,
      }
    );

    if (chatError) {
      console.error('Error creating chat:', chatError);
      return NextResponse.json(
        { error: 'Failed to create chat' },
        { status: 500 }
      );
    }

    // Fetch the full chat details with agent info
    const { data: chat, error: fetchError } = await supabase
      .from('chats')
      .select(`
        *,
        agent:agents(id, name, avatar_url, role, status)
      `)
      .eq('id', chatId)
      .single();

    if (fetchError) {
      console.error('Error fetching chat:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch chat details' },
        { status: 500 }
      );
    }

    return apiSuccess(chat, 201);
  } catch (error) {
    console.error('Error in POST /api/chats:', error);
    return apiError('Internal server error', 500);
  }
}
