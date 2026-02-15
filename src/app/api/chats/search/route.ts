import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';
import { escapeIlike } from '@/lib/utils';

const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  agent_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  bookmarked_only: z.coerce.boolean().default(false),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/chats/search
 * Search across all chats for the current user
 * Supports filtering by agent, date range, and bookmark status
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Look up the internal user ID
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Parse query params
    const rawParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = searchQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid search query', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { q, agent_id, date_from, date_to, bookmarked_only, limit, offset } = parsed.data;

    // Get user's chat IDs (respecting agent filter)
    let chatsQuery = supabase
      .from('chats')
      .select('id, agent:agents(id, name, avatar_url)')
      .eq('tenant_id', tenantId)
      .eq('user_id', userProfile.id);

    if (agent_id) {
      chatsQuery = chatsQuery.eq('agent_id', agent_id);
    }

    const { data: userChats, error: chatsError } = await chatsQuery;

    if (chatsError) {
      console.error('Error fetching user chats:', chatsError);
      return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
    }

    if (!userChats || userChats.length === 0) {
      return NextResponse.json({
        query: q,
        messages: [],
        total: 0,
        has_more: false,
      });
    }

    const chatIds = userChats.map((c) => c.id);
    const chatMap = new Map(
      userChats.map((c) => [c.id, c.agent as unknown as { id: string; name: string; avatar_url: string | null } | null])
    );

    // Search messages using ILIKE (works without the FTS migration applied)
    const searchTerm = escapeIlike(q);
    let messagesQuery = supabase
      .from('chat_messages')
      .select('id, chat_id, role, content, is_bookmarked, created_at')
      .in('chat_id', chatIds)
      .ilike('content', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (bookmarked_only) {
      messagesQuery = messagesQuery.eq('is_bookmarked', true);
    }

    if (date_from) {
      messagesQuery = messagesQuery.gte('created_at', date_from);
    }

    if (date_to) {
      messagesQuery = messagesQuery.lte('created_at', date_to);
    }

    const { data: messages, error: messagesError } = await messagesQuery;

    if (messagesError) {
      console.error('Error searching messages:', messagesError);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const results = (messages || []).map((msg) => {
      const agent = chatMap.get(msg.chat_id);
      // Generate a simple context snippet around the match
      const lowerContent = msg.content.toLowerCase();
      const lowerQuery = q.toLowerCase();
      const matchIndex = lowerContent.indexOf(lowerQuery);
      let snippet = msg.content;
      if (matchIndex >= 0 && msg.content.length > 100) {
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(msg.content.length, matchIndex + q.length + 50);
        snippet = (start > 0 ? '...' : '') +
          msg.content.slice(start, end) +
          (end < msg.content.length ? '...' : '');
      }

      return {
        id: msg.id,
        chat_id: msg.chat_id,
        role: msg.role,
        content: msg.content,
        snippet,
        is_bookmarked: msg.is_bookmarked,
        created_at: msg.created_at,
        agent_name: agent?.name || 'Agent',
        agent_avatar: agent?.avatar_url || null,
      };
    });

    return NextResponse.json({
      query: q,
      messages: results,
      total: results.length,
      has_more: results.length === limit,
    });
  } catch (error) {
    console.error('Error in GET /api/chats/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
