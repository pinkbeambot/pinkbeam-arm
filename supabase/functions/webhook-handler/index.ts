/**
 * Webhook Handler Edge Function
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createAdminClient, generateUUID, nowISO, createLogger, logActivity } from '../_shared/utils.ts';

const logger = createLogger('webhook-handler');

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}

function errorResponse(code: string, message: string, status = 400, retryable = false): Response {
  return jsonResponse({ success: false, error: { code, message, retryable } }, status);
}

async function handleGitHubWebhook(req: Request, tenantId: string): Promise<Response> {
  const event = req.headers.get('X-GitHub-Event') || 'unknown';
  const body = await req.json();
  const supabase = createAdminClient();
  const eventId = generateUUID();

  await supabase.from('webhook_events').insert({
    id: eventId, tenant_id: tenantId, source: 'github', event_type: event, payload: body, processed_at: nowISO()
  });

  await logActivity(supabase, tenantId, 'system.config_changed', 'system', 'system', 'github-webhook',
    `GitHub event: ${event}`, '', { event_id: eventId });

  return jsonResponse({ success: true, data: { event_id: eventId, processed: true } });
}

async function handleStripeWebhook(req: Request, tenantId: string): Promise<Response> {
  const body = await req.json();
  const eventType = body.type;
  const supabase = createAdminClient();
  const eventId = generateUUID();

  await supabase.from('webhook_events').insert({
    id: eventId, tenant_id: tenantId, source: 'stripe', event_type: eventType, payload: body, processed_at: nowISO()
  });

  if (eventType === 'invoice.payment_succeeded' || eventType === 'invoice.payment_failed') {
    await supabase.from('tenants').update({
      billing_status: eventType === 'invoice.payment_succeeded' ? 'active' : 'past_due', updated_at: nowISO()
    }).eq('id', tenantId);
  }

  return jsonResponse({ success: true, data: { event_id: eventId, processed: true } });
}

async function handleSlackWebhook(req: Request, tenantId: string): Promise<Response> {
  const body = await req.text();
  const payload = JSON.parse(body);
  const supabase = createAdminClient();

  if (payload.type === 'url_verification') {
    return jsonResponse({ challenge: payload.challenge });
  }

  const eventId = generateUUID();
  await supabase.from('webhook_events').insert({
    id: eventId, tenant_id: tenantId, source: 'slack', event_type: payload.event?.type || 'command', payload, processed_at: nowISO()
  });

  if (payload.command) {
    return jsonResponse({ response_type: 'ephemeral', text: 'Processing...' });
  }

  return jsonResponse({ success: true, data: { event_id: eventId, processed: true } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/webhook-handler\/?/, '') || 'generic';

  if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'POST only', 405, false);

  const tenantId = url.searchParams.get('tenant_id');
  if (!tenantId) return errorResponse('TENANT_REQUIRED', 'tenant_id required', 400, false);

  try {
    switch (path) {
      case 'github': return await handleGitHubWebhook(req, tenantId);
      case 'stripe': return await handleStripeWebhook(req, tenantId);
      case 'slack': return await handleSlackWebhook(req, tenantId);
      default: return jsonResponse({ success: true, data: { message: 'Webhook received' } });
    }
  } catch (err) {
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown', 500, true);
  }
}

Deno.serve(handler);
