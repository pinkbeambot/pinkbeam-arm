import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/messages/thread/:id
 * Get all messages in a thread
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: threadId } = await params;

    // Validate thread ID format
    const uuidSchema = z.string().uuid();
    const result = uuidSchema.safeParse(threadId);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid thread ID format' } },
        { status: 400 }
      );
    }

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];

    // Create Supabase client with user's token
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user to extract tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json(
        { error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } },
        { status: 403 }
      );
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Fetch all messages in the thread
    const { data: messages, error } = await supabase
      .from('messages')
      .select(
        `
        *,
        from_agent:from_agent_id(id, name, avatar_url, status, role),
        to_agent:to_agent_id(id, name, avatar_url, status, role)
      `
      )
      .eq('thread_id', threadId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching thread messages:', error);
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Failed to fetch thread messages', details: error.message } },
        { status: 500 }
      );
    }

    // Get unique participant IDs from messages
    const participantIds = new Set<string>();
    messages?.forEach((msg) => {
      if (msg.from_agent_id) participantIds.add(msg.from_agent_id);
      if (msg.to_agent_id) participantIds.add(msg.to_agent_id);
    });

    // Fetch participant details
    let participants: { id: string; name: string; avatar_url?: string; status: string; role: string }[] = [];
    if (participantIds.size > 0) {
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, avatar_url, status, role')
        .in('id', Array.from(participantIds))
        .eq('tenant_id', tenantId);
      participants = agents || [];
    }

    // Format messages
    const formattedMessages = messages?.map((message) => ({
      ...message,
      from_agent: message.from_agent || undefined,
      to_agent: message.to_agent || undefined,
    }));

    // Get thread metadata (first message info)
    const firstMessage = formattedMessages?.[0];
    const lastMessage = formattedMessages?.[formattedMessages.length - 1];

    return NextResponse.json({
      data: formattedMessages || [],
      meta: {
        thread_id: threadId,
        message_count: messages?.length || 0,
        participants,
        first_message_at: firstMessage?.created_at,
        last_message_at: lastMessage?.created_at,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/messages/thread/:id:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
