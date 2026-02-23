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
  // Agent events
  | 'agent.created'
  | 'agent.updated'
  | 'agent.deleted'
  | 'agent.status_changed'
  | 'agent.terminated'
  // Task events
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'task.assigned'
  | 'task.status_changed'
  | 'task.failed'
  // Decision events
  | 'decision.proposed'
  | 'decision.approved'
  | 'decision.rejected'
  // Escalation events
  | 'escalation.created'
  | 'escalation.resolved'
  // System events
  | 'system.alert'
  | 'system.error'
  | 'system.config_changed';

// Event filter patterns (wildcards)
export type WebhookEventFilter = 
  | WebhookEventType
  | '*'                          // All events
  | 'agent.*'                    // All agent events
  | 'task.*'                     // All task events
  | 'decision.*'                 // All decision events
  | 'escalation.*'               // All escalation events
  | 'system.*';                  // All system events

export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  // Agent events
  'agent.created',
  'agent.updated',
  'agent.deleted',
  'agent.status_changed',
  'agent.terminated',
  // Task events
  'task.created',
  'task.updated',
  'task.completed',
  'task.assigned',
  'task.status_changed',
  'task.failed',
  // Decision events
  'decision.proposed',
  'decision.approved',
  'decision.rejected',
  // Escalation events
  'escalation.created',
  'escalation.resolved',
  // System events
  'system.alert',
  'system.error',
  'system.config_changed',
];

// All valid event filter patterns including wildcards
export const WEBHOOK_EVENT_FILTERS = [
  ...WEBHOOK_EVENT_TYPES,
  '*',
  'agent.*',
  'task.*',
  'decision.*',
  'escalation.*',
  'system.*',
] as const;

// ============================================================================
// Webhook Endpoint
// ============================================================================

export interface WebhookEndpoint {
  id: string;
  tenant_id: string;
  url: string;
  description?: string | null;
  events: WebhookEventFilter[];
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
  events: WebhookEventFilter[];
  metadata?: Record<string, unknown>;
}

export interface UpdateWebhookEndpointRequest {
  url?: string;
  description?: string;
  events?: WebhookEventFilter[];
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
