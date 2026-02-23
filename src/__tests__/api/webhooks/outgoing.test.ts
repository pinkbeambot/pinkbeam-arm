/**
 * Webhook Outgoing API Tests
 *
 * Tests for /api/webhooks/outgoing endpoints
 * Phase 6: Webhook Endpoints Implementation
 */

import { describe, it, expect } from 'vitest';
import { createWebhookEndpointSchema, updateWebhookEndpointSchema, listWebhookDeliveriesQuerySchema } from '@/lib/validation';

describe('Webhook Validation Schemas', () => {
  describe('createWebhookEndpointSchema', () => {
    it('should validate valid webhook creation data', () => {
      const validData = {
        url: 'https://example.com/webhook',
        description: 'Test webhook',
        events: ['agent.created', 'task.completed'],
      };

      const result = createWebhookEndpointSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const invalidData = {
        url: 'not-a-valid-url',
        events: ['agent.created'],
      };

      const result = createWebhookEndpointSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty events array', () => {
      const invalidData = {
        url: 'https://example.com/webhook',
        events: [],
      };

      const result = createWebhookEndpointSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid event types', () => {
      const invalidData = {
        url: 'https://example.com/webhook',
        events: ['invalid.event'],
      };

      const result = createWebhookEndpointSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept metadata', () => {
      const validData = {
        url: 'https://example.com/webhook',
        events: ['agent.created'],
        metadata: { custom: 'value', number: 123 },
      };

      const result = createWebhookEndpointSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('updateWebhookEndpointSchema', () => {
    it('should validate partial updates', () => {
      const updateData = {
        description: 'Updated description',
        is_active: false,
      };

      const result = updateWebhookEndpointSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it('should allow updating URL', () => {
      const updateData = {
        url: 'https://new-url.com/webhook',
      };

      const result = updateWebhookEndpointSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it('should reject empty events array in update', () => {
      const updateData = {
        events: [],
      };

      const result = updateWebhookEndpointSchema.safeParse(updateData);
      expect(result.success).toBe(false);
    });
  });

  describe('listWebhookDeliveriesQuerySchema', () => {
    it('should validate default query params', () => {
      const query = {};

      const result = listWebhookDeliveriesQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(20);
      expect(result.data?.offset).toBe(0);
    });

    it('should reject invalid status', () => {
      const query = {
        status: 'invalid_status',
      };

      const result = listWebhookDeliveriesQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const query = {
        offset: -5,
      };

      const result = listWebhookDeliveriesQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const query = {
        limit: 200,
      };

      const result = listWebhookDeliveriesQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});
