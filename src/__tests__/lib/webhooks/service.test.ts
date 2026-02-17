/**
 * Webhook Service Tests
 *
 * Tests for webhook delivery, signature verification, and retry logic
 * Phase 6: Webhook Endpoints Implementation
 */

import { describe, it, expect } from 'vitest';
import { signPayload, verifySignature, generateHeaders } from '@/lib/webhooks/signature';

describe('Webhook Signature', () => {
  const secret = 'whsec_testsecret';
  const eventId = 'evt_123';
  const body = JSON.stringify({ id: 'evt_123', type: 'agent.created' });

  describe('signPayload', () => {
    it('should generate a valid HMAC signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signPayload(eventId, timestamp, body, secret);
      expect(signature).toMatch(/^v1=/);
      expect(signature.length).toBeGreaterThan(10);
    });

    it('should generate consistent signatures for same inputs', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const sig1 = signPayload(eventId, timestamp, body, secret);
      const sig2 = signPayload(eventId, timestamp, body, secret);
      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const sig1 = signPayload(eventId, timestamp, body, secret);
      const sig2 = signPayload(eventId, timestamp, body, 'whsec_different');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signPayload(eventId, timestamp, body, secret);
      const isValid = verifySignature(eventId, timestamp, body, secret, signature);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const isValid = verifySignature(eventId, timestamp, body, secret, 'v1=invalid');
      expect(isValid).toBe(false);
    });

    it('should reject signatures with outdated timestamps', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago (over 5 min tolerance)
      const signature = signPayload(eventId, oldTimestamp, body, secret);
      const isValid = verifySignature(eventId, oldTimestamp, body, secret, signature);
      expect(isValid).toBe(false);
    });

    it('should accept signatures within tolerance window', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 60 seconds ago
      const signature = signPayload(eventId, recentTimestamp, body, secret);
      const isValid = verifySignature(eventId, recentTimestamp, body, secret, signature);
      expect(isValid).toBe(true);
    });
  });

  describe('generateHeaders', () => {
    it('should generate all required headers', () => {
      const headers = generateHeaders(eventId, body, secret);

      expect(headers['X-Webhook-Id']).toBe(eventId);
      expect(headers['X-Webhook-Timestamp']).toBeDefined();
      expect(parseInt(headers['X-Webhook-Timestamp'])).toBeGreaterThan(0);
      expect(headers['X-Webhook-Signature']).toMatch(/^v1=/);
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['User-Agent']).toBe('PinkBeam-ARM/1.0');
    });

    it('should generate valid signature in headers', () => {
      const headers = generateHeaders(eventId, body, secret);
      const timestamp = parseInt(headers['X-Webhook-Timestamp']);
      
      const isValid = verifySignature(
        eventId,
        timestamp,
        body,
        secret,
        headers['X-Webhook-Signature']
      );
      expect(isValid).toBe(true);
    });
  });
});

describe('Webhook Event Types', () => {
  it('should include all required event types', async () => {
    const { WEBHOOK_EVENT_TYPES } = await import('@/types/webhook');
    
    // Agent events
    expect(WEBHOOK_EVENT_TYPES).toContain('agent.created');
    expect(WEBHOOK_EVENT_TYPES).toContain('agent.updated');
    expect(WEBHOOK_EVENT_TYPES).toContain('agent.deleted');
    expect(WEBHOOK_EVENT_TYPES).toContain('agent.status_changed');
    expect(WEBHOOK_EVENT_TYPES).toContain('agent.terminated');
    
    // Task events
    expect(WEBHOOK_EVENT_TYPES).toContain('task.created');
    expect(WEBHOOK_EVENT_TYPES).toContain('task.updated');
    expect(WEBHOOK_EVENT_TYPES).toContain('task.completed');
    expect(WEBHOOK_EVENT_TYPES).toContain('task.assigned');
    expect(WEBHOOK_EVENT_TYPES).toContain('task.status_changed');
    expect(WEBHOOK_EVENT_TYPES).toContain('task.failed');
    
    // Decision events
    expect(WEBHOOK_EVENT_TYPES).toContain('decision.proposed');
    expect(WEBHOOK_EVENT_TYPES).toContain('decision.approved');
    expect(WEBHOOK_EVENT_TYPES).toContain('decision.rejected');
    
    // Escalation events
    expect(WEBHOOK_EVENT_TYPES).toContain('escalation.created');
    expect(WEBHOOK_EVENT_TYPES).toContain('escalation.resolved');
    
    // System events
    expect(WEBHOOK_EVENT_TYPES).toContain('system.alert');
  });
});
