import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { updateEscalationSchema, resolveEscalationSchema } from '@/lib/validation';
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
 * GET /api/escalations/:id
 * Get a single escalation by ID
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

    // Fetch escalation with all related data
    const { data: escalation, error } = await supabase
      .from('escalations')
      .select(
        `
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status, description),
        resolver:resolved_by(id, name, avatar_url)
      `
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
      }
      console.error('Error fetching escalation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch escalation', details: error.message },
        { status: 500 }
      );
    }

    // Fetch related activities for this escalation
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('target_id', id)
      .eq('target_type', 'escalation')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      data: {
        ...escalation,
        agent: escalation.agent || undefined,
        task: escalation.task || undefined,
        resolver: escalation.resolver || undefined,
        activity_history: activities || [],
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/escalations/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/escalations/:id
 * Update an escalation (status, resolution, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Parse request body
    const body = await request.json();

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
      .select('tenant_id, id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;
    const userId = userProfile.id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Check if escalation exists and belongs to tenant
    const { data: existingEscalation, error: fetchError } = await supabase
      .from('escalations')
      .select('id, status, created_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingEscalation) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    // Determine if this is a resolution or regular update
    const isResolution = 'resolution_answer' in body;
    
    let updateData: Record<string, unknown> = {};
    let validatedData;

    if (isResolution) {
      // Handle resolution
      validatedData = resolveEscalationSchema.parse(body);
      updateData = {
        status: validatedData.status,
        resolution_type: validatedData.resolution_type,
        resolution_answer: validatedData.resolution_answer,
        resolution_resources: validatedData.resolution_resources || {},
        learning_notes: validatedData.learning_notes,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
      };

      // Calculate time to resolve in seconds
      const createdAt = new Date(existingEscalation.created_at);
      const resolvedAt = new Date();
      updateData.time_to_resolve_seconds = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 1000);
    } else {
      // Handle regular update
      validatedData = updateEscalationSchema.parse(body);
      updateData = { ...validatedData };
    }

    // Update the escalation
    const { data: escalation, error } = await supabase
      .from('escalations')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(
        `
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status),
        resolver:resolved_by(id, name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error('Error updating escalation:', error);
      return NextResponse.json(
        { error: 'Failed to update escalation', details: error.message },
        { status: 500 }
      );
    }

    // Activity logging is handled by database triggers

    return NextResponse.json({ data: escalation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in PATCH /api/escalations/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/escalations/:id
 * Delete an escalation (only if not resolved)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check if escalation exists and get its status
    const { data: existingEscalation, error: fetchError } = await supabase
      .from('escalations')
      .select('id, status, title')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingEscalation) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    // Prevent deletion of resolved escalations (keep audit trail)
    if (existingEscalation.status === 'resolved' || existingEscalation.status === 'dismissed') {
      return NextResponse.json(
        {
          error: 'Cannot delete resolved escalation',
          message: 'Resolved escalations are kept for audit purposes.',
        },
        { status: 400 }
      );
    }

    // Delete the escalation
    const { error } = await supabase
      .from('escalations')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting escalation:', error);
      return NextResponse.json(
        { error: 'Failed to delete escalation', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Escalation deleted successfully',
        deleted_escalation: {
          id,
          title: existingEscalation.title,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/escalations/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
