import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateEscalationSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
  resolution_answer: z.string().optional(),
});

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
      .from('users').select('tenant_id').eq('auth_id', user.id).single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { data: escalation, error: fetchError } = await supabase
      .from('escalations')
      .select('*, agent:agent_id(id, name, avatar_url), task:task_id(id, title, status)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch escalation', details: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ data: escalation });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
      .from('users').select('tenant_id, id').eq('auth_id', user.id).single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;
    const userId = userProfile.id;
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { data: existing, error: fetchError } = await supabase
      .from('escalations').select('id, status, created_at')
      .eq('id', id).eq('tenant_id', tenantId).single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = { ...validatedData };

    // If resolving, track resolution info
    if (validatedData.status === 'resolved' || validatedData.status === 'dismissed') {
      if (existing.status !== 'resolved' && existing.status !== 'dismissed') {
        updateData.resolved_by = userId;
        updateData.resolved_at = new Date().toISOString();
        
        const createdAt = new Date(existing.created_at);
        const resolvedAt = new Date();
        updateData.time_to_resolve_seconds = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 1000);
      }
    }

    const { data: escalation, error } = await supabase
      .from('escalations')
      .update(updateData)
      .eq('id', id).eq('tenant_id', tenantId)
      .select('*, agent:agent_id(id, name, avatar_url), task:task_id(id, title, status)')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update escalation', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: escalation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
