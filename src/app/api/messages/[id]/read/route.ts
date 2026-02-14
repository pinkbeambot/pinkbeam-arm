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
 * POST /api/messages/:id/read
 * Mark a message as read (acknowledged)
 * 
 * This endpoint updates the acked_at timestamp for messages that require acknowledgment.
 * If the message doesn't require acknowledgment, it returns the message unchanged.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
        { error: 'Failed to mark message as read', details: error.message },
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
