/**
 * Email Service Tests
 *
 * Tests for email sending functions and notification service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the resend module - must be before imports
const mockSend = vi.fn();
vi.mock('@/lib/resend', () => ({
  resend: {
    emails: {
      send: mockSend,
    },
  },
  isResendConfigured: vi.fn().mockReturnValue(true),
  EMAIL_FROM: 'Pink Beam <noreply@pinkbeam.ai>',
}));

// Mock the service role client
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseUpdate = vi.fn();

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
  })),
}));

import { isResendConfigured } from '@/lib/resend';
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
    mockSend.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      mockSend.mockResolvedValueOnce({
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
      mockSend.mockResolvedValueOnce({
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
      mockSend.mockResolvedValueOnce({
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
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'manager@example.com',
          subject: '[CRITICAL] Escalation: API Rate Limit Exceeded',
        })
      );
    });

    it('should use different subject for normal urgency', async () => {
      mockSend.mockResolvedValueOnce({
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

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Escalation: Clarification Needed',
        })
      );
    });
  });

  describe('sendDecisionEmail', () => {
    it('should send decision email with approval buttons', async () => {
      mockSend.mockResolvedValueOnce({
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
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'approver@example.com',
          subject: '[ACTION REQUIRED] Decision: Deploy to Production',
        })
      );
    });
  });

  describe('sendTaskCompleteEmail', () => {
    it('should send task completion email', async () => {
      mockSend.mockResolvedValueOnce({
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
      expect(mockSend).toHaveBeenCalledWith(
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
      mockSend.mockResolvedValueOnce({
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

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expectedSubject,
        })
      );
    });
  });
});

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockReset();
  });

  describe('processNotificationEmail', () => {
    it('should process escalation notification and send email', async () => {
      // Setup mock chain for notification preferences query
      const mockPrefQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { channels: { email: true }, min_priority: 'normal' },
          error: null,
        }),
      };

      // Setup mock chain for users query
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { auth_id: 'user-123', name: 'Test User', email: 'user@example.com' },
          error: null,
        }),
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'notification_preferences') return mockPrefQuery;
        if (table === 'users') return mockUserQuery;
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });

      mockSend.mockResolvedValueOnce({
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

      // Since we mock the resend module at the top level, this should work
      expect(mockSend).toHaveBeenCalled();
    });

    it('should not send email if user has disabled email channel', async () => {
      const mockPrefQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            channels: { email: false, in_app: true },
            min_priority: 'normal',
          },
          error: null,
        }),
      };

      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { auth_id: 'user-123', name: 'Test User', email: 'user@example.com' },
          error: null,
        }),
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'notification_preferences') return mockPrefQuery;
        if (table === 'users') return mockUserQuery;
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
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
      const mockPrefQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            channels: { email: true },
            min_priority: 'high',
          },
          error: null,
        }),
      };

      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { auth_id: 'user-123', name: 'Test User', email: 'user@example.com' },
          error: null,
        }),
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'notification_preferences') return mockPrefQuery;
        if (table === 'users') return mockUserQuery;
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
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
      // Mock current time to be during quiet hours (11 PM UTC)
      const mockDate = new Date('2026-02-17T23:00:00Z');
      vi.setSystemTime(mockDate);

      const mockPrefQuery = {
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
      };

      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { auth_id: 'user-123', name: 'Test User', email: 'user@example.com' },
          error: null,
        }),
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'notification_preferences') return mockPrefQuery;
        if (table === 'users') return mockUserQuery;
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
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
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { email: 'newuser@example.com', auth_id: 'auth-123' },
          error: null,
        }),
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'users') return mockUserQuery;
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });

      mockSend.mockResolvedValueOnce({
        data: { id: 'welcome-id' },
        error: null,
      });

      const result = await sendWelcomeEmailOnSignup('tenant-123', 'user-123', 'New User');

      expect(result.sent).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' },
        }),
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'users') return mockUserQuery;
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });

      const result = await sendWelcomeEmailOnSignup('tenant-123', 'user-123', 'New User');

      expect(result.sent).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });
});
