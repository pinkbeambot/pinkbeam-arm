/**
 * GET /api/meta-agent/sessions
 * List meta-agent sessions for the current user
 * Issue: #17 - Meta-Agent Natural Language Interface
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

const listSessionsSchema = z.object({
  status: z.enum(['active', 'archived', 'closed']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/**
 * GET /api/meta-agent/sessions
 * List sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
    };

    const validatedQuery = listSessionsSchema.parse(queryParams);
    const { status, limit, offset } = validatedQuery;

    // Build query
    let dbQuery = supabase
      .from('meta_agent_sessions')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('last_activity_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      dbQuery = dbQuery.eq('status', status);
    }

    const { data: sessions, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessions: sessions || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching meta-agent sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meta-agent/sessions
 * Create a new session
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Parse request body
    const body = await request.json();
    const title = body.title || `VALIS Session ${new Date().toLocaleString()}`;

    // Create new session
    const { data: session, error } = await supabase
      .from('meta_agent_sessions')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        title,
        status: 'active',
        context: {
          conversation_state: 'idle',
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to create session', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ session }, { status: 201 });

  } catch (error) {
    console.error('Error creating meta-agent session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
