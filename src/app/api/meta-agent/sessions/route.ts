/**
 * GET /api/meta-agent/sessions
 * List meta-agent sessions for the current user
 * Issue: #17 - Meta-Agent Natural Language Interface
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Demo tenant/user IDs for development
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, id')
      .eq('auth_id', user.id)
      .single();

    // Use demo IDs if no profile (for development)
    const tenantId = userProfile?.tenant_id || DEMO_TENANT_ID;
    const userId = userProfile?.id || DEMO_USER_ID;

    if (profileError && !process.env.NODE_ENV?.includes('development')) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    // Set tenant context
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, id')
      .eq('auth_id', user.id)
      .single();

    // Use demo IDs if no profile (for development)
    const tenantId = userProfile?.tenant_id || DEMO_TENANT_ID;
    const userId = userProfile?.id || DEMO_USER_ID;

    if (profileError && !process.env.NODE_ENV?.includes('development')) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    // Set tenant context
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

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
