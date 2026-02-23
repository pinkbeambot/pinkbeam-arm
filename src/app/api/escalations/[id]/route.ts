import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiDeleted, apiError } from '@/lib/api/response';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateEscalationSchema = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved', 'dismissed']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
  resolution_answer: z.string().optional(),
});

/**
 * @openapi
 * /escalations/{id}:
 *   get:
 *     summary: Get escalation by ID
 *     description: Get a single escalation by ID with related agent, task, and resolver data including activity history
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
 *     responses:
 *       200:
 *         description: Escalation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Escalation'
 *                     - type: object
 *                       properties:
 *                         activity_history:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Activity'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Escalation not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const { data: escalation, error: fetchError } = await supabase
      .from('escalations')
      .select(`
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status, description),
        resolver:resolved_by(id, name, avatar_url),
        acknowledger:acknowledged_by(id, name, avatar_url)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
      }
      console.error('Failed to fetch escalation:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch escalation' }, { status: 500 });
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
        acknowledger: escalation.acknowledger || undefined,
        activity_history: activities || [],
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * @openapi
 * /escalations/{id}:
 *   patch:
 *     summary: Update an escalation
 *     description: Update escalation status, urgency, or resolution. Supports acknowledging, resolving, or dismissing escalations with automatic SLA tracking.
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEscalationInput'
 *     responses:
 *       200:
 *         description: Escalation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Escalation'
 *       400:
 *         description: Validation error or escalation already resolved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Escalation not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    const body = await request.json();
    const validatedData = updateEscalationSchema.parse(body);

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

    // Check if already resolved/dismissed
    if (existing.status === 'resolved' || existing.status === 'dismissed') {
      if (validatedData.status && validatedData.status !== existing.status) {
        return NextResponse.json(
          { error: 'Cannot modify resolved or dismissed escalation' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = { ...validatedData };

    // Look up the users table row ID for user tracking
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .single();
    const profileUserId = userRow?.id;

    // If acknowledging, track acknowledgment info
    if (validatedData.status === 'acknowledged' && existing.status !== 'acknowledged') {
      updateData.acknowledged_by = profileUserId;
      updateData.acknowledged_at = new Date().toISOString();
    }

    // If resolving/dismissing, track resolution info
    if (validatedData.status === 'resolved' || validatedData.status === 'dismissed') {
      if (existing.status !== 'resolved' && existing.status !== 'dismissed') {
        updateData.resolved_by = profileUserId;
        updateData.resolved_at = new Date().toISOString();

        const createdAt = new Date(existing.created_at);
        const resolvedAt = new Date();
        updateData.time_to_resolve_seconds = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 1000);
      }
    }

    const { data: escalation, error } = await supabase
      .from('escalations')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status),
        resolver:resolved_by(id, name, avatar_url),
        acknowledger:acknowledged_by(id, name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error updating escalation:', error);
      return NextResponse.json({ error: 'Failed to update escalation' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        ...escalation,
        agent: escalation.agent || undefined,
        task: escalation.task || undefined,
        resolver: escalation.resolver || undefined,
        acknowledger: escalation.acknowledger || undefined,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error in PATCH /api/escalations/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * @openapi
 * /escalations/{id}:
 *   delete:
 *     summary: Soft delete an escalation
 *     description: Soft delete an escalation by setting deleted_at timestamp. Resolved or dismissed escalations can be deleted for archival purposes.
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
 *     responses:
 *       200:
 *         description: Escalation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Escalation not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Check if escalation exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('escalations')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    // Soft delete by setting deleted_at
    const { error } = await supabase
      .from('escalations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting escalation:', error);
      return apiError('Failed to delete escalation', 500);
    }

    return apiDeleted({ id });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/escalations/:id:', error);
    return apiError('Internal server error', 500);
  }
}
