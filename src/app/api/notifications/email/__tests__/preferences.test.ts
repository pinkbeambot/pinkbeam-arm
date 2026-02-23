/**
 * Email Preferences API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from '../preferences/route';
import { NextRequest } from 'next/server';

// Mock the auth module
vi.mock('@/lib/api/auth', () => ({
  authenticateRequest: vi.fn(),
  isErrorResponse: (val: unknown) => val instanceof Response,
}));

import { authenticateRequest } from '@/lib/api/auth';

describe('Email Preferences API', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  const mockAuth = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    supabase: mockSupabase,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuth as unknown as Awaited<ReturnType<typeof authenticateRequest>>);
  });

  describe('GET /api/notifications/email/preferences', () => {
    it('should return user preferences', async () => {
      const mockPreferences = [
        {
          id: 'pref-1',
          tenant_id: 'tenant-123',
          user_id: 'user-123',
          notification_type: 'escalation_received',
          channels: { email: true, in_app: true },
          min_priority: 'high',
        },
        {
          id: 'pref-2',
          tenant_id: 'tenant-123',
          user_id: 'user-123',
          notification_type: 'task_assigned',
          channels: { email: true, in_app: true },
          min_priority: 'normal',
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockPreferences,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/notifications/email/preferences');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(2);
      expect(json.meta.is_default).toBe(false);
    });

    it('should return default preferences when none exist', async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost/api/notifications/email/preferences');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.meta.is_default).toBe(true);
      expect(json.data).toBeDefined();
    });

    it('should handle database errors', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = new NextRequest('http://localhost/api/notifications/email/preferences');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/notifications/email/preferences', () => {
    it('should update single preference', async () => {
      const mockPreference = {
        id: 'pref-1',
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        notification_type: 'escalation_received',
        channels: { email: false, in_app: true },
        min_priority: 'normal',
      };

      mockSupabase.upsert.mockResolvedValue({
        data: mockPreference,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/notifications/email/preferences', {
        method: 'POST',
        body: JSON.stringify({
          notification_type: 'escalation_received',
          channels: { email: false, in_app: true },
          min_priority: 'normal',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.channels.email).toBe(false);
    });

    it('should update multiple preferences in bulk', async () => {
      const mockPreferences = [
        { id: 'pref-1', notification_type: 'escalation_received', channels: { email: true } },
        { id: 'pref-2', notification_type: 'task_assigned', channels: { email: true } },
      ];

      mockSupabase.upsert.mockResolvedValue({
        data: mockPreferences[0],
        error: null,
      });

      const request = new NextRequest('http://localhost/api/notifications/email/preferences', {
        method: 'POST',
        body: JSON.stringify({
          preferences: [
            {
              notification_type: 'escalation_received',
              channels: { email: true, in_app: true },
              min_priority: 'high',
            },
            {
              notification_type: 'task_assigned',
              channels: { email: true, in_app: true },
              min_priority: 'normal',
            },
          ],
          quiet_hours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
            timezone: 'America/Los_Angeles',
          },
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.meta.updated).toBeGreaterThan(0);
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost/api/notifications/email/preferences', {
        method: 'POST',
        body: JSON.stringify({
          notification_type: 'invalid_type',
          channels: { email: true },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should validate time format for quiet hours', async () => {
      const request = new NextRequest('http://localhost/api/notifications/email/preferences', {
        method: 'POST',
        body: JSON.stringify({
          notification_type: 'escalation_received',
          quiet_hours: {
            enabled: true,
            start: '25:00', // Invalid time
            end: '08:00',
            timezone: 'UTC',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/notifications/email/preferences', () => {
    it('should reset all preferences to defaults', async () => {
      mockSupabase.delete.mockResolvedValue({
        error: null,
      });

      const request = new NextRequest('http://localhost/api/notifications/email/preferences', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should handle delete errors', async () => {
      mockSupabase.delete.mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      const request = new NextRequest('http://localhost/api/notifications/email/preferences', {
        method: 'DELETE',
      });

      const response = await DELETE(request);

      expect(response.status).toBe(500);
    });
  });
});
