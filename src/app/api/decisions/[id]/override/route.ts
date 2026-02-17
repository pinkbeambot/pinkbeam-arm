import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { overrideDecisionSchema } from '@/lib/validation/decision';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * @openapi
 * /decisions/{id}/override:
 *   post:
 *     summary: Override a decision
 *     description: |
 *       Human override of a decision. Changes status to 'overridden' and records 
 *       who performed the override, when, and why. Optionally provide the correct 
 *       action that should have been taken.
 *       
 *       Can override decisions in any status except already overridden.
 *     tags:
 *       - Decisions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Decision ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: Reason for the override
 *               correct_action:
 *                 type: object
 *                 description: The correct action that should have been taken
 *     responses:
 *       200:
 *         description: Decision overridden successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Decision'
 *       400:
 *         description: Validation error or decision cannot be overridden
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Decision not found
 *       409:
 *         description: Decision already overridden
 *       500:
 *         description: Internal server error
 */
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
