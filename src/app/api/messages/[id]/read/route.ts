import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/messages/:id/read
 * Mark a message as read (acknowledged)
 *
 * This endpoint updates the acked_at timestamp for messages that require acknowledgment.
 * If the message doesn't require acknowledgment, it returns the message unchanged.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Check if message exists and get current state
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('id, requires_ack, acked_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // If message doesn't require acknowledgment, return it as-is
    if (!existingMessage.requires_ack) {
      const { data: message } = await supabase
        .from('messages')
        .select(
          `
          *,
          from_agent:from_agent_id(id, name, avatar_url, role, status),
          to_agent:to_agent_id(id, name, avatar_url, role, status)
        `
        )
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      return NextResponse.json({
        data: message,
        note: 'Message does not require acknowledgment',
      });
    }

    // If already acknowledged, return the message
    if (existingMessage.acked_at) {
      const { data: message } = await supabase
        .from('messages')
        .select(
          `
          *,
          from_agent:from_agent_id(id, name, avatar_url, role, status),
          to_agent:to_agent_id(id, name, avatar_url, role, status)
        `
        )
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      return NextResponse.json({
        data: message,
        note: 'Message was already acknowledged',
      });
    }

    // Mark as acknowledged
    const { data: message, error } = await supabase
      .from('messages')
      .update({
        acked_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(
        `
        *,
        from_agent:from_agent_id(id, name, avatar_url, role, status),
        to_agent:to_agent_id(id, name, avatar_url, role, status)
      `
      )
      .single();

    if (error) {
      console.error('Error marking message as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark message as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: message });
  } catch (error) {
    console.error('Unexpected error in POST /api/messages/:id/read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
