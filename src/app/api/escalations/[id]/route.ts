import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

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

/**
 * @openapi
 * /escalations/{id}:
 *   get:
 *     summary: Get escalation by ID
 *     description: Get a single escalation by ID with related agent and task data
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
 *                   $ref: '#/components/schemas/Escalation'
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

/**
 * @openapi
 * /escalations/{id}:
 *   patch:
 *     summary: Update an escalation
 *     description: Update escalation status, urgency, or resolution. Resolving tracks time_to_resolve_seconds automatically.
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
 *         description: Validation error
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
        // Look up the users table row ID for resolved_by (references users.id, not auth.users.id)
        const { data: userRow } = await supabase
          .from('users').select('id').eq('auth_id', userId).single();

        updateData.resolved_by = userRow?.id;
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
      return NextResponse.json({ error: 'Failed to update escalation' }, { status: 500 });
    }

    return NextResponse.json({ data: escalation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
