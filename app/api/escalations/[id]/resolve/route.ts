import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveEscalationSchema } from '@/lib/validation';

/**
 * POST /api/escalations/[id]/resolve
 *
 * Mark an escalation as resolved with resolution details.
 * This endpoint transitions the escalation from open/in_progress to resolved.
 *
 * Path Parameters:
 * - id: Escalation UUID (required)
 *
 * Body Parameters:
 * - resolution_type: Type of resolution (optional)
 * - resolution_answer: The answer/resolution text (required, min 1 char)
 * - resolution_resources: JSON object with related resources/links (optional)
 * - learning_notes: Notes for future learning (optional)
 *
 * Response: { data: Escalation }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;
  const { id } = await params;

  try {
    // First, check if escalation exists and is resolvable
    const { data: existingEscalation, error: fetchError } = await supabase
      .from('escalations')
      .select('id, status, tenant_id, created_at, sla_deadline_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingEscalation) {
      return apiError('Escalation not found', 404);
    }

    // Cannot resolve already resolved or dismissed escalations
    if (existingEscalation.status === 'resolved') {
      return apiError('Escalation is already resolved', 400);
    }

    if (existingEscalation.status === 'dismissed') {
      return apiError('Cannot resolve a dismissed escalation', 400);
    }

    const body = await request.json();

    // Validate request body
    const validationResult = resolveEscalationSchema.safeParse({
      ...body,
      status: 'resolved',
    });

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { resolution_type, resolution_answer, resolution_resources, learning_notes } =
      validationResult.data;

    // Calculate time to resolve
    const now = new Date();
    const createdAt = new Date(existingEscalation.created_at);
    const timeToResolveSeconds = Math.floor(
      (now.getTime() - createdAt.getTime()) / 1000
    );

    // Update the escalation as resolved
    const { data, error } = await supabase
      .from('escalations')
      .update({
        status: 'resolved',
        resolved_by: userId,
        resolved_at: now.toISOString(),
        resolution_type,
        resolution_answer,
        resolution_resources,
        learning_notes,
        time_to_resolve_seconds: timeToResolveSeconds,
        updated_at: now.toISOString(),
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
      console.error('Escalation resolve error:', error);
      return apiError('Failed to resolve escalation', 500, error.message);
    }

    return apiSuccess(data);
  } catch (err) {
    console.error('Escalation resolve exception:', err);
    return apiError('Internal server error', 500);
  }
}
