/**
 * Enhanced Stripe Webhook Handler
 * 
 * Production-hardened webhook processing with:
 * - Idempotency key handling via Stripe event IDs
 * - Exponential backoff retry logic
 * - Graceful error handling with event queuing
 * - Comprehensive audit logging
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

// ============================================================================
// Types
// ============================================================================

export interface WebhookEventRecord {
  id: string;
  stripeEventId: string;
  eventType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  attempts: number;
  payload: Record<string, unknown>;
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  processed: boolean;
  error?: string;
  retryable: boolean;
  nextRetryAt?: Date;
}

// ============================================================================
// Idempotency Service
// ============================================================================

export class WebhookIdempotencyService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Check if an event has already been processed (idempotency check)
   */
  async isEventProcessed(stripeEventId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .select('id, status')
      .eq('stripe_event_id', stripeEventId)
      .eq('status', 'completed')
      .maybeSingle();

    if (error) {
      console.error('Error checking event idempotency:', error);
      return false; // Fail open - process the event
    }

    return !!data;
  }

  /**
   * Record a webhook event for tracking
   */
  async recordEvent(
    stripeEventId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .upsert({
        stripe_event_id: stripeEventId,
        event_type: eventType,
        status: 'pending',
        attempts: 0,
        payload: payload,
      }, {
        onConflict: 'stripe_event_id',
        ignoreDuplicates: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error recording webhook event:', error);
      throw new Error(`Failed to record webhook event: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Mark event as processing
   */
  async markProcessing(eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from('webhook_events')
      .update({
        status: 'processing',
        attempts: this.supabase.rpc('increment_webhook_attempt', { event_id: eventId }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (error) {
      console.error('Error marking event as processing:', error);
    }
  }

  /**
   * Mark event as completed
   */
  async markCompleted(eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from('webhook_events')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (error) {
      console.error('Error marking event as completed:', error);
    }
  }

  /**
   * Mark event as failed with retry scheduling
   */
  async markFailed(
    eventId: string,
    errorMessage: string,
    retryable: boolean,
    nextRetryAt?: Date
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      status: retryable ? 'retrying' : 'failed',
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    };

    if (nextRetryAt) {
      updates.next_retry_at = nextRetryAt.toISOString();
    }

    const { error } = await this.supabase
      .from('webhook_events')
      .update(updates)
      .eq('id', eventId);

    if (error) {
      console.error('Error marking event as failed:', error);
    }
  }

  /**
   * Get pending retry events
   */
  async getPendingRetries(limit = 100): Promise<WebhookEventRecord[]> {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .select('*')
      .in('status', ['pending', 'retrying'])
      .lte('next_retry_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching pending retries:', error);
      return [];
    }

    return (data || []).map(this.mapRecord);
  }

  /**
   * Clean up old completed events (data retention)
   */
  async cleanupOldEvents(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { error, count } = await this.supabase
      .from('webhook_events')
      .delete()
      .eq('status', 'completed')
      .lt('processed_at', cutoffDate.toISOString());

    if (error) {
      console.error('Error cleaning up old events:', error);
      return 0;
    }

    return count || 0;
  }

  private mapRecord(row: Record<string, unknown>): WebhookEventRecord {
    return {
      id: row.id as string,
      stripeEventId: row.stripe_event_id as string,
      eventType: row.event_type as string,
      status: row.status as WebhookEventRecord['status'],
      attempts: row.attempts as number,
      payload: row.payload as Record<string, unknown>,
      errorMessage: row.error_message as string | undefined,
      processedAt: row.processed_at as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

export class RetryPolicy {
  private maxAttempts: number;
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(
    maxAttempts = 5,
    baseDelayMs = 1000,
    maxDelayMs = 300000 // 5 minutes
  ) {
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  /**
   * Calculate next retry time using exponential backoff with jitter
   */
  calculateNextRetry(attemptNumber: number): Date {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s... with max 5 minutes
    const exponentialDelay = Math.min(
      this.baseDelayMs * Math.pow(2, attemptNumber - 1),
      this.maxDelayMs
    );

    // Add jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    const finalDelay = exponentialDelay + jitter;

    const nextRetry = new Date();
    nextRetry.setMilliseconds(nextRetry.getMilliseconds() + finalDelay);

    return nextRetry;
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: Error): boolean {
    // Network errors are retryable
    if (error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('socket hang up')) {
      return true;
    }

    // Stripe-specific retryable errors
    if (error.message.includes('rate limit') ||
        error.message.includes('RateLimitError')) {
      return true;
    }

    // Database connection errors
    if (error.message.includes('connection') ||
        error.message.includes('pool') ||
        error.message.includes('database')) {
      return true;
    }

    // Non-retryable errors
    if (error.message.includes('Invalid') ||
        error.message.includes('not found') ||
        error.message.includes('already') ||
        error.message.includes('duplicate')) {
      return false;
    }

    // Default: retryable
    return true;
  }

  /**
   * Check if should retry
   */
  shouldRetry(attemptNumber: number, error: Error): boolean {
    if (attemptNumber >= this.maxAttempts) {
      return false;
    }
    return this.isRetryableError(error);
  }
}

// ============================================================================
// Webhook Event Processor
// ============================================================================

export class WebhookEventProcessor {
  private idempotencyService: WebhookIdempotencyService;
  private retryPolicy: RetryPolicy;
  private handlers: Map<string, WebhookHandler>;

  constructor(
    idempotencyService: WebhookIdempotencyService,
    retryPolicy: RetryPolicy = new RetryPolicy()
  ) {
    this.idempotencyService = idempotencyService;
    this.retryPolicy = retryPolicy;
    this.handlers = new Map();
  }

  /**
   * Register a handler for a specific event type
   */
  registerHandler(eventType: string, handler: WebhookHandler): void {
    this.handlers.set(eventType, handler);
  }

  /**
   * Process a webhook event with idempotency and retry logic
   */
  async processEvent(
    stripeEventId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<WebhookProcessingResult> {
    try {
      // Check idempotency
      const isProcessed = await this.idempotencyService.isEventProcessed(stripeEventId);
      if (isProcessed) {
        return {
          success: true,
          processed: false,
          error: 'Event already processed (idempotency)',
          retryable: false,
        };
      }

      // Record event
      const eventId = await this.idempotencyService.recordEvent(
        stripeEventId,
        eventType,
        payload
      );

      // Mark as processing
      await this.idempotencyService.markProcessing(eventId);

      // Get handler
      const handler = this.handlers.get(eventType);
      if (!handler) {
        // No handler registered - mark as completed (not an error)
        await this.idempotencyService.markCompleted(eventId);
        return {
          success: true,
          processed: true,
          error: `No handler for event type: ${eventType}`,
          retryable: false,
        };
      }

      // Execute handler
      try {
        await handler(payload);
        await this.idempotencyService.markCompleted(eventId);
        return {
          success: true,
          processed: true,
          retryable: false,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isRetryable = error instanceof Error && this.retryPolicy.isRetryableError(error);
        const nextRetryAt = isRetryable
          ? this.retryPolicy.calculateNextRetry(1)
          : undefined;

        await this.idempotencyService.markFailed(eventId, errorMessage, isRetryable, nextRetryAt);

        return {
          success: false,
          processed: false,
          error: errorMessage,
          retryable: isRetryable,
          nextRetryAt,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        processed: false,
        error: errorMessage,
        retryable: true, // System error, should retry
      };
    }
  }

  /**
   * Retry a failed event
   */
  async retryEvent(eventRecord: WebhookEventRecord): Promise<WebhookProcessingResult> {
    const handler = this.handlers.get(eventRecord.eventType);

    if (!handler) {
      await this.idempotencyService.markCompleted(eventRecord.id);
      return {
        success: true,
        processed: true,
        error: `No handler for event type: ${eventRecord.eventType}`,
        retryable: false,
      };
    }

    try {
      await this.idempotencyService.markProcessing(eventRecord.id);
      await handler(eventRecord.payload);
      await this.idempotencyService.markCompleted(eventRecord.id);

      return {
        success: true,
        processed: true,
        retryable: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRetryable = error instanceof Error &&
        this.retryPolicy.shouldRetry(eventRecord.attempts + 1, error);

      const nextRetryAt = isRetryable
        ? this.retryPolicy.calculateNextRetry(eventRecord.attempts + 1)
        : undefined;

      await this.idempotencyService.markFailed(
        eventRecord.id,
        errorMessage,
        isRetryable,
        nextRetryAt
      );

      return {
        success: false,
        processed: false,
        error: errorMessage,
        retryable: isRetryable,
        nextRetryAt,
      };
    }
  }
}

export type WebhookHandler = (payload: Record<string, unknown>) => Promise<void>;

// ============================================================================
// Webhook Retry Worker
// ============================================================================

export class WebhookRetryWorker {
  private idempotencyService: WebhookIdempotencyService;
  private processor: WebhookEventProcessor;
  private isRunning: boolean = false;
  private intervalMs: number;

  constructor(
    idempotencyService: WebhookIdempotencyService,
    processor: WebhookEventProcessor,
    intervalMs = 60000 // 1 minute
  ) {
    this.idempotencyService = idempotencyService;
    this.processor = processor;
    this.intervalMs = intervalMs;
  }

  /**
   * Start the retry worker
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.runLoop();
  }

  /**
   * Stop the retry worker
   */
  stop(): void {
    this.isRunning = false;
  }

  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processPendingRetries();
      } catch (error) {
        console.error('Error in retry worker loop:', error);
      }

      await this.sleep(this.intervalMs);
    }
  }

  private async processPendingRetries(): Promise<void> {
    const pendingEvents = await this.idempotencyService.getPendingRetries(100);

    for (const event of pendingEvents) {
      try {
        await this.processor.retryEvent(event);
      } catch (error) {
        console.error(`Error retrying event ${event.id}:`, error);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createWebhookProcessor(supabase: SupabaseClient): {
  idempotencyService: WebhookIdempotencyService;
  processor: WebhookEventProcessor;
  retryWorker: WebhookRetryWorker;
} {
  const idempotencyService = new WebhookIdempotencyService(supabase);
  const retryPolicy = new RetryPolicy(5, 1000, 300000);
  const processor = new WebhookEventProcessor(idempotencyService, retryPolicy);
  const retryWorker = new WebhookRetryWorker(idempotencyService, processor);

  return { idempotencyService, processor, retryWorker };
}
