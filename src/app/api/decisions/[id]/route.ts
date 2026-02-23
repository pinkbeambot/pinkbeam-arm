import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { updateDecisionSchema, overrideDecisionSchema } from '@/lib/validation';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * @openapi
 * /decisions/{id}:
 *   get:
 *     summary: Get decision by ID
 *     description: Get a single decision by ID with related data (agent, task, overrider, activity history)
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
 *     responses:
 *       200:
 *         description: Decision details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Decision'
 *                     - type: object
 *                       properties:
 *                         activity_history:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Activity'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Decision not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Fetch decision with all related data
    const { data: decision, error } = await supabase
      .from('decisions')
      .select(
        `
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status, description),
        overrider:overridden_by(id, name, avatar_url)
      `
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
      }
      console.error('Error fetching decision:', error);
      return NextResponse.json(
        { error: 'Failed to fetch decision' },
        { status: 500 }
      );
    }

    // Fetch related activities for this decision
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('target_id', id)
      .eq('target_type', 'decision')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      data: {
        ...decision,
        agent: decision.agent || undefined,
        task: decision.task || undefined,
        overrider: decision.overrider || undefined,
        activity_history: activities || [],
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/decisions/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /decisions/{id}:
 *   patch:
 *     summary: Update a decision
 *     description: Update decision status, outcome, or override it. Supports approving, rejecting, executing, or overriding decisions.
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
 *             oneOf:
 *               - $ref: '#/components/schemas/UpdateDecisionInput'
 *               - $ref: '#/components/schemas/OverrideDecisionInput'
 *     responses:
 *       200:
 *         description: Decision updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Decision'
 *       400:
 *         description: Validation error or decision is immutable
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Decision not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse request body
    const body = await request.json();

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Look up the internal user ID for override tracking
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

    // Determine update type based on body structure
    const isOverride = 'reason' in body;

    let updateData: Record<string, unknown> = {};
    let validatedData;

    if (isOverride) {
      // Handle override
      validatedData = overrideDecisionSchema.parse(body);
      updateData = {
        status: 'overridden',
        overridden_by: internalUserId,
        override_reason: validatedData.reason,
        executed_action: validatedData.correct_action || null,
        overridden_at: new Date().toISOString(),
        decided_at: new Date().toISOString(),
      };
    } else {
      // Handle regular update
      validatedData = updateDecisionSchema.parse(body);
      updateData = { ...validatedData };

      // Track timestamps based on status changes
      if (validatedData.status === 'approved' || validatedData.status === 'rejected') {
        updateData.decided_at = new Date().toISOString();
      }
      if (validatedData.status === 'executed') {
        updateData.executed_at = new Date().toISOString();
        if (!updateData.decided_at) {
          updateData.decided_at = new Date().toISOString();
        }
      }
    }

    // Update the decision
    const { data: decision, error } = await supabase
      .from('decisions')
      .update(updateData)
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
      console.error('Error updating decision:', error);
      return NextResponse.json(
        { error: 'Failed to update decision' },
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
    console.error('Unexpected error in PATCH /api/decisions/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
