import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

const exportQuerySchema = z.object({
  format: z.enum(['markdown', 'json', 'text']).default('markdown'),
  bookmarked_only: z.coerce.boolean().default(false),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chats/[id]/export
 * Export a chat transcript in various formats
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    const { id: chatId } = await params;

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

    // Verify chat belongs to user and get agent info
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        id,
        created_at,
        agent:agents(id, name, role)
      `)
      .eq('id', chatId)
      .eq('tenant_id', tenantId)
      .eq('user_id', userProfile.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    // Parse query params
    const rawParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = exportQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid export parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { format, bookmarked_only } = parsed.data;

    // Fetch all messages for export
    let query = supabase
      .from('chat_messages')
      .select('id, role, content, is_bookmarked, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (bookmarked_only) {
      query = query.eq('is_bookmarked', true);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages for export:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    const agent = chat.agent as unknown as { id: string; name: string; role: string } | null;
    const agentName = agent?.name || 'Agent';
    const chatDate = new Date(chat.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const fileSlug = agentName.toLowerCase().replace(/\s+/g, '-');
    const dateSlug = chatDate.replace(/[\s,]+/g, '-').toLowerCase();

    const allMessages = messages || [];

    if (format === 'json') {
      return NextResponse.json({
        chat: {
          id: chat.id,
          agent: agentName,
          created_at: chat.created_at,
          message_count: allMessages.length,
        },
        messages: allMessages.map((m) => ({
          role: m.role,
          content: m.content,
          is_bookmarked: m.is_bookmarked,
          created_at: m.created_at,
        })),
      });
    }

    if (format === 'text') {
      const lines: string[] = [
        `Chat with ${agentName}`,
        `Date: ${chatDate}`,
        `Messages: ${allMessages.length}`,
      ];
      if (bookmarked_only) lines.push('(Bookmarked messages only)');
      lines.push('---', '');

      for (const msg of allMessages) {
        const sender = msg.role === 'user' ? 'You' : agentName;
        const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const bookmark = msg.is_bookmarked ? ' [*]' : '';
        lines.push(`[${time}] ${sender}${bookmark}:`);
        lines.push(msg.content);
        lines.push('');
      }

      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="chat-${fileSlug}-${dateSlug}.txt"`,
        },
      });
    }

    // Default: markdown
    const mdLines: string[] = [
      `# Chat with ${agentName}`,
      '',
      `**Date:** ${chatDate}`,
      `**Messages:** ${allMessages.length}`,
    ];
    if (bookmarked_only) mdLines.push('**Filter:** Bookmarked messages only');
    mdLines.push('', '---', '');

    for (const msg of allMessages) {
      const sender = msg.role === 'user' ? '**You**' : `**${agentName}**`;
      const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const bookmark = msg.is_bookmarked ? ' :star:' : '';
      mdLines.push(`### ${sender} — ${time}${bookmark}`);
      mdLines.push('');
      mdLines.push(msg.content);
      mdLines.push('');
    }

    return new NextResponse(mdLines.join('\n'), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="chat-${fileSlug}-${dateSlug}.md"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/chats/[id]/export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
