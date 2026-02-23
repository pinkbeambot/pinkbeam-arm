/**
 * Send Email API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../send/route';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/api/auth', () => ({
  authenticateRequest: vi.fn(),
  isErrorResponse: (val: unknown) => val instanceof Response,
}));

vi.mock('@/lib/emails/send', () => ({
  sendWelcomeEmail: vi.fn(),
  sendEscalationEmail: vi.fn(),
  sendDecisionEmail: vi.fn(),
  sendTaskCompleteEmail: vi.fn(),
  sendBillingEmail: vi.fn(),
}));

import { authenticateRequest } from '@/lib/api/auth';
import {
  sendWelcomeEmail,
  sendEscalationEmail,
  sendDecisionEmail,
  sendTaskCompleteEmail,
  sendBillingEmail,
} from '@/lib/emails/send';

describe('Send Email API', () => {
  const mockAuth = {
    tenantId: 'tenant-123',
    userId: 'user-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuth as unknown as Awaited<ReturnType<typeof authenticateRequest>>);
  });

  describe('POST /api/notifications/email/send', () => {
    it('should send welcome email', async () => {
      vi.mocked(sendWelcomeEmail).mockResolvedValue({
        success: true,
        messageId: 'welcome-123',
      });

      const request = new NextRequest('http://localhost/api/notifications/email/send', {
        method: 'POST',
        body: JSON.stringify({
          type: 'welcome',
          to: 'newuser@example.com',
          userName: 'New User',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.messageId).toBe('welcome-123');
      expect(sendWelcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@example.com',
          userName: 'New User',
          loginUrl: expect.stringContaining('/portal'),
          unsubscribeUrl: expect.stringContaining('token='),
        })
      );
    });

    it('should send escalation email', async () => {
      vi.mocked(sendEscalationEmail).mockResolvedValue({
        success: true,
        messageId: 'escalation-123',
      });

      const request = new NextRequest('http://localhost/api/notifications/email/send', {
        method: 'POST',
        body: JSON.stringify({
          type: 'escalation',
          to: 'manager@example.com',
          userName: 'Manager',
          agentName: 'Agent-1',
          escalationTitle: 'API Error',
          urgency: 'high',
          message: 'API rate limit exceeded',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(sendEscalationEmail).toHaveBeenCalled();
    });

    it('should send decision email', async () => {
      vi.mocked(sendDecisionEmail).mockResolvedValue({
        success: true,
        messageId: 'decision-123',
      });

      const request = new NextRequest('http://localhost/api/notifications/email/send', {
        method: 'POST',
        body: JSON.stringify({
          type: 'decision',
          to: 'approver@example.com',
          userName: 'Approver',
          agentName: 'Agent-1',
          decisionTitle: 'Deploy Feature',
          proposedAction: 'Deploy to production',
          reasoning: 'All tests passed',
          urgency: 'normal',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(sendDecisionEmail).toHaveBeenCalled();
    });

    it('should send task complete email', async () => {
      vi.mocked(sendTaskCompleteEmail).mockResolvedValue({
        success: true,
        messageId: 'task-123',
      });

      const request = new NextRequest('http://localhost/api/notifications/email/send', {
        method: 'POST',
        body: JSON.stringify({
          type: 'task_complete',
          to: 'user@example.com',
          userName: 'User',
          taskTitle: 'Generate Report',
          agentName: 'Agent-1',
          completedAt: '2026-02-17T10:00:00Z',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(sendTaskCompleteEmail).toHaveBeenCalled();
    });

    it.each([
      ['invoice', { emailType: 'invoice', amount: '99.00', invoiceNumber: 'INV-001' }],
      ['payment_success', { emailType: 'payment_success', amount: '99.00', paymentMethod: 'Visa ending in 4242' }],
      ['payment_failed', { emailType: 'payment_failed', amount: '99.00', failureReason: 'Card declined' }],
      ['subscription_updated', { emailType: 'subscription_updated', planName: 'Pro Plan' }],
      ['usage_alert', { emailType: 'usage_alert', usagePercent: 85, planName: 'Pro Plan' }],
    ])('should send billing email: %s', async (type, extraData) => {
      vi.mocked(sendBillingEmail).mockResolvedValue({
        success: true,
        messageId: `billing-${type}-123`,
      });

      const request = new NextRequest('http://localhost/api/notifications/email/send', {
        method: 'POST',
        body: JSON.stringify({
          type: 'billing',
          to: 'billing@example.com',
          userName: 'User',
          ...extraData,
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(sendBillingEmail).toHaveBeenCalled();
    });

    it('should return 400 for invalid request body', async () => {
      const request = new NextRequest('http://localhost/api/notifications/email/send', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid_type',
          to: 'user@example.com',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Invalid request body');
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/notifications/email/send', {
        method: 'POST',
        body: JSON.stringify({
          type: 'welcome',
          // missing userName
          to: 'user@example.com',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 500 when email sending fails', async () => {
      vi.mocked(sendWelcomeEmail).mockResolvedValue({
        success: false,
        error: 'Resend API error',
      });

      const request = new NextRequest('http://localhost/api/notifications/email/send', {
        method: 'POST',
        body: JSON.stringify({
          type: 'welcome',
          to: 'user@example.com',
          userName: 'User',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Resend API error');
    });

    it('should require authentication', async () => {
      vi.mocked(authenticateRequest).mockResolvedValue(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );

      const request = new NextRequest('http://localhost/api/notifications/email/send', {
        method: 'POST',
        body: JSON.stringify({
          type: 'welcome',
          to: 'user@example.com',
          userName: 'User',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });
});
