import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

const updateMessageSchema = z.object({
  is_bookmarked: z.boolean().optional(),
});

/**
 * PATCH /api/chats/[id]/messages/[messageId]
 * Update a message (e.g., toggle bookmark)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: chatId, messageId } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Look up the internal user ID from the users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Verify user owns this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', userProfile.id)
      .eq('tenant_id', tenantId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update the message
    const { data: message, error: updateError } = await supabase
      .from('chat_messages')
      .update(updates)
      .eq('id', messageId)
      .eq('chat_id', chatId)
      .select('id, chat_id, role, content, is_bookmarked, created_at')
      .single();

    if (updateError || !message) {
      console.error('Error updating message:', updateError);
      return NextResponse.json(
        { error: 'Message not found or update failed' },
        { status: updateError ? 500 : 404 }
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/chats/{id}/messages/{messageId}:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /chats/{id}/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     description: Delete a user message from a chat
 *     tags:
 *       - Chats
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only delete your own messages
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: chatId, messageId } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Look up the internal user ID from the users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    const internalUserId = userProfile.id;

    // Verify user owns this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', internalUserId)
      .eq('tenant_id', tenantId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Verify the message exists and belongs to the chat
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, role')
      .eq('id', messageId)
      .eq('chat_id', chatId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only allow deleting user messages
    if (message.role !== 'user') {
      return NextResponse.json(
        { error: 'Can only delete your own messages' },
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
        { error: 'Failed to delete message', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/chats/{id}/messages/{messageId}:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
