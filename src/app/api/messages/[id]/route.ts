import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { updateMessageSchema } from '@/lib/validation';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * @openapi
 * /messages/{id}:
 *   get:
 *     summary: Get message by ID
 *     description: Get a specific message by ID with sender and recipient agent details
 *     tags:
 *       - Messages
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Fetch message with related data
    const { data: message, error } = await supabase
      .from('messages')
      .select(
        `
        *,
        from_agent:from_agent_id(id, name, avatar_url, status, role),
        to_agent:to_agent_id(id, name, avatar_url, status, role)
      `
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Message not found' } },
          { status: 404 }
        );
      }
      console.error('Error fetching message:', error);
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Failed to fetch message' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        ...message,
        from_agent: message.from_agent || undefined,
        to_agent: message.to_agent || undefined,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/messages/:id:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /messages/{id}:
 *   patch:
 *     summary: Update a message
 *     description: Update message properties such as acknowledgment status or payload
 *     tags:
 *       - Messages
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMessageInput'
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateMessageSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Check if message exists and belongs to tenant
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingMessage) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Message not found' } },
        { status: 404 }
      );
    }

    // Update the message
    const { data: message, error } = await supabase
      .from('messages')
      .update(validatedData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(
        `
        *,
        from_agent:from_agent_id(id, name, avatar_url, status, role),
        to_agent:to_agent_id(id, name, avatar_url, status, role)
      `
      )
      .single();

    if (error) {
      console.error('Error updating message:', error);
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: 'Failed to update message' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        ...message,
        from_agent: message.from_agent || undefined,
        to_agent: message.to_agent || undefined,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Validation error', details: error.issues } },
        { status: 400 }
      );
    }
    console.error('Unexpected error in PATCH /api/messages/:id:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /messages/{id}:
 *   delete:
 *     summary: Delete a message
 *     description: Soft delete a message by marking it as deleted in the payload
 *     tags:
 *       - Messages
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Check if message exists and belongs to tenant
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('id, payload')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingMessage) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Message not found' } },
        { status: 404 }
      );
    }

    // Soft delete by updating the payload to indicate deletion
    const deleteTime = new Date().toISOString();
    const { data: message, error } = await supabase
      .from('messages')
      .update({
        processed_at: deleteTime,
        payload: {
          ...existingMessage.payload,
          _deleted: true,
          _deleted_at: deleteTime,
        },
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id')
      .single();

    if (error) {
      console.error('Error deleting message:', error);
      return NextResponse.json(
        { error: { code: 'DELETE_ERROR', message: 'Failed to delete message' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Message deleted successfully',
      data: { id: message.id },
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/messages/:id:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
