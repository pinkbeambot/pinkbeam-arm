import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { updateMessageSchema } from '@/lib/validation';
import { z } from 'zod';

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
 * Get a specific message
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json(
        { error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } },
        { status: 403 }
      );
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

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
        { error: { code: 'FETCH_ERROR', message: 'Failed to fetch message', details: error.message } },
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
 * PATCH /api/messages/:id
 * Update message (mark read, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateMessageSchema.parse(body);

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
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json(
        { error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } },
        { status: 403 }
      );
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

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
        { error: { code: 'UPDATE_ERROR', message: 'Failed to update message', details: error.message } },
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
 * DELETE /api/messages/:id
 * Soft delete message
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json(
        { error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } },
        { status: 403 }
      );
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

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
        { error: { code: 'DELETE_ERROR', message: 'Failed to delete message', details: error.message } },
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
