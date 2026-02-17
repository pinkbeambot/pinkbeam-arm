import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useKanbanBoard } from '@/components/tasks/useKanbanBoard';
import type { Task, TaskStatus } from '@/types';

// ============================================================================
// Mock Data
// ============================================================================

const mockTasks: Task[] = [
  {
    id: 'task-1',
    tenant_id: 'tenant-1',
    title: 'Task 1',
    status: 'in_progress',
    priority: 'high',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'task-2',
    tenant_id: 'tenant-1',
    title: 'Task 2',
    status: 'queued',
    priority: 'normal',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// ============================================================================
// Mock fetch
// ============================================================================

global.fetch = vi.fn();

// ============================================================================
// Mock Supabase
// ============================================================================

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ============================================================================
// Tests
// ============================================================================

describe('useKanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with initial tasks if provided', () => {
    const { result } = renderHook(() =>
      useKanbanBoard({ initialTasks: mockTasks })
    );

    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.tasks[0].title).toBe('Task 1');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state when no initial tasks', async () => {
    mockSupabase.order.mockResolvedValueOnce({ 
      data: mockTasks, 
      error: null 
    });

    const { result } = renderHook(() => useKanbanBoard());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tasks).toHaveLength(2);
  });

  it('moves task successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { ...mockTasks[0], status: 'completed' } }),
    } as Response);

    const { result } = renderHook(() =>
      useKanbanBoard({ initialTasks: mockTasks })
    );

    await act(async () => {
      await result.current.moveTask('task-1', 'completed' as TaskStatus, 0);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/tasks/task-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', order: 0 }),
      })
    );
  });

  it('throws error when move task fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Update failed' }),
    } as Response);

    const { result } = renderHook(() =>
      useKanbanBoard({ initialTasks: mockTasks })
    );

    await expect(
      result.current.moveTask('task-1', 'completed' as TaskStatus)
    ).rejects.toThrow('Update failed');
  });

  it('reorders task successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockTasks[0] }),
    } as Response);

    const { result } = renderHook(() =>
      useKanbanBoard({ initialTasks: mockTasks })
    );

    await act(async () => {
      await result.current.reorderTask('task-1', 'in_progress' as TaskStatus, 'in_progress' as TaskStatus, 2);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/tasks/task-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress', order: 2 }),
      })
    );
  });

  it('updates task fields successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        data: { ...mockTasks[0], title: 'Updated Title' } 
      }),
    } as Response);

    const { result } = renderHook(() =>
      useKanbanBoard({ initialTasks: mockTasks })
    );

    await act(async () => {
      await result.current.updateTask('task-1', { title: 'Updated Title' });
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/tasks/task-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Title' }),
      })
    );
  });

  it('deletes task successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { result } = renderHook(() =>
      useKanbanBoard({ initialTasks: mockTasks })
    );

    // Tasks should be present initially
    expect(result.current.tasks).toHaveLength(2);

    await act(async () => {
      await result.current.deleteTask('task-1');
    });

    // Task should be removed optimistically
    expect(result.current.tasks).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      '/api/tasks/task-1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('refetches tasks', async () => {
    mockSupabase.order.mockResolvedValueOnce({ 
      data: [{ ...mockTasks[0], title: 'Refetched Task' }], 
      error: null 
    });

    const { result } = renderHook(() =>
      useKanbanBoard({ initialTasks: mockTasks })
    );

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
  });
});
