import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const acknowledgeEscalationSchema = z.object({
  notes: z.string().optional(),
});

/**
 * @openapi
 * /escalations/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge an escalation
 *     description: Mark an escalation as acknowledged by a user. Sets acknowledged_at and acknowledged_by timestamps automatically. Cannot acknowledge already resolved or dismissed escalations.
 *     tags:
 *       - Escalations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Escalation ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional acknowledgment notes
 *     responses:
 *       200:
 *         description: Escalation acknowledged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Escalation'
 *       400:
 *         description: Escalation already acknowledged, resolved, or dismissed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Escalation not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Parse optional notes
    let notes: string | undefined;
    try {
      const body = await request.json();
      const validated = acknowledgeEscalationSchema.parse(body);
      notes = validated.notes;
    } catch {
      // Body is optional, ignore parsing errors
    }

    // Check if escalation exists and is in a valid state
    const { data: existing, error: fetchError } = await supabase
      .from('escalations')
      .select('id, status, created_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    // Cannot acknowledge if already resolved or dismissed
    if (existing.status === 'resolved' || existing.status === 'dismissed') {
      return NextResponse.json(
        { error: 'Cannot acknowledge resolved or dismissed escalation' },
        { status: 400 }
      );
    }

    // Cannot acknowledge if already acknowledged
    if (existing.status === 'acknowledged') {
      return NextResponse.json(
        { error: 'Escalation already acknowledged' },
        { status: 400 }
      );
    }

    // Look up the users table row ID for acknowledged_by
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .single();

    const profileUserId = userRow?.id;
    const now = new Date().toISOString();

    // Update the escalation
    const { data: escalation, error } = await supabase
      .from('escalations')
      .update({
        status: 'acknowledged',
        acknowledged_by: profileUserId,
        acknowledged_at: now,
        // Store notes in agent_analysis if provided
        ...(notes && {
          agent_analysis: {
            acknowledgment_notes: notes,
          },
        }),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status),
        acknowledger:acknowledged_by(id, name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error acknowledging escalation:', error);
      return NextResponse.json(
        { error: 'Failed to acknowledge escalation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        ...escalation,
        agent: escalation.agent || undefined,
        task: escalation.task || undefined,
        acknowledger: escalation.acknowledger || undefined,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/escalations/:id/acknowledge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
