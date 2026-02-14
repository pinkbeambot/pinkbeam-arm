import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/messages/:id
 * Get a single message by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Create Supabase client with user's token
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user to extract tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Fetch message with related agent data
    const { data: message, error } = await supabase
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

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      console.error('Error fetching message:', error);
      return NextResponse.json(
        { error: 'Failed to fetch message', details: error.message },
        { status: 500 }
      );
    }

    // Fetch thread messages if this message is part of a thread
    let threadMessages = [];
    if (message.thread_id) {
      const { data: threadData } = await supabase
        .from('messages')
        .select(
          `
          *,
          from_agent:from_agent_id(id, name, avatar_url, role, status)
        `
        )
        .eq('thread_id', message.thread_id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });
      
      threadMessages = threadData || [];
    }

    return NextResponse.json({
      data: {
        ...message,
        from_agent: message.from_agent || undefined,
        to_agent: message.to_agent || undefined,
        thread_messages: threadMessages.length > 0 ? threadMessages : undefined,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/messages/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
