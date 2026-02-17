import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { overrideDecisionSchema } from '@/lib/validation/decision';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = overrideDecisionSchema.parse(body);

    // Look up the internal user ID for override tracking
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('auth_id', userId)
      .single();

    const internalUserId = userProfile?.id;

    // Check if decision exists and belongs to tenant
    const { data: existingDecision, error: fetchError } = await supabase
      .from('decisions')
      .select('id, status, immutable')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingDecision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    // Check if decision is immutable
    if (existingDecision.immutable) {
      return NextResponse.json(
        { error: 'Decision is immutable and cannot be modified' },
        { status: 400 }
      );
    }

    // Check if decision is already overridden
    if (existingDecision.status === 'overridden') {
      return NextResponse.json(
        { error: 'Decision has already been overridden' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Update the decision
    const { data: decision, error } = await supabase
      .from('decisions')
      .update({
        status: 'overridden',
        overridden_by: internalUserId,
        override_reason: validatedData.reason,
        executed_action: validatedData.correct_action || null,
        overridden_at: now,
        decided_at: now,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(
        `
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status),
        overrider:overridden_by(id, name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error('Error overriding decision:', error);
      return NextResponse.json(
        { error: 'Failed to override decision' },
        { status: 500 }
      );
    }

    // Activity logging is handled by database triggers

    return NextResponse.json({ data: decision });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/decisions/:id/override:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
