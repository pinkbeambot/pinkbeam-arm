import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

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

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

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
        { error: { code: 'FETCH_ERROR', message: 'Failed to fetch thread messages' } },
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
