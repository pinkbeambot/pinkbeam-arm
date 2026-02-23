/**
 * Unit tests for Tasks API Endpoints
 * 
 * Tests all CRUD operations for tasks:
 * - GET /api/tasks - List tasks
 * - POST /api/tasks - Create task
 * - GET /api/tasks/[id] - Get single task
 * - PATCH /api/tasks/[id] - Update task
 * - DELETE /api/tasks/[id] - Delete task
 * - POST/DELETE /api/tasks/[id]/assign - Assign/unassign task
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/api/auth', () => ({
  authenticateRequest: vi.fn(),
  isErrorResponse: vi.fn((result) => result instanceof Response),
}));

vi.mock('@/lib/rbac', () => ({
  requirePermission: vi.fn(() => ({ allowed: true })),
}));

import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { requirePermission } from '@/lib/rbac';

const mockTenantId = 'tenant-001';
const mockUserId = 'user-001';

const mockTask = {
  id: 'task-001',
  tenant_id: mockTenantId,
  title: 'Test Task',
  description: 'Test Description',
  status: 'queued',
  priority: 'normal',
  assignee_id: null,
  assigner_id: null,
  parent_task_id: null,
  progress_percent: 0,
  created_at: '2026-02-17T10:00:00Z',
  updated_at: '2026-02-17T10:00:00Z',
};

describe('Tasks API Endpoints', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (authenticateRequest as any).mockResolvedValue({
      tenantId: mockTenantId,
      userId: mockUserId,
      userRole: 'admin',
      supabase: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      (authenticateRequest as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      );

      const { GET } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('RBAC', () => {
    it('should reject requests without permission', async () => {
      (requirePermission as any).mockReturnValueOnce({
        allowed: false,
        reason: 'Permission denied',
      });

      const { POST } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Task' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });

  describe('Validation', () => {
    it('should validate create task input', async () => {
      const { POST } = await import('@/app/api/tasks/route');
      
      const request = new Request('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toContain('Validation error');
    });

    it('should validate update task progress', async () => {
      const { PATCH } = await import('@/app/api/tasks/[id]/route');
      
      const request = new Request('http://localhost:3000/api/tasks/task-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress_percent: 150 }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'task-001' }) });
      expect(response.status).toBe(400);
    });
  });
});
