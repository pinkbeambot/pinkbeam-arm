import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface RouteParams {
  params: Promise<{ id: string }>;
}

const resolveEscalationSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  resolution_type: z.string().optional(),
  resolution_answer: z.string().min(1),
  resolution_resources: z.record(z.string(), z.unknown()).optional(),
  learning_notes: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const body = await request.json();
    const validatedData = resolveEscalationSchema.parse(body);

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
      .select('tenant_id, id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;
    const userId = userProfile.id;
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { data: existingEscalation, error: fetchError } = await supabase
      .from('escalations')
      .select('id, status, created_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingEscalation) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    if (existingEscalation.status === 'resolved' || existingEscalation.status === 'dismissed') {
      return NextResponse.json({ error: 'Escalation already resolved' }, { status: 400 });
    }

    const createdAt = new Date(existingEscalation.created_at);
    const resolvedAt = new Date();
    const timeToResolveSeconds = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 1000);

    const { data: escalation, error } = await supabase
      .from('escalations')
      .update({
        status: validatedData.status,
        resolution_type: validatedData.resolution_type,
        resolution_answer: validatedData.resolution_answer,
        resolution_resources: validatedData.resolution_resources || {},
        learning_notes: validatedData.learning_notes,
        resolved_by: userId,
        resolved_at: resolvedAt.toISOString(),
        time_to_resolve_seconds: timeToResolveSeconds,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`*, agent:agent_id(id, name, avatar_url, role, status), task:task_id(id, title, status), resolver:resolved_by(id, name, avatar_url)`)
      .single();

    if (error) {
      console.error('Error resolving escalation:', error);
      return NextResponse.json({ error: 'Failed to resolve escalation', details: error.message }, { status: 500 });
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
