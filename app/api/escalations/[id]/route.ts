import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateEscalationSchema } from '@/lib/validation';

/**
 * GET /api/escalations/[id]
 *
 * Get a single escalation by ID with full details.
 * Includes related agent, task, and resolver information.
 *
 * Path Parameters:
 * - id: Escalation UUID (required)
 *
 * Response: { data: Escalation }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  try {
    // Fetch escalation with related data
    const { data: escalation, error } = await supabase
      .from('escalations')
      .select(
        `*,
        agent:agent_id(id, name, role, status, avatar_url),
        task:task_id(id, title, status, priority, progress_percent),
        resolver:resolved_by(id, email, name, avatar_url)
        `
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('Escalation GET error:', error);

      if (error.code === 'PGRST116') {
        return apiError('Escalation not found', 404);
      }

      return apiError('Failed to fetch escalation', 500, error.message);
    }

    if (!escalation) {
      return apiError('Escalation not found', 404);
    }

    // Calculate time remaining until SLA deadline
    const now = new Date();
    const slaDeadline = escalation.sla_deadline_at
      ? new Date(escalation.sla_deadline_at)
      : null;
    const timeToResolve = slaDeadline
      ? Math.max(0, Math.floor((slaDeadline.getTime() - now.getTime()) / 1000))
      : null;

    return apiSuccess({
      ...escalation,
      time_to_resolve_seconds: timeToResolve,
    });
  } catch (err) {
    console.error('Escalation GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * PATCH /api/escalations/[id]
 *
 * Update an escalation's properties. Partial updates are supported.
 * Cannot modify resolved or dismissed escalations (use specific endpoints).
 *
 * Path Parameters:
 * - id: Escalation UUID (required)
 *
 * Body Parameters (all optional):
 * - status: Escalation status (open, in_progress, resolved, dismissed)
 * - urgency: Urgency level (low, normal, high, critical)
 * - title: Escalation title (1-500 chars)
 * - description: Detailed description
 * - situation_context: JSON object with context
 * - question: Question details
 * - agent_analysis: Agent's analysis
 *
 * Response: { data: Escalation }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;
  const { id } = await params;

  try {
    // First, check if escalation exists and is not resolved/dismissed
    const { data: existingEscalation, error: fetchError } = await supabase
      .from('escalations')
      .select('id, status, tenant_id, urgency')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingEscalation) {
      return apiError('Escalation not found', 404);
    }

    // Cannot modify resolved or dismissed escalations via PATCH
    if (
      existingEscalation.status === 'resolved' ||
      existingEscalation.status === 'dismissed'
    ) {
      return apiError(
        'Cannot modify a resolved or dismissed escalation',
        400
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = updateEscalationSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const updateData = validationResult.data;

    // Prevent changing status to resolved/dismissed via PATCH (use specific endpoints)
    if (updateData.status === 'resolved' || updateData.status === 'dismissed') {
      return apiError(
        'Use POST /api/escalations/[id]/resolve or /api/escalations/[id]/dismiss to change status to resolved or dismissed',
        400
      );
    }

    // Recalculate SLA deadline if urgency is changed
    let slaDeadlineAt: string | undefined;
    if (updateData.urgency && updateData.urgency !== existingEscalation.urgency) {
      slaDeadlineAt = calculateSLADeadline(updateData.urgency);
    }

    // Update the escalation
    const { data, error } = await supabase
      .from('escalations')
      .update({
        ...updateData,
        ...(slaDeadlineAt && { sla_deadline_at: slaDeadlineAt }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(
        `*,
        agent:agent_id(id, name, role, status),
        task:task_id(id, title, status),
        resolver:resolved_by(id, email, name)
        `
      )
      .single();

    if (error) {
      console.error('Escalation PATCH error:', error);
      return apiError('Failed to update escalation', 500, error.message);
    }

    return apiSuccess(data);
  } catch (err) {
    console.error('Escalation PATCH exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * DELETE /api/escalations/[id]
 *
 * Delete an escalation. Only open or in_progress escalations can be deleted.
 * Resolved and dismissed escalations are preserved for audit trail.
 *
 * Path Parameters:
 * - id: Escalation UUID (required)
 *
 * Response: { data: { id, deleted: true } }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  try {
    // Check if escalation exists
    const { data: existingEscalation, error: fetchError } = await supabase
      .from('escalations')
      .select('id, status, tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingEscalation) {
      return apiError('Escalation not found', 404);
    }

    // Cannot delete resolved or dismissed escalations (audit trail preservation)
    if (
      existingEscalation.status === 'resolved' ||
      existingEscalation.status === 'dismissed'
    ) {
      return apiError(
        'Cannot delete resolved or dismissed escalations (preserved for audit trail)',
        400
      );
    }

    // Delete the escalation
    const { error } = await supabase
      .from('escalations')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Escalation DELETE error:', error);
      return apiError('Failed to delete escalation', 500, error.message);
    }

    return apiSuccess({
      id,
      deleted: true,
    });
  } catch (err) {
    console.error('Escalation DELETE exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * Calculate SLA deadline based on urgency level
 */
function calculateSLADeadline(urgency: string): string {
  const now = new Date();

  switch (urgency) {
    case 'critical':
      // 1 hour SLA for critical
      now.setHours(now.getHours() + 1);
      break;
    case 'high':
      // 4 hours SLA for high
      now.setHours(now.getHours() + 4);
      break;
    case 'normal':
      // 24 hours SLA for normal
      now.setHours(now.getHours() + 24);
      break;
    case 'low':
      // 72 hours SLA for low
      now.setHours(now.getHours() + 72);
      break;
    default:
      // Default to 24 hours
      now.setHours(now.getHours() + 24);
  }

  return now.toISOString();
}
