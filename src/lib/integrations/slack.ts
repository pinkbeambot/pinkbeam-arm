/**
 * Slack Integration Service
 * 
 * Handles Slack webhook notifications with:
 * - Webhook URL management and validation
 * - Message formatting for different notification types
 * - Error handling and retry logic
 * - Rate limiting (per-tenant)
 * - Delivery logging
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { rateLimitService } from '@/lib/rate-limit';
import type { SlackWebhook, SlackWebhookInput, SlackMessage, SlackDeliveryResult } from './slack/types';

// Rate limit: 1 message per second per webhook (Slack's recommended rate limit)
const SLACK_RATE_LIMIT_PER_SECOND = 1;
const SLACK_RATE_LIMIT_WINDOW_MS = 1000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [1000, 5000, 15000]; // 1s, 5s, 15s

// Local rate limit cache for Slack (in-memory, per-instance)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

/**
 * Validate a Slack webhook URL format
 */
export function isValidSlackWebhookUrl(url: string): boolean {
  // Slack webhook URLs follow this pattern
  const slackWebhookPattern = /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+$/;
  return slackWebhookPattern.test(url);
}

/**
 * Check rate limit for a webhook
 */
async function checkSlackRateLimit(webhookId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  const key = `slack:${webhookId}`;
  
  const entry = rateLimitCache.get(key);
  
  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitCache.set(key, { count: 1, resetTime: now + SLACK_RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (entry.count >= SLACK_RATE_LIMIT_PER_SECOND) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((entry.resetTime - now) / 1000) 
    };
  }
  
  entry.count++;
  return { allowed: true };
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimitCache(): void {
  const now = Date.now();
  for (const [key, entry] of Array.from(rateLimitCache.entries())) {
    if (now > entry.resetTime) {
      rateLimitCache.delete(key);
    }
  }
}

/**
 * Get or create Slack webhook configuration for a tenant
 */
export async function getSlackWebhook(tenantId: string): Promise<SlackWebhook | null> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('slack_webhooks')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    tenant_id: data.tenant_id,
    webhook_url: data.webhook_url,
    channel: data.channel,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
    last_tested_at: data.last_tested_at,
    last_error_at: data.last_error_at,
    last_error_message: data.last_error_message,
    consecutive_failures: data.consecutive_failures || 0,
  };
}

/**
 * Configure Slack webhook for a tenant
 */
export async function configureSlackWebhook(
  tenantId: string, 
  input: SlackWebhookInput
): Promise<{ success: boolean; webhook?: SlackWebhook; error?: string }> {
  const supabase = createServiceRoleClient();
  
  // Validate webhook URL
  if (!isValidSlackWebhookUrl(input.webhook_url)) {
    return { 
      success: false, 
      error: 'Invalid Slack webhook URL format. Expected: https://hooks.slack.com/services/T.../B.../...' 
    };
  }
  
  try {
    // Test the webhook before saving
    const testResult = await sendTestMessage(input.webhook_url);
    if (!testResult.success) {
      return { 
        success: false, 
        error: `Webhook test failed: ${testResult.error}` 
      };
    }
    
    // Upsert webhook configuration
    const { data, error } = await supabase
      .from('slack_webhooks')
      .upsert({
        tenant_id: tenantId,
        webhook_url: input.webhook_url,
        channel: input.channel,
        is_active: true,
        last_tested_at: new Date().toISOString(),
        consecutive_failures: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id',
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Slack] Error saving webhook:', error);
      return { success: false, error: 'Failed to save webhook configuration' };
    }
    
    const webhook: SlackWebhook = {
      id: data.id,
      tenant_id: data.tenant_id,
      webhook_url: data.webhook_url,
      channel: data.channel,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_tested_at: data.last_tested_at,
      consecutive_failures: 0,
    };
    
    return { success: true, webhook };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Slack] Error configuring webhook:', error);
    return { success: false, error };
  }
}

/**
 * Remove Slack webhook configuration
 */
export async function removeSlackWebhook(tenantId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  
  const { error } = await supabase
    .from('slack_webhooks')
    .delete()
    .eq('tenant_id', tenantId);
  
  if (error) {
    console.error('[Slack] Error removing webhook:', error);
    return { success: false, error: 'Failed to remove webhook configuration' };
  }
  
  return { success: true };
}

/**
 * Send a test message to verify webhook connectivity
 */
export async function sendTestMessage(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  const testMessage: SlackMessage = {
    text: '🔔 Slack integration test successful!',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Pink Beam ARM - Slack Integration',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '✅ Your Slack webhook is configured correctly!\n\nYou will receive notifications for:\n• Escalations\n• Task failures\n• Pending decisions\n• Daily digests',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Test sent at ${new Date().toLocaleString()}_`,
          },
        ],
      },
    ],
  };
  
  return sendRawMessage(webhookUrl, testMessage);
}

/**
 * Send a raw message to a Slack webhook
 */
async function sendRawMessage(
  webhookUrl: string, 
  message: SlackMessage,
  attempt = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    // Slack returns 200 with "ok" body for success
    if (response.ok) {
      const body = await response.text();
      if (body === 'ok') {
        return { success: true };
      }
    }
    
    // Handle specific Slack error codes
    if (response.status === 410) {
      return { success: false, error: 'Webhook disabled (channel archived or user removed)' };
    }
    
    if (response.status === 404) {
      return { success: false, error: 'Webhook not found - check your URL' };
    }
    
    if (response.status === 429) {
      // Rate limited by Slack
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return sendRawMessage(webhookUrl, message, attempt + 1);
      }
      
      return { success: false, error: 'Rate limited by Slack' };
    }
    
    const errorBody = await response.text().catch(() => 'Unknown error');
    return { success: false, error: `HTTP ${response.status}: ${errorBody}` };
    
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    
    // Retry on network errors
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS[attempt - 1] || RETRY_DELAY_MS[RETRY_DELAY_MS.length - 1];
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendRawMessage(webhookUrl, message, attempt + 1);
    }
    
    return { success: false, error };
  }
}

/**
 * Send a notification message to Slack
 */
export async function sendSlackNotification(
  tenantId: string,
  message: SlackMessage,
  options: { skipRateLimit?: boolean } = {}
): Promise<SlackDeliveryResult> {
  const startTime = Date.now();
  
  // Get webhook configuration
  const webhook = await getSlackWebhook(tenantId);
  if (!webhook) {
    return {
      success: false,
      error: 'Slack webhook not configured',
      response_time_ms: Date.now() - startTime,
    };
  }
  
  // Check rate limit (unless skipped)
  if (!options.skipRateLimit) {
    const rateLimit = await checkSlackRateLimit(webhook.id);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Rate limited. Retry after ${rateLimit.retryAfter}s`,
        response_time_ms: Date.now() - startTime,
      };
    }
  }
  
  // Send the message
  const result = await sendRawMessage(webhook.webhook_url, message);
  const responseTimeMs = Date.now() - startTime;
  
  // Update webhook stats
  const supabase = createServiceRoleClient();
  if (result.success) {
    await supabase
      .from('slack_webhooks')
      .update({
        consecutive_failures: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhook.id);
  } else {
    await supabase
      .from('slack_webhooks')
      .update({
        consecutive_failures: webhook.consecutive_failures + 1,
        last_error_at: new Date().toISOString(),
        last_error_message: result.error,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhook.id);
  }
  
  // Log delivery
  await logSlackDelivery(tenantId, webhook.id, result.success, result.error, responseTimeMs);
  
  return {
    success: result.success,
    error: result.error,
    response_time_ms: responseTimeMs,
  };
}

/**
 * Log Slack delivery attempt
 */
async function logSlackDelivery(
  tenantId: string,
  webhookId: string,
  success: boolean,
  errorMessage: string | undefined,
  responseTimeMs: number
): Promise<void> {
  const supabase = createServiceRoleClient();
  
  try {
    await supabase
      .from('slack_delivery_log')
      .insert({
        tenant_id: tenantId,
        webhook_id: webhookId,
        status: success ? 'delivered' : 'failed',
        error_message: errorMessage,
        response_time_ms: responseTimeMs,
      });
  } catch (err) {
    // Don't fail the notification if logging fails
    console.error('[Slack] Error logging delivery:', err);
  }
}

/**
 * Get Slack delivery statistics for a tenant
 */
export async function getSlackStats(tenantId: string): Promise<{
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  average_response_time_ms: number;
  last_delivery_at: string | null;
}> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('slack_delivery_log')
    .select('status, response_time_ms, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error || !data) {
    return {
      total_deliveries: 0,
      successful_deliveries: 0,
      failed_deliveries: 0,
      average_response_time_ms: 0,
      last_delivery_at: null,
    };
  }
  
  const successful = data.filter(d => d.status === 'delivered');
  const failed = data.filter(d => d.status === 'failed');
  const responseTimes = data
    .filter(d => d.response_time_ms !== null)
    .map(d => d.response_time_ms as number);
  
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;
  
  return {
    total_deliveries: data.length,
    successful_deliveries: successful.length,
    failed_deliveries: failed.length,
    average_response_time_ms: avgResponseTime,
    last_delivery_at: data[0]?.created_at || null,
  };
}

// Clean up rate limit cache periodically
setInterval(cleanupRateLimitCache, 60000);
