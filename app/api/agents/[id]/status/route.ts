import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { z } from 'zod';

// Valid agent statuses
const AgentStatusEnum = z.enum([
  'initializing',
  'idle',
  'active',
  'paused',
  'blocked',
  'error',
  'escaped',
  'terminated',
]);

// Status update schema
const updateStatusSchema = z.object({
  status: AgentStatusEnum,
  reason: z.string().max(500).optional(),
});

// Valid status transitions
// Key: current status, Value: array of allowed next statuses
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  initializing: ['idle', 'active', 'error', 'terminated'],
  idle: ['active', 'paused', 'blocked', 'error', 'terminated'],
  active: ['idle', 'paused', 'blocked', 'error', 'terminated'],
  paused: ['idle', 'active', 'blocked', 'error', 'terminated'],
  blocked: ['idle', 'active', 'paused', 'error', 'terminated'],
  error: ['idle', 'active', 'paused', 'blocked', 'terminated'],
  escaped: ['blocked', 'terminated'], // Escaped agents need intervention
  terminated: [], // Terminal state - no transitions allowed
};

/**
 * POST /api/agents/[id]/status
 *
 * Update agent status with validation.
 * Validates status transitions and logs changes to activity feed.
 * Notifies parent agent if agent is blocked or in error state.
 *
 * Path Parameters:
 * - id: Agent UUID (required)
 *
 * Body Parameters:
 * - status: New agent status (required)
 * - reason: Reason for status change (optional, max 500 chars)
 *
 * Response: { data: Agent }
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
    const body = await request.json();

    // Validate request body
    const validationResult = updateStatusSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { status: newStatus, reason } = validationResult.data;

    // Fetch current agent
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select('id, name, status, tenant_id, parent_id, role, activated_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !agent) {
      return apiError('Agent not found', 404);
    }

    const currentStatus = agent.status;

    // Validate status transition
    if (currentStatus === newStatus) {
      return apiError(
        `Agent is already in '${currentStatus}' status`,
        400
      );
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return apiError(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
        400,
        {
          currentStatus,
          requestedStatus: newStatus,
          allowedTransitions,
        }
      );
    }

    // Special handling for certain transitions
    const additionalUpdates: Record<string, unknown> = {};

    // If transitioning to active/idle for the first time, set activated_at
    if ((newStatus === 'active' || newStatus === 'idle') && !agent.activated_at) {
      additionalUpdates.activated_at = new Date().toISOString();
    }

    // If transitioning to terminated, also set terminated_at and deleted_at
    if (newStatus === 'terminated') {
      additionalUpdates.terminated_at = new Date().toISOString();
      additionalUpdates.deleted_at = new Date().toISOString();
      additionalUpdates.current_task_id = null;
      additionalUpdates.session_id = null;
    }

    // Update agent status
    const now = new Date().toISOString();
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        status: newStatus,
        status_reason: reason,
        updated_at: now,
        ...additionalUpdates,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      console.error('Agent status update error:', updateError);
      return apiError('Failed to update agent status', 500, updateError.message);
    }

    // Create activity log entry
    await supabase.from('activities').insert({
      tenant_id: tenantId,
      type: 'agent.status_changed',
      category: 'agent',
      actor_type: 'user',
      actor_id: userId,
      target_type: 'agents',
      target_id: id,
      title: 'Agent status changed',
      description: `Agent "${agent.name}" changed from ${currentStatus} to ${newStatus}`,
      agent_id: id,
      metadata: {
        previous_status: currentStatus,
        new_status: newStatus,
        reason,
      },
    });

    // Notify parent agent if agent is blocked or in error state
    if ((newStatus === 'blocked' || newStatus === 'error') && agent.parent_id) {
      try {
        // Create a message to the parent agent
        await supabase.from('messages').insert({
          tenant_id: tenantId,
          protocol_version: '1.0',
          message_type: 'system.error',
          from_agent_id: id,
          to_agent_id: agent.parent_id,
          payload: {
            event: 'child_agent_status_alert',
            child_agent_id: id,
            child_agent_name: agent.name,
            new_status: newStatus,
            previous_status: currentStatus,
            reason: reason || 'No reason provided',
          },
          priority: newStatus === 'error' ? 'urgent' : 'high',
          requires_ack: true,
        });
      } catch (msgError) {
        // Log but don't fail the request if notification fails
        console.error('Failed to notify parent agent:', msgError);
      }
    }

    // If agent escaped, create an escalation
    if (newStatus === 'escaped') {
      try {
        await supabase.from('escalations').insert({
          tenant_id: tenantId,
          agent_id: id,
          type: 'policy_violation',
          urgency: 'critical',
          status: 'open',
          title: `Agent "${agent.name}" has escaped`,
          description: `Agent "${agent.name}" (ID: ${id}) has transitioned to escaped status. Immediate intervention required.`,
          situation_context: {
            agent_role: agent.role,
            previous_status: currentStatus,
            reason: reason || 'No reason provided',
          },
          agent_analysis: {
            what_i_know: 'Agent has transitioned to escaped status',
            what_i_dont_know: 'Reason for escape or current behavior',
            what_i_tried: ['Automatic status change detected'],
          },
        });
      } catch (escError) {
        // Log but don't fail the request
        console.error('Failed to create escalation for escaped agent:', escError);
      }
    }

    return apiSuccess(updatedAgent);
  } catch (err) {
    console.error('Agent status POST exception:', err);
    return apiError('Internal server error', 500);
  }
}
