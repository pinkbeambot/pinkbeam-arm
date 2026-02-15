/**
 * Webhook Types
 *
 * Type definitions for the ARM outbound webhook system.
 * Tenants register endpoints to receive real-time event notifications.
 */

// ============================================================================
// Webhook Event Types
// ============================================================================

export type WebhookEventType =
  | 'agent.created'
  | 'agent.status_changed'
  | 'agent.terminated'
  | 'task.created'
  | 'task.assigned'
  | 'task.status_changed'
  | 'task.completed'
  | 'task.failed'
  | 'escalation.created'
  | 'escalation.resolved'
  | 'decision.proposed'
  | 'decision.approved'
  | 'decision.rejected'
  | 'system.alert';

export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  'agent.created',
  'agent.status_changed',
  'agent.terminated',
  'task.created',
  'task.assigned',
  'task.status_changed',
  'task.completed',
  'task.failed',
  'escalation.created',
  'escalation.resolved',
  'decision.proposed',
  'decision.approved',
  'decision.rejected',
  'system.alert',
];

// ============================================================================
// Webhook Endpoint
// ============================================================================

export interface WebhookEndpoint {
  id: string;
  tenant_id: string;
  url: string;
  description?: string | null;
  events: WebhookEventType[];
  secret: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  consecutive_failures: number;
  disabled_at?: string | null;
  disabled_reason?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Webhook Delivery
// ============================================================================

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'expired';

export interface WebhookDelivery {
  id: string;
  tenant_id: string;
  endpoint_id: string;
  event_type: WebhookEventType;
  event_id: string;
  payload: WebhookPayload;
  status: WebhookDeliveryStatus;
  response_status?: number | null;
  response_body?: string | null;
  response_time_ms?: number | null;
  attempt_count: number;
  max_attempts: number;
  next_retry_at?: string | null;
  last_attempted_at?: string | null;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

// ============================================================================
// Webhook Payload (sent to tenant endpoints)
// ============================================================================

export interface WebhookPayload {
  id: string;           // Unique event ID for idempotency
  type: WebhookEventType;
  timestamp: string;    // ISO 8601
  tenant_id: string;
  data: Record<string, unknown>;
}

// ============================================================================
// API Types
// ============================================================================

export interface CreateWebhookEndpointRequest {
  url: string;
  description?: string;
  events: WebhookEventType[];
  metadata?: Record<string, unknown>;
}

export interface UpdateWebhookEndpointRequest {
  url?: string;
  description?: string;
  events?: WebhookEventType[];
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface WebhookEndpointListResponse {
  data: Omit<WebhookEndpoint, 'secret'>[];
  total: number;
}

export interface WebhookDeliveryListResponse {
  data: WebhookDelivery[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface WebhookTestResult {
  success: boolean;
  status_code?: number;
  response_time_ms?: number;
  error?: string;
}
