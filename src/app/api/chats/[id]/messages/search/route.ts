import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chats/[id]/messages/search
 * Full-text search within a specific chat's messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    const { id: chatId } = await params;

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

    // Parse and validate query params
    const rawParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = searchQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid search query', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { q, limit, offset } = parsed.data;

    // Use the search_chat_messages stored function
    const { data: results, error: searchError } = await supabase.rpc(
      'search_chat_messages',
      {
        p_chat_id: chatId,
        p_query: q,
        p_limit: limit,
        p_offset: offset,
      }
    );

    if (searchError) {
      console.error('Error searching chat messages:', searchError);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    const messages = (results || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      chat_id: r.chat_id,
      role: r.role,
      content: r.content,
      is_bookmarked: r.is_bookmarked,
      created_at: r.created_at,
      rank: r.rank,
      headline: r.headline,
    }));

    return NextResponse.json({
      query: q,
      messages,
      total: messages.length,
      has_more: messages.length === limit,
    });
  } catch (error) {
    console.error('Error in GET /api/chats/[id]/messages/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
