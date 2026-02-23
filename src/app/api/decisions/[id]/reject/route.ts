import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { rejectDecisionSchema } from '@/lib/validation/decision';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * @openapi
 * /decisions/{id}/reject:
 *   post:
 *     summary: Reject a decision
 *     description: Reject a proposed decision. Changes status from 'proposed' to 'rejected'. Requires a rejection reason.
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
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Decision rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Decision'
 *       400:
 *         description: Validation error or decision cannot be rejected
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Decision not found
 *       409:
 *         description: Decision already processed
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
    const validatedData = rejectDecisionSchema.parse(body);

    // Look up the internal user ID for rejection tracking
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
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

    // Check if decision can be rejected (must be 'proposed')
    if (existingDecision.status !== 'proposed') {
      return NextResponse.json(
        { error: `Cannot reject decision with status '${existingDecision.status}'. Only 'proposed' decisions can be rejected.` },
        { status: 409 }
      );
    }

    // Update the decision
    const { data: decision, error } = await supabase
      .from('decisions')
      .update({
        status: 'rejected',
        decided_at: new Date().toISOString(),
        outcome: {
          rejection_reason: validatedData.reason,
          rejected_by: internalUserId,
        },
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
      console.error('Error rejecting decision:', error);
      return NextResponse.json(
        { error: 'Failed to reject decision' },
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
    console.error('Unexpected error in POST /api/decisions/:id/reject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
