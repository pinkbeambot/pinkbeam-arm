/**
 * Webhook Handler Edge Function
 * Handles incoming webhooks from external services (GitHub, Stripe, Slack, etc.)
 * 
 * POST /         : Generic webhook handler
 * POST /github   : GitHub webhooks
 * POST /stripe   : Stripe webhooks
 * POST /slack    : Slack events/commands
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';
import {
  createAdminClient,
  generateUUID,
  nowISO,
  createLogger,
  logActivity,
  sendMessage,
  webhookPayloadSchema,
  tenantIdSchema,
  uuidSchema,
  type WebhookPayload,
} from '../_shared/utils.ts';

const logger = createLogger('webhook-handler');

// ============================================================================
// Webhook Request Schema
// ============================================================================

const webhookRequestSchema = z.object({
  tenant_id: tenantIdSchema,
  webhook_type: z.enum(['github.push', 'github.pull_request', 'github.issues', 'stripe.webhook', 'slack.command', 'slack.event', 'custom']),
  event: z.string(),
  data: z.record(z.unknown()),
});

// ============================================================================
// Response Helpers
// ============================================================================

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-GitHub-Event, X-Stripe-Signature, X-Slack-Signature',
    },
  });
}

function errorResponse(code: string, message: string, status = 400, retryable = false): Response {
  return jsonResponse({
    success: false,
    error: { code, message, retryable },
  }, status);
}

function successResponse(data: Record<string, unknown> = {}): Response {
  return jsonResponse({
    success: true,
    data,
  });
}

// ============================================================================
// Signature Verification
// ============================================================================

async function verifyGitHubSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSig = 'sha256=' + Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSig;
}

async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  // Stripe signature verification would be done here
  // For now, return true if both are present
  return !!(signature && secret);
}

async function verifySlackSignature(
  timestamp: string,
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret || !timestamp) return false;
  
  // Slack signatures older than 5 minutes are rejected
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp);
  if (Math.abs(now - requestTime) > 300) return false;
  
  const encoder = new TextEncoder();
  const baseString = `v0:${timestamp}:${body}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString));
  const expectedSig = 'v0=' + Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSig;
}

// ============================================================================
// GitHub Webhook Handler
// ============================================================================

interface GitHubWebhookPayload {
  action?: string;
  ref?: string;
  repository?: {
    full_name: string;
    html_url: string;
  };
  pusher?: {
    name: string;
  };
  pull_request?: {
    number: number;
    title: string;
    html_url: string;
    user: { login: string };
    state: string;
  };
  issue?: {
    number: number;
    title: string;
    html_url: string;
    user: { login: string };
  };
  sender?: {
    login: string;
  };
}

async function handleGitHubWebhook(
  req: Request,
  tenantId: string,
  config: { secret?: string; agent_id?: string }
): Promise<Response> {
  const signature = req.headers.get('X-Hub-Signature-256') || '';
  const event = req.headers.get('X-GitHub-Event') || 'unknown';
  const body = await req.text();

  // Verify signature
  if (config.secret) {
    const valid = await verifyGitHubSignature(body, signature, config.secret);
    if (!valid) {
      logger.error('Invalid GitHub signature', { tenantId, event });
      return errorResponse('INVALID_SIGNATURE', 'GitHub signature verification failed', 401, false);
    }
  }

  const payload = JSON.parse(body) as GitHubWebhookPayload;
  const supabase = createAdminClient();

  // Store webhook event
  const eventId = generateUUID();
  await supabase.from('webhook_events').insert({
    id: eventId,
    tenant_id: tenantId,
    source: 'github',
    event_type: event,
    payload,
    processed_at: nowISO(),
  });

  // Handle specific events
  switch (event) {
    case 'push': {
      const branch = payload.ref?.replace('refs/heads/', '');
      const repo = payload.repository?.full_name;
      const pusher = payload.pusher?.name;

      if (config.agent_id) {
        // Notify agent about the push
        await sendMessage(supabase, tenantId, {
          id: generateUUID(),
          from: {
            id: 'system',
            tenant_id: tenantId,
            parent_id: null,
            root_id: 'system',
            depth: 0,
            role: 'system',
            capabilities: [],
          },
          to: { id: config.agent_id, tenant_id, parent_id: null, root_id: config.agent_id, depth: 0, role: 'worker', capabilities: [] },
          thread_id: generateUUID(),
          type: 'message.direct',
          payload: {
            event: 'github.push',
            repository: repo,
            branch,
            pusher,
            commit_count: payload.ref ? 'unknown' : 0,
          },
          priority: 'normal',
          ttl_seconds: 3600,
          requires_ack: false,
          correlation_id: eventId,
          trace: ['webhook-handler'],
        });
      }

      await logActivity(
        supabase,
        tenantId,
        'system.config_changed',
        'system',
        'system',
        'github-webhook',
        `Push to ${repo}`,
        `${pusher} pushed to ${branch}`,
        {
          event_id: eventId,
          repository: repo,
          branch,
          pusher,
        }
      );
      break;
    }

    case 'pull_request': {
      const pr = payload.pull_request;
      if (!pr) break;

      const actionText = payload.action === 'opened' ? 'opened' : payload.action === 'closed' ? 'closed' : 'updated';

      if (config.agent_id) {
        await sendMessage(supabase, tenantId, {
          id: generateUUID(),
          from: {
            id: 'system',
            tenant_id: tenantId,
            parent_id: null,
            root_id: 'system',
            depth: 0,
            role: 'system',
            capabilities: [],
          },
          to: { id: config.agent_id, tenant_id, parent_id: null, root_id: config.agent_id, depth: 0, role: 'worker', capabilities: [] },
          thread_id: generateUUID(),
          type: 'message.direct',
          payload: {
            event: 'github.pull_request',
            action: payload.action,
            pr_number: pr.number,
            pr_title: pr.title,
            pr_url: pr.html_url,
            author: pr.user.login,
            state: pr.state,
          },
          priority: 'normal',
          ttl_seconds: 3600,
          requires_ack: false,
          correlation_id: eventId,
          trace: ['webhook-handler'],
        });
      }

      await logActivity(
        supabase,
        tenantId,
        'system.config_changed',
        'system',
        'system',
        'github-webhook',
        `PR #${pr.number} ${actionText}`,
        pr.title,
        {
          event_id: eventId,
          pr_number: pr.number,
          pr_title: pr.title,
          action: payload.action,
        }
      );
      break;
    }

    default: {
      logger.info('Unhandled GitHub event', { event, tenantId });
    }
  }

  return successResponse({ event_id: eventId, processed: true });
}

// ============================================================================
// Stripe Webhook Handler
// ============================================================================

async function handleStripeWebhook(
  req: Request,
  tenantId: string,
  config: { secret?: string }
): Promise<Response> {
  const signature = req.headers.get('Stripe-Signature') || '';
  const body = await req.text();

  // Verify signature
  if (config.secret) {
    const valid = await verifyStripeSignature(body, signature, config.secret);
    if (!valid) {
      logger.error('Invalid Stripe signature', { tenantId });
      return errorResponse('INVALID_SIGNATURE', 'Stripe signature verification failed', 401, false);
    }
  }

  const payload = JSON.parse(body);
  const eventType = payload.type;
  const supabase = createAdminClient();

  // Store webhook event
  const eventId = generateUUID();
  await supabase.from('webhook_events').insert({
    id: eventId,
    tenant_id: tenantId,
    source: 'stripe',
    event_type: eventType,
    payload,
    processed_at: nowISO(),
  });

  // Handle specific events
  switch (eventType) {
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      // Update tenant billing status
      await supabase
        .from('tenants')
        .update({
          billing_status: eventType === 'invoice.payment_succeeded' ? 'active' : 'past_due',
          updated_at: nowISO(),
        })
        .eq('id', tenantId);
      break;

    case 'customer.subscription.deleted':
      await supabase
        .from('tenants')
        .update({
          billing_status: 'cancelled',
          updated_at: nowISO(),
        })
        .eq('id', tenantId);
      break;

    default:
      logger.info('Unhandled Stripe event', { eventType, tenantId });
  }

  await logActivity(
    supabase,
    tenantId,
    'system.config_changed',
    'system',
    'system',
    'stripe-webhook',
    `Stripe event: ${eventType}`,
    '',
    { event_id: eventId, event_type: eventType }
  );

  return successResponse({ event_id: eventId, processed: true });
}

// ============================================================================
// Slack Webhook Handler
// ============================================================================

async function handleSlackWebhook(
  req: Request,
  tenantId: string,
  config: { secret?: string; agent_id?: string }
): Promise<Response> {
  const timestamp = req.headers.get('X-Slack-Request-Timestamp') || '';
  const signature = req.headers.get('X-Slack-Signature') || '';
  const body = await req.text();

  // Verify signature
  if (config.secret) {
    const valid = await verifySlackSignature(timestamp, body, signature, config.secret);
    if (!valid) {
      logger.error('Invalid Slack signature', { tenantId });
      return errorResponse('INVALID_SIGNATURE', 'Slack signature verification failed', 401, false);
    }
  }

  const payload = JSON.parse(body);
  const supabase = createAdminClient();

  // Handle URL verification (Slack app setup)
  if (payload.type === 'url_verification') {
    return jsonResponse({ challenge: payload.challenge });
  }

  // Store webhook event
  const eventId = generateUUID();
  await supabase.from('webhook_events').insert({
    id: eventId,
    tenant_id: tenantId,
    source: 'slack',
    event_type: payload.event?.type || 'unknown',
    payload,
    processed_at: nowISO(),
  });

  // Handle slash commands
  if (payload.command) {
    const command = payload.command as string;
    const text = (payload.text as string) || '';
    const userId = payload.user_id as string;
    const channelId = payload.channel_id as string;

    if (config.agent_id) {
      // Send command to agent
      await sendMessage(supabase, tenantId, {
        id: generateUUID(),
        from: {
          id: 'system',
          tenant_id: tenantId,
          parent_id: null,
          root_id: 'system',
          depth: 0,
          role: 'system',
          capabilities: [],
        },
        to: { id: config.agent_id, tenant_id, parent_id: null, root_id: config.agent_id, depth: 0, role: 'worker', capabilities: [] },
        thread_id: generateUUID(),
        type: 'message.direct',
        payload: {
          event: 'slack.command',
          command,
          text,
          user_id: userId,
          channel_id: channelId,
          response_url: payload.response_url,
        },
        priority: 'normal',
        ttl_seconds: 300,
        requires_ack: true,
        correlation_id: eventId,
        trace: ['webhook-handler'],
      });
    }

    await logActivity(
      supabase,
      tenantId,
      'message.received',
      'message',
      'user',
      userId,
      `Slack command: ${command}`,
      text,
      {
        event_id: eventId,
        command,
        channel_id: channelId,
      }
    );

    // Return immediate response to Slack
    return jsonResponse({
      response_type: 'ephemeral',
      text: 'Processing your request...',
    });
  }

  // Handle event callbacks
  if (payload.event) {
    const event = payload.event;
    
    if (event.type === 'app_mention' && config.agent_id) {
      await sendMessage(supabase, tenantId, {
        id: generateUUID(),
        from: {
          id: 'system',
          tenant_id: tenantId,
          parent_id: null,
          root_id: 'system',
          depth: 0,
          role: 'system',
          capabilities: [],
        },
        to: { id: config.agent_id, tenant_id, parent_id: null, root_id: config.agent_id, depth: 0, role: 'worker', capabilities: [] },
        thread_id: generateUUID(),
        type: 'message.direct',
        payload: {
          event: 'slack.mention',
          text: event.text,
          user_id: event.user,
          channel_id: event.channel,
          ts: event.ts,
        },
        priority: 'normal',
        ttl_seconds: 300,
        requires_ack: true,
        correlation_id: eventId,
        trace: ['webhook-handler'],
      });
    }
  }

  return successResponse({ event_id: eventId, processed: true });
}

// ============================================================================
// Custom Webhook Handler
// ============================================================================

async function handleCustomWebhook(
  req: Request,
  tenantId: string,
  config: { agent_id?: string; forward_to_agent?: boolean }
): Promise<Response> {
  const body = await req.json();
  const supabase = createAdminClient();

  // Store webhook event
  const eventId = generateUUID();
  await supabase.from('webhook_events').insert({
    id: eventId,
    tenant_id: tenantId,
    source: 'custom',
    event_type: body.event || 'unknown',
    payload: body,
    processed_at: nowISO(),
  });

  // Forward to agent if configured
  if (config.forward_to_agent && config.agent_id) {
    await sendMessage(supabase, tenantId, {
      id: generateUUID(),
      from: {
        id: 'system',
        tenant_id: tenantId,
        parent_id: null,
        root_id: 'system',
        depth: 0,
        role: 'system',
        capabilities: [],
      },
      to: { id: config.agent_id, tenant_id, parent_id: null, root_id: config.agent_id, depth: 0, role: 'worker', capabilities: [] },
      thread_id: generateUUID(),
      type: 'message.direct',
      payload: {
        event: 'webhook.custom',
        data: body,
      },
      priority: 'normal',
      ttl_seconds: 3600,
      requires_ack: false,
      correlation_id: eventId,
      trace: ['webhook-handler'],
    });
  }

  await logActivity(
    supabase,
    tenantId,
    'message.received',
    'message',
    'system',
    'custom-webhook',
    'Custom webhook received',
    body.event || 'unknown event',
    { event_id: eventId, event_type: body.event }
  );

  return successResponse({ event_id: eventId, processed: true });
}

// ============================================================================
// Get Tenant Config
// ============================================================================

async function getTenantWebhookConfig(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  webhookType: string
): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('tenant_webhook_configs')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('webhook_type', webhookType)
    .single();

  return (data?.config as Record<string, unknown>) || {};
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-GitHub-Event, X-GitHub-Delivery, X-Hub-Signature-256, Stripe-Signature, X-Slack-Signature, X-Slack-Request-Timestamp',
      },
    });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/webhook-handler\/?/, '').split('/').filter(Boolean);
  const mainPath = pathParts[0] || 'generic';

  logger.debug('Webhook received', { method: req.method, path: mainPath });

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, false);
  }

  try {
    const supabase = createAdminClient();

    // Extract tenant ID from various sources
    let tenantId: string | null = null;
    
    // Try query parameter first
    tenantId = url.searchParams.get('tenant_id');
    
    // Try header
    if (!tenantId) {
      tenantId = req.headers.get('X-Tenant-ID');
    }

    // For specific webhook types, validate and extract tenant from signature/config
    if (!tenantId && mainPath === 'github') {
      // GitHub webhooks typically include the tenant in the URL path or payload
      const body = await req.clone().text();
      const payload = JSON.parse(body);
      tenantId = payload?.repository?.owner?.id || url.searchParams.get('tenant_id');
    }

    if (!tenantId) {
      return errorResponse('TENANT_REQUIRED', 'Tenant ID is required', 400, false);
    }

    // Validate tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, status')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return errorResponse('TENANT_NOT_FOUND', 'Tenant not found', 404, false);
    }

    if (tenant.status !== 'active') {
      return errorResponse('TENANT_SUSPENDED', 'Tenant is not active', 403, false);
    }

    // Route to appropriate handler
    switch (mainPath) {
      case 'github': {
        const config = await getTenantWebhookConfig(supabase, tenantId, 'github');
        return await handleGitHubWebhook(req, tenantId, config);
      }

      case 'stripe': {
        const config = await getTenantWebhookConfig(supabase, tenantId, 'stripe');
        return await handleStripeWebhook(req, tenantId, config);
      }

      case 'slack': {
        const config = await getTenantWebhookConfig(supabase, tenantId, 'slack');
        return await handleSlackWebhook(req, tenantId, config);
      }

      case 'generic':
      default: {
        const config = await getTenantWebhookConfig(supabase, tenantId, 'custom');
        return await handleCustomWebhook(req, tenantId, config);
      }
    }
  } catch (err) {
    logger.error('Webhook handling error', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500, true);
  }
}

// Deno serve
Deno.serve(handler);
