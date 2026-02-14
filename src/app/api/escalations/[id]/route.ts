import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { data: escalation, error } = await supabase
      .from('escalations')
      .select(`*, agent:agent_id(id, name, avatar_url, role, status), task:task_id(id, title, status, description), resolver:resolved_by(id, name, avatar_url)`)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
      }
      console.error('Error fetching escalation:', error);
      return NextResponse.json({ error: 'Failed to fetch escalation', details: error.message }, { status: 500 });
    }

    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('target_id', id)
      .eq('target_type', 'escalation')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      data: { ...escalation, agent: escalation.agent || undefined, task: escalation.task || undefined, resolver: escalation.resolver || undefined, activity_history: activities || [] },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateEscalationSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const body = await request.json();
    const validatedData = updateEscalationSchema.parse(body);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { data: existingEscalation, error: fetchError } = await supabase
      .from('escalations')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingEscalation) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    const { data: escalation, error } = await supabase
      .from('escalations')
      .update(validatedData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`*, agent:agent_id(id, name, avatar_url, role, status), task:task_id(id, title, status), resolver:resolved_by(id, name, avatar_url)`)
      .single();

    if (error) {
      console.error('Error updating escalation:', error);
      return NextResponse.json({ error: 'Failed to update escalation', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: escalation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { data: existingEscalation, error: fetchError } = await supabase
      .from('escalations')
      .select('id, status, title')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingEscalation) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    if (existingEscalation.status === 'resolved' || existingEscalation.status === 'dismissed') {
      return NextResponse.json({ error: 'Cannot delete resolved escalation', message: 'Resolved escalations are kept for audit purposes.' }, { status: 400 });
    }

    const { error } = await supabase.from('escalations').delete().eq('id', id).eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting escalation:', error);
      return NextResponse.json({ error: 'Failed to delete escalation', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Escalation deleted successfully', deleted_escalation: { id, title: existingEscalation.title } }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
