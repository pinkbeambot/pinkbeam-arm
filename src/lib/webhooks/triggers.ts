/**
 * Webhook Event Triggers
 *
 * This module integrates with database triggers to dispatch webhook events
 * when entities change in the system.
 *
 * Used by:
 * - Database triggers (via Supabase Edge Functions)
 * - API routes that mutate data
 * - Background jobs
 */

import { dispatchWebhookEvent } from './delivery';
import type { WebhookEventType } from '@/types/webhook';
import type { Database } from '@/lib/database';

type Agent = Database['public']['Tables']['agents']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type Decision = Database['public']['Tables']['decisions']['Row'];
type Escalation = Database['public']['Tables']['escalations']['Row'];

// ============================================================================
// Agent Events
// ============================================================================

export async function triggerAgentCreated(tenantId: string, agent: Agent) {
  return dispatchWebhookEvent(tenantId, 'agent.created', {
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    role: agent.role,
    status: agent.status,
    parent_id: agent.parent_id,
    capabilities: agent.capabilities,
    created_at: agent.created_at,
  });
}

export async function triggerAgentUpdated(tenantId: string, agent: Agent, changes: Partial<Agent>) {
  return dispatchWebhookEvent(tenantId, 'agent.updated', {
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    role: agent.role,
    status: agent.status,
    parent_id: agent.parent_id,
    capabilities: agent.capabilities,
    changes,
    updated_at: agent.updated_at,
  });
}

export async function triggerAgentDeleted(tenantId: string, agentId: string, agentName: string) {
  return dispatchWebhookEvent(tenantId, 'agent.deleted', {
    id: agentId,
    name: agentName,
    deleted_at: new Date().toISOString(),
  });
}

export async function triggerAgentStatusChanged(
  tenantId: string,
  agent: Agent,
  previousStatus: string
) {
  return dispatchWebhookEvent(tenantId, 'agent.status_changed', {
    id: agent.id,
    name: agent.name,
    previous_status: previousStatus,
    current_status: agent.status,
    status_reason: agent.status_reason,
    changed_at: agent.updated_at,
  });
}

export async function triggerAgentTerminated(tenantId: string, agent: Agent) {
  return dispatchWebhookEvent(tenantId, 'agent.terminated', {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    stats: agent.stats,
    terminated_at: agent.terminated_at,
  });
}

// ============================================================================
// Task Events
// ============================================================================

export async function triggerTaskCreated(tenantId: string, task: Task) {
  return dispatchWebhookEvent(tenantId, 'task.created', {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    status: task.status,
    priority: task.priority,
    assignee_id: task.assignee_id,
    assigner_id: task.assigner_id,
    parent_task_id: task.parent_task_id,
    deadline_at: task.deadline_at,
    created_at: task.created_at,
  });
}

export async function triggerTaskUpdated(tenantId: string, task: Task, changes: Partial<Task>) {
  return dispatchWebhookEvent(tenantId, 'task.updated', {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignee_id: task.assignee_id,
    progress_percent: task.progress_percent,
    current_step: task.current_step,
    changes,
    updated_at: task.updated_at,
  });
}

export async function triggerTaskCompleted(tenantId: string, task: Task) {
  return dispatchWebhookEvent(tenantId, 'task.completed', {
    id: task.id,
    title: task.title,
    type: task.type,
    assignee_id: task.assignee_id,
    outputs: task.outputs,
    cost_usd: task.cost_usd,
    tokens_used: task.tokens_used,
    started_at: task.started_at,
    completed_at: task.completed_at,
  });
}

export async function triggerTaskAssigned(tenantId: string, task: Task, previousAssigneeId?: string | null) {
  return dispatchWebhookEvent(tenantId, 'task.assigned', {
    id: task.id,
    title: task.title,
    previous_assignee_id: previousAssigneeId,
    new_assignee_id: task.assignee_id,
    assigned_at: task.updated_at,
  });
}

export async function triggerTaskStatusChanged(
  tenantId: string,
  task: Task,
  previousStatus: string
) {
  return dispatchWebhookEvent(tenantId, 'task.status_changed', {
    id: task.id,
    title: task.title,
    previous_status: previousStatus,
    current_status: task.status,
    changed_at: task.updated_at,
  });
}

export async function triggerTaskFailed(tenantId: string, task: Task, error?: string) {
  return dispatchWebhookEvent(tenantId, 'task.failed', {
    id: task.id,
    title: task.title,
    type: task.type,
    assignee_id: task.assignee_id,
    error,
    cost_usd: task.cost_usd,
    tokens_used: task.tokens_used,
    failed_at: task.updated_at,
  });
}

// ============================================================================
// Decision Events
// ============================================================================

export async function triggerDecisionProposed(tenantId: string, decision: Decision) {
  return dispatchWebhookEvent(tenantId, 'decision.proposed', {
    id: decision.id,
    agent_id: decision.agent_id,
    task_id: decision.task_id,
    category: decision.category,
    title: decision.title,
    description: decision.description,
    proposed_action: decision.proposed_action,
    reasoning: decision.reasoning,
    self_authorized: decision.self_authorized,
    proposed_at: decision.proposed_at,
  });
}

export async function triggerDecisionApproved(tenantId: string, decision: Decision) {
  return dispatchWebhookEvent(tenantId, 'decision.approved', {
    id: decision.id,
    agent_id: decision.agent_id,
    task_id: decision.task_id,
    title: decision.title,
    category: decision.category,
    executed_action: decision.executed_action,
    decided_at: decision.decided_at,
  });
}

export async function triggerDecisionRejected(tenantId: string, decision: Decision) {
  return dispatchWebhookEvent(tenantId, 'decision.rejected', {
    id: decision.id,
    agent_id: decision.agent_id,
    task_id: decision.task_id,
    title: decision.title,
    category: decision.category,
    proposed_action: decision.proposed_action,
    decided_at: decision.decided_at,
  });
}

// ============================================================================
// Escalation Events
// ============================================================================

export async function triggerEscalationCreated(tenantId: string, escalation: Escalation) {
  return dispatchWebhookEvent(tenantId, 'escalation.created', {
    id: escalation.id,
    agent_id: escalation.agent_id,
    task_id: escalation.task_id,
    type: escalation.type,
    urgency: escalation.urgency,
    title: escalation.title,
    description: escalation.description,
    situation_context: escalation.situation_context,
    question: escalation.question,
    sla_deadline_at: escalation.sla_deadline_at,
    created_at: escalation.created_at,
  });
}

export async function triggerEscalationResolved(tenantId: string, escalation: Escalation) {
  return dispatchWebhookEvent(tenantId, 'escalation.resolved', {
    id: escalation.id,
    agent_id: escalation.agent_id,
    task_id: escalation.task_id,
    type: escalation.type,
    title: escalation.title,
    resolved_by: escalation.resolved_by,
    resolution_type: escalation.resolution_type,
    resolution_answer: escalation.resolution_answer,
    time_to_resolve_seconds: escalation.time_to_resolve_seconds,
    resolved_at: escalation.resolved_at,
  });
}

// ============================================================================
// System Events
// ============================================================================

export async function triggerSystemAlert(
  tenantId: string,
  alert: {
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    details?: Record<string, unknown>;
  }
) {
  return dispatchWebhookEvent(tenantId, 'system.alert', {
    level: alert.level,
    message: alert.message,
    details: alert.details,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// Generic Event Trigger (for Edge Functions or manual dispatch)
// ============================================================================

export async function triggerWebhookEvent(
  tenantId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
) {
  return dispatchWebhookEvent(tenantId, eventType, data);
}
