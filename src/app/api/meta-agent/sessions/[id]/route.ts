/**
 * GET /api/meta-agent/sessions/[id]
 * Get session details and history
 * Issue: #17 - Meta-Agent Natural Language Interface
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  before: z.string().datetime().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/meta-agent/sessions/[id]
 * Get session details and command history
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Get session ID from params
    const { id: sessionId } = await params;

    // Validate session ID
    const sessionIdSchema = z.string().uuid();
    sessionIdSchema.parse(sessionId);

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('meta_agent_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Parse query parameters for history
    const { searchParams } = new URL(request.url);
    const queryParams = {
      limit: searchParams.get('limit') || '50',
      before: searchParams.get('before') || undefined,
    };

    const validatedQuery = historyQuerySchema.parse(queryParams);
    const { limit, before } = validatedQuery;

    // Get command history
    let historyQuery = supabase
      .from('meta_agent_commands')
      .select('*')
      .eq('session_id', sessionId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      historyQuery = historyQuery.lt('created_at', before);
    }

    const { data: commands, error: historyError } = await historyQuery;

    if (historyError) {
      console.error('Failed to fetch command history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch command history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session,
      commands: commands || [],
      has_more: (commands?.length || 0) >= limit,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching session details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meta-agent/sessions/[id]
 * Update session (archive, close, update title, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Get session ID from params
    const { id: sessionId } = await params;

    // Parse request body
    const body = await request.json();

    // Build update object
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === 'closed') {
        updates.ended_at = new Date().toISOString();
      }
    }
    if (body.context !== undefined) updates.context = body.context;

    // Update session
    const { data: session, error } = await supabase
      .from('meta_agent_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session:', error);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ session });

  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meta-agent/sessions/[id]
 * Delete a session and its command history
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Get session ID from params
    const { id: sessionId } = await params;

    // Delete session (commands will cascade due to FK constraint)
    const { error } = await supabase
      .from('meta_agent_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting session:', error);
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
