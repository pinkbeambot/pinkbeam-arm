/**
 * Email Service Tests
 *
 * Tests for email sending functions and notification service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the resend module
vi.mock('@/lib/resend', () => ({
  resend: {
    emails: {
      send: vi.fn(),
    },
  },
  isResendConfigured: vi.fn().mockReturnValue(true),
  EMAIL_FROM: 'Pink Beam <noreply@pinkbeam.ai>',
}));

// Mock the service role client
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}));

import { resend, isResendConfigured } from '@/lib/resend';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  sendWelcomeEmail,
  sendEscalationEmail,
  sendDecisionEmail,
  sendTaskCompleteEmail,
  sendBillingEmail,
} from '@/lib/emails/send';
import {
  processNotificationEmail,
  sendTaskCompletionEmails,
  sendWelcomeEmailOnSignup,
} from '@/lib/emails/notification-service';

describe('Email Send Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const mockSend = vi.mocked(resend!.emails.send).mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      });

      const result = await sendWelcomeEmail({
        to: 'test@example.com',
        userName: 'Test User',
        loginUrl: 'http://localhost:3000/portal',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Pink Beam <noreply@pinkbeam.ai>',
          to: 'test@example.com',
          subject: 'Welcome to Pink Beam ARM!',
        })
      );
    });

    it('should return error when resend is not configured', async () => {
      vi.mocked(isResendConfigured).mockReturnValueOnce(false);

      const result = await sendWelcomeEmail({
        to: 'test@example.com',
        userName: 'Test User',
        loginUrl: 'http://localhost:3000/portal',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service not configured');
    });

    it('should handle resend API errors', async () => {
      vi.mocked(resend!.emails.send).mockResolvedValue({
        data: null,
        error: { message: 'Invalid email address' },
      });

      const result = await sendWelcomeEmail({
        to: 'invalid-email',
        userName: 'Test User',
        loginUrl: 'http://localhost:3000/portal',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });
  });

  describe('sendEscalationEmail', () => {
    it('should send escalation email with correct urgency subject', async () => {
      vi.mocked(resend!.emails.send).mockResolvedValue({
        data: { id: 'escalation-id' },
        error: null,
      });

      const result = await sendEscalationEmail({
        to: 'manager@example.com',
        userName: 'Manager',
        agentName: 'Agent-1',
        escalationTitle: 'API Rate Limit Exceeded',
        urgency: 'critical',
        message: 'The agent has hit the API rate limit',
        actionUrl: 'http://localhost:3000/portal/escalations/123',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe',
      });

      expect(result.success).toBe(true);
      expect(resend!.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'manager@example.com',
          subject: '[CRITICAL] Escalation: API Rate Limit Exceeded',
        })
      );
    });

    it('should use different subject for normal urgency', async () => {
      vi.mocked(resend!.emails.send).mockResolvedValue({
        data: { id: 'escalation-id' },
        error: null,
      });

      await sendEscalationEmail({
        to: 'manager@example.com',
        userName: 'Manager',
        agentName: 'Agent-1',
        escalationTitle: 'Clarification Needed',
        urgency: 'normal',
        message: 'Need clarification on task scope',
        actionUrl: 'http://localhost:3000/portal/escalations/123',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe',
      });

      expect(resend!.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Escalation: Clarification Needed',
        })
      );
    });
  });

  describe('sendDecisionEmail', () => {
    it('should send decision email with approval buttons', async () => {
      vi.mocked(resend!.emails.send).mockResolvedValue({
        data: { id: 'decision-id' },
        error: null,
      });

      const result = await sendDecisionEmail({
        to: 'approver@example.com',
        userName: 'Approver',
        agentName: 'Agent-1',
        decisionTitle: 'Deploy to Production',
        proposedAction: 'Deploy the new feature to production environment',
        reasoning: 'All tests passed and staging looks good',
        deadline: '2026-02-20',
        urgency: 'high',
        actionUrl: 'http://localhost:3000/portal/decisions/456',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe',
      });

      expect(result.success).toBe(true);
      expect(resend!.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'approver@example.com',
          subject: '[ACTION REQUIRED] Decision: Deploy to Production',
        })
      );
    });
  });

  describe('sendTaskCompleteEmail', () => {
    it('should send task completion email', async () => {
      vi.mocked(resend!.emails.send).mockResolvedValue({
        data: { id: 'task-id' },
        error: null,
      });

      const result = await sendTaskCompleteEmail({
        to: 'user@example.com',
        userName: 'User',
        taskTitle: 'Generate Report',
        agentName: 'Agent-1',
        completedAt: '2026-02-17T10:00:00Z',
        duration: '2h 30m',
        actionUrl: 'http://localhost:3000/portal/tasks/789',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe',
      });

      expect(result.success).toBe(true);
      expect(resend!.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Task Completed: Generate Report',
        })
      );
    });
  });

  describe('sendBillingEmail', () => {
    it.each([
      ['invoice', 'Your Pink Beam Invoice is Ready'],
      ['payment_success', 'Payment Confirmation - Pink Beam'],
      ['payment_failed', 'Payment Failed - Action Required'],
      ['subscription_updated', 'Your Subscription Has Been Updated'],
      ['usage_alert', 'Usage Limit Approaching - Pink Beam'],
    ])('should send %s email with correct subject', async (type, expectedSubject) => {
      vi.mocked(resend!.emails.send).mockResolvedValue({
        data: { id: 'billing-id' },
        error: null,
      });

      await sendBillingEmail({
        to: 'billing@example.com',
        userName: 'User',
        emailType: type as any,
        amount: '99.00',
        invoiceNumber: 'INV-001',
        actionUrl: 'http://localhost:3000/portal/billing',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe',
      });

      expect(resend!.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expectedSubject,
        })
      );
    });
  });
});

describe('Notification Service', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabase as any);
  });

  describe('processNotificationEmail', () => {
    it('should process escalation notification and send email', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { auth_id: 'user-123', name: 'Test User', email: 'user@example.com' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { channels: { email: true }, min_priority: 'normal' },
          error: null,
        }),
      });

      vi.mocked(resend!.emails.send).mockResolvedValue({
        data: { id: 'msg-id' },
        error: null,
      });

      const notification = {
        id: 'notif-123',
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        type: 'escalation_received' as const,
        title: 'Test Escalation',
        message: 'Test message',
        priority: 'high' as const,
        is_read: false,
        created_at: '2026-02-17T10:00:00Z',
        metadata: {
          agent_name: 'Agent-1',
          escalation_urgency: 'high',
        },
      };

      const result = await processNotificationEmail(notification);

      expect(result.sent).toBe(true);
    });

    it('should not send email if user has disabled email channel', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            channels: { email: false, in_app: true },
            min_priority: 'normal',
          },
          error: null,
        }),
      });

      const notification = {
        id: 'notif-123',
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        type: 'escalation_received' as const,
        title: 'Test Escalation',
        message: 'Test message',
        priority: 'normal' as const,
        is_read: false,
        created_at: '2026-02-17T10:00:00Z',
      };

      const result = await processNotificationEmail(notification);

      expect(result.sent).toBe(false);
      expect(result.error).toBe('Email disabled by user preferences');
    });

    it('should not send email if priority is below threshold', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            channels: { email: true },
            min_priority: 'high',
          },
          error: null,
        }),
      });

      const notification = {
        id: 'notif-123',
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        type: 'escalation_received' as const,
        title: 'Test Escalation',
        message: 'Test message',
        priority: 'low' as const,
        is_read: false,
        created_at: '2026-02-17T10:00:00Z',
      };

      const result = await processNotificationEmail(notification);

      expect(result.sent).toBe(false);
    });

    it('should respect quiet hours', async () => {
      // Mock current time to be during quiet hours (11 PM)
      const mockDate = new Date('2026-02-17T23:00:00Z');
      vi.setSystemTime(mockDate);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            channels: { email: true },
            min_priority: 'low',
            quiet_hours: {
              enabled: true,
              start: '22:00',
              end: '08:00',
              timezone: 'UTC',
            },
          },
          error: null,
        }),
      });

      const notification = {
        id: 'notif-123',
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        type: 'escalation_received' as const,
        title: 'Test Escalation',
        message: 'Test message',
        priority: 'normal' as const,
        is_read: false,
        created_at: '2026-02-17T10:00:00Z',
      };

      const result = await processNotificationEmail(notification);

      expect(result.sent).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('sendWelcomeEmailOnSignup', () => {
    it('should send welcome email on signup', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { email: 'newuser@example.com', auth_id: 'auth-123' },
        error: null,
      });

      vi.mocked(resend!.emails.send).mockResolvedValue({
        data: { id: 'welcome-id' },
        error: null,
      });

      const result = await sendWelcomeEmailOnSignup('tenant-123', 'user-123', 'New User');

      expect(result.sent).toBe(true);
      expect(resend!.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Welcome to Pink Beam ARM!',
        })
      );
    });

    it('should handle missing user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      const result = await sendWelcomeEmailOnSignup('tenant-123', 'user-123', 'New User');

      expect(result.sent).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('sendTaskCompletionEmails', () => {
    it('should send completion emails to multiple users', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn().mockResolvedValue({
              data: [
                { auth_id: 'user-1', name: 'User 1', email: 'user1@example.com' },
                { auth_id: 'user-2', name: 'User 2', email: 'user2@example.com' },
              ],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { channels: { email: true } },
            error: null,
          }),
        };
      });

      vi.mocked(resend!.emails.send).mockResolvedValue({
        data: { id: 'task-complete-id' },
        error: null,
      });

      const result = await sendTaskCompletionEmails(
        'tenant-123',
        'task-123',
        'Test Task',
        'Agent-1',
        '2026-02-17T10:00:00Z'
      );

      expect(result.sent).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
  });
});
