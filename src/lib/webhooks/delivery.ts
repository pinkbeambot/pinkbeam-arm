/**
 * Webhook Delivery Service
 *
 * Handles outbound webhook delivery with:
 * - HMAC-SHA256 signed payloads
 * - 3 retries with exponential backoff (10s, 60s, 300s)
 * - Delivery logging to webhook_deliveries table
 * - Auto-disable endpoints after 10 consecutive failures
 * - 10-second timeout per request
 */

import { randomUUID } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { generateHeaders } from './signature';
import { shouldDeliverEvent } from './filtering';
import type { WebhookEventType, WebhookPayload } from '@/types/webhook';

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONSECUTIVE_FAILURES = 10;
const RETRY_DELAYS_MS = [10_000, 60_000, 300_000]; // 10s, 1m, 5m
const MAX_RESPONSE_BODY_LENGTH = 1024;

interface DeliverResult {
  delivered: number;
  failed: number;
  errors: string[];
}

/**
 * Dispatch a webhook event to all active endpoints subscribed to the event type.
 */
export async function dispatchWebhookEvent(
  tenantId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<DeliverResult> {
  const supabase = createServiceRoleClient();

  // Find active endpoints subscribed to this event
  const { data: endpoints, error } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret, events')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('disabled_at', null);

  if (error || !endpoints?.length) {
    return { delivered: 0, failed: 0, errors: error ? [error.message] : [] };
  }

  const matchingEndpoints = endpoints.filter((ep) => {
    const events = ep.events as string[];
    return shouldDeliverEvent(eventType, events);
  });

  if (matchingEndpoints.length === 0) {
    return { delivered: 0, failed: 0, errors: [] };
  }

  const result: DeliverResult = { delivered: 0, failed: 0, errors: [] };

  await Promise.all(
    matchingEndpoints.map(async (endpoint) => {
      const eventId = randomUUID();
      const payload: WebhookPayload = {
        id: eventId,
        type: eventType,
        timestamp: new Date().toISOString(),
        tenant_id: tenantId,
        data,
      };

      const delivery = await deliverToEndpoint(tenantId, endpoint.id, endpoint.url, endpoint.secret, eventId, eventType, payload);

      if (delivery.success) {
        result.delivered++;
      } else {
        result.failed++;
        if (delivery.error) {
          result.errors.push(`${endpoint.url}: ${delivery.error}`);
        }
      }
    })
  );

  return result;
}

/**
 * Deliver a webhook to a single endpoint (first attempt only; retries are scheduled).
 */
async function deliverToEndpoint(
  tenantId: string,
  endpointId: string,
  url: string,
  secret: string,
  eventId: string,
  eventType: WebhookEventType,
  payload: WebhookPayload
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  const body = JSON.stringify(payload);
  const headers = generateHeaders(eventId, body, secret);

  // Create delivery record
  const { data: delivery, error: insertError } = await supabase
    .from('webhook_deliveries')
    .insert({
      tenant_id: tenantId,
      endpoint_id: endpointId,
      event_type: eventType,
      event_id: eventId,
      payload,
      status: 'pending',
      attempt_count: 0,
      max_attempts: MAX_ATTEMPTS,
    })
    .select('id')
    .single();

  if (insertError || !delivery) {
    return { success: false, error: insertError?.message || 'Failed to create delivery record' };
  }

  return attemptDelivery(delivery.id, endpointId, url, body, headers, 1);
}

/**
 * Attempt a single delivery. On failure, schedule a retry or mark as failed.
 */
async function attemptDelivery(
  deliveryId: string,
  endpointId: string,
  url: string,
  body: string,
  headers: Record<string, string>,
  attempt: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseTimeMs = Date.now() - startTime;
    let responseBody: string | null = null;
    try {
      const text = await response.text();
      responseBody = text.slice(0, MAX_RESPONSE_BODY_LENGTH);
    } catch {
      // Response body is optional
    }

    if (response.ok) {
      // Success
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'success',
          response_status: response.status,
          response_body: responseBody,
          response_time_ms: responseTimeMs,
          attempt_count: attempt,
          last_attempted_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      // Reset consecutive failures on success
      await supabase
        .from('webhook_endpoints')
        .update({ consecutive_failures: 0 })
        .eq('id', endpointId);

      return { success: true };
    }

    // Non-2xx response
    const errorMsg = `HTTP ${response.status}`;
    return handleFailure(deliveryId, endpointId, attempt, errorMsg, response.status, responseBody, responseTimeMs);
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return handleFailure(deliveryId, endpointId, attempt, errorMsg, null, null, responseTimeMs);
  }
}

async function handleFailure(
  deliveryId: string,
  endpointId: string,
  attempt: number,
  errorMessage: string,
  responseStatus: number | null,
  responseBody: string | null,
  responseTimeMs: number
): Promise<{ success: boolean; error: string }> {
  const supabase = createServiceRoleClient();

  if (attempt < MAX_ATTEMPTS) {
    // Schedule retry with exponential backoff
    const delayMs = RETRY_DELAYS_MS[attempt - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'failed',
        response_status: responseStatus,
        response_body: responseBody,
        response_time_ms: responseTimeMs,
        attempt_count: attempt,
        last_attempted_at: new Date().toISOString(),
        next_retry_at: nextRetryAt,
        error_message: errorMessage,
      })
      .eq('id', deliveryId);
  } else {
    // Max attempts reached
    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'failed',
        response_status: responseStatus,
        response_body: responseBody,
        response_time_ms: responseTimeMs,
        attempt_count: attempt,
        last_attempted_at: new Date().toISOString(),
        next_retry_at: null,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);
  }

  // Increment consecutive failures and potentially disable endpoint
  const { data: endpoint } = await supabase
    .from('webhook_endpoints')
    .select('consecutive_failures')
    .eq('id', endpointId)
    .single();

  const newFailures = (endpoint?.consecutive_failures || 0) + 1;

  if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
    await supabase
      .from('webhook_endpoints')
      .update({
        consecutive_failures: newFailures,
        is_active: false,
        disabled_at: new Date().toISOString(),
        disabled_reason: `Auto-disabled after ${newFailures} consecutive failures`,
      })
      .eq('id', endpointId);
  } else {
    await supabase
      .from('webhook_endpoints')
      .update({ consecutive_failures: newFailures })
      .eq('id', endpointId);
  }

  return { success: false, error: errorMessage };
}

/**
 * Process pending retries. Called by a cron job.
 */
export async function processWebhookRetries(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const supabase = createServiceRoleClient();

  const { data: pendingRetries } = await supabase
    .from('webhook_deliveries')
    .select('id, endpoint_id, payload, event_type, attempt_count, max_attempts')
    .eq('status', 'failed')
    .not('next_retry_at', 'is', null)
    .lte('next_retry_at', new Date().toISOString())
    .limit(50);

  if (!pendingRetries?.length) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const delivery of pendingRetries) {
    // Get endpoint details
    const { data: endpoint } = await supabase
      .from('webhook_endpoints')
      .select('url, secret, is_active')
      .eq('id', delivery.endpoint_id)
      .single();

    if (!endpoint || !endpoint.is_active) {
      // Endpoint deleted or disabled, expire the delivery
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'expired',
          next_retry_at: null,
          completed_at: new Date().toISOString(),
          error_message: 'Endpoint no longer active',
        })
        .eq('id', delivery.id);
      failed++;
      continue;
    }

    const body = JSON.stringify(delivery.payload);
    const eventId = (delivery.payload as { id?: string })?.id || delivery.id;
    const headers = generateHeaders(eventId, body, endpoint.secret);

    const result = await attemptDelivery(
      delivery.id,
      delivery.endpoint_id,
      endpoint.url,
      body,
      headers,
      delivery.attempt_count + 1
    );

    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return { processed: pendingRetries.length, succeeded, failed };
}

/**
 * Send a test webhook to verify endpoint connectivity.
 */
export async function sendTestWebhook(
  endpointId: string,
  tenantId: string
): Promise<{ success: boolean; status_code?: number; response_time_ms?: number; error?: string }> {
  const supabase = createServiceRoleClient();

  const { data: endpoint } = await supabase
    .from('webhook_endpoints')
    .select('url, secret')
    .eq('id', endpointId)
    .eq('tenant_id', tenantId)
    .single();

  if (!endpoint) {
    return { success: false, error: 'Endpoint not found' };
  }

  const eventId = `test_${randomUUID()}`;
  const payload: WebhookPayload = {
    id: eventId,
    type: 'system.alert',
    timestamp: new Date().toISOString(),
    tenant_id: tenantId,
    data: {
      test: true,
      message: 'This is a test webhook from Pink Beam ARM.',
    },
  };

  const body = JSON.stringify(payload);
  const headers = generateHeaders(eventId, body, endpoint.secret);
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTimeMs = Date.now() - startTime;

    return {
      success: response.ok,
      status_code: response.status,
      response_time_ms: responseTimeMs,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    return {
      success: false,
      response_time_ms: responseTimeMs,
      error: err instanceof Error ? err.message : 'Request failed',
    };
  }
}
