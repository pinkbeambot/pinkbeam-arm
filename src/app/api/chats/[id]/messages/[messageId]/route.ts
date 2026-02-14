import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Demo tenant ID - in production, this would come from auth context
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

interface RouteParams {
  params: Promise<{ id: string; messageId: string }>;
}

/**
 * DELETE /api/chats/[id]/messages/[messageId]
 * Delete a specific message (user messages only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: chatId, messageId } = await params;
    const supabase = await createServerSupabaseClient();

    // Verify the chat belongs to the current user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('tenant_id', DEMO_TENANT_ID)
      .eq('user_id', DEMO_USER_ID)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    // Verify the message exists, belongs to this chat, and is a user message
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, role')
      .eq('id', messageId)
      .eq('chat_id', chatId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Only allow deleting user messages
    if (message.role !== 'user') {
      return NextResponse.json(
        { error: 'Cannot delete agent or system messages' },
        { status: 403 }
      );
    }

    // Delete the message
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('chat_id', chatId);

    if (deleteError) {
      console.error('Error deleting message:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/chats/[id]/messages/[messageId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chats/[id]/messages/[messageId]
 * Edit a specific message (user messages only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: chatId, messageId } = await params;
    const supabase = await createServerSupabaseClient();

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Verify the chat belongs to the current user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('tenant_id', DEMO_TENANT_ID)
      .eq('user_id', DEMO_USER_ID)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    // Verify the message exists, belongs to this chat, and is a user message
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, role')
      .eq('id', messageId)
      .eq('chat_id', chatId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Only allow editing user messages
    if (message.role !== 'user') {
      return NextResponse.json(
        { error: 'Cannot edit agent or system messages' },
        { status: 403 }
      );
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from('chat_messages')
      .update({ content: content.trim() })
      .eq('id', messageId)
      .eq('chat_id', chatId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating message:', updateError);
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error('Error in PATCH /api/chats/[id]/messages/[messageId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
