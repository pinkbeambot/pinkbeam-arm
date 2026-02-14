import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Demo tenant ID - in production, this would come from auth context
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/chats
 * List all chats for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Call the database function to get user chats with agent info
    const { data: chats, error } = await supabase.rpc('get_user_chats', {
      p_tenant_id: DEMO_TENANT_ID,
      p_user_id: DEMO_USER_ID,
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
      tenant_id: DEMO_TENANT_ID,
      user_id: DEMO_USER_ID,
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

    return NextResponse.json({ chats: formattedChats });
  } catch (error) {
    console.error('Error in GET /api/chats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats
 * Create a new chat with an agent
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body = await request.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Use the database function to get or create the chat
    const { data: chatId, error: chatError } = await supabase.rpc(
      'get_or_create_chat',
      {
        p_tenant_id: DEMO_TENANT_ID,
        p_user_id: DEMO_USER_ID,
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

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/chats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
