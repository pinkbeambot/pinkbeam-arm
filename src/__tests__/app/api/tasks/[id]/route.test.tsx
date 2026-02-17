import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/tasks/[id]/route';
import { NextRequest } from 'next/server';

// ============================================================================
// Mock Supabase
// ============================================================================

const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// ============================================================================
// Tests
// ============================================================================

describe('Task API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH /api/tasks/[id]', () => {
    it('updates task status successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'in_progress',
        priority: 'high',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockTask,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockTask);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
          updated_at: expect.any(String),
          started_at: expect.any(String),
        })
      );
    });

    it('adds completed_at timestamp when status is completed', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'completed',
        progress_percent: 100,
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockTask,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'task-1' }) });
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          completed_at: expect.any(String),
          progress_percent: 100,
        })
      );
    });

    it('updates task order', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        order: 5,
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockTask,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ order: 5 }),
      });

      await PATCH(request, { params: Promise.resolve({ id: 'task-1' }) });

      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({ order: 5 })
      );
    });

    it('returns 400 for invalid request body', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid_status' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('returns 404 when task not found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });

    it('returns 500 on database error', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update task');
    });

    it('handles multiple field updates', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'review',
        priority: 'urgent',
        progress_percent: 50,
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockTask,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Title',
          description: 'Updated Description',
          status: 'review',
          priority: 'urgent',
          progress_percent: 50,
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockTask);
    });
  });

  describe('GET /api/tasks/[id]', () => {
    it('returns task by id', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'in_progress',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockTask,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockTask);
    });

    it('returns 404 when task not found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });
  });

  describe('DELETE /api/tasks/[id]', () => {
    it('deletes task successfully', async () => {
      mockSupabaseClient.eq.mockResolvedValueOnce({
        error: null,
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });

    it('returns 500 on delete error', async () => {
      mockSupabaseClient.eq.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete task');
    });
  });
});
