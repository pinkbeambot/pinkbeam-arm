import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

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

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    const body = await request.json();
    const validatedData = resolveEscalationSchema.parse(body);

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

    // Look up the users table row ID for resolved_by (references users.id, not auth.users.id)
    const { data: userRow } = await supabase
      .from('users').select('id').eq('auth_id', userId).single();

    const profileUserId = userRow?.id;

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
        resolved_by: profileUserId,
        resolved_at: resolvedAt.toISOString(),
        time_to_resolve_seconds: timeToResolveSeconds,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`*, agent:agent_id(id, name, avatar_url, role, status), task:task_id(id, title, status), resolver:resolved_by(id, name, avatar_url)`)
      .single();

    if (error) {
      console.error('Error resolving escalation:', error);
      return NextResponse.json({ error: 'Failed to resolve escalation' }, { status: 500 });
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
