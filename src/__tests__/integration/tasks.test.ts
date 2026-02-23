/**
 * Integration tests for Tasks API
 *
 * Tests the full task lifecycle including:
 * - Creating tasks with and without dependencies
 * - Listing tasks with filters (status, priority, assignee, search)
 * - Getting single task details with dependencies
 * - Updating tasks (status, assignment, dependencies)
 * - Task dependencies (add/remove)
 * - Task assignment/unassignment
 * - Validation and error handling
 * - Circular dependency prevention
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Tasks API', () => {
  const mockTenantId = 'test-tenant-id';
  const mockToken = 'test-token';
  const mockAgentId = 'agent-123';
  const mockTaskId = 'task-456';
  const mockDependencyId = 'task-dep-789';

  const mockTask = {
    id: mockTaskId,
    tenant_id: mockTenantId,
    title: 'Test Task',
    description: 'Test description',
    status: 'queued',
    priority: 'normal',
    assignee_id: mockAgentId,
    assigner_id: 'user-123',
    type: 'generic',
    progress_percent: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTaskDependency = {
    id: 'dep-123',
    tenant_id: mockTenantId,
    task_id: mockTaskId,
    depends_on_task_id: mockDependencyId,
    dependency_type: 'blocks',
    created_at: new Date().toISOString(),
    depends_on: {
      id: mockDependencyId,
      title: 'Dependency Task',
      status: 'in_progress',
      priority: 'high',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('GET /api/tasks', () => {
    it('should list tasks with default pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockTask],
          meta: {
            filters: {},
            sort: { field: 'created_at', order: 'desc' },
          },
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('Test Task');
      expect(data.pagination.total).toBe(1);
    });

    it('should filter tasks by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ ...mockTask, status: 'in_progress' }],
          meta: {
            filters: { status: 'in_progress' },
            sort: { field: 'created_at', order: 'desc' },
          },
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch('/api/tasks?status=in_progress', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data[0].status).toBe('in_progress');
      expect(data.meta.filters.status).toBe('in_progress');
    });

    it('should filter tasks by multiple statuses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockTask, { ...mockTask, id: 'task-2', status: 'in_progress' }],
          meta: {
            filters: { status: ['queued', 'in_progress'] },
            sort: { field: 'created_at', order: 'desc' },
          },
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      });

      const response = await fetch('/api/tasks?status=queued,in_progress', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data).toHaveLength(2);
    });

    it('should filter tasks by priority', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ ...mockTask, priority: 'high' }],
          meta: {
            filters: { priority: 'high' },
            sort: { field: 'created_at', order: 'desc' },
          },
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch('/api/tasks?priority=high', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data[0].priority).toBe('high');
    });

    it('should filter tasks by assignee_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockTask],
          meta: {
            filters: { agent_id: mockAgentId },
            sort: { field: 'created_at', order: 'desc' },
          },
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch(`/api/tasks?assignee_id=${mockAgentId}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data[0].assignee_id).toBe(mockAgentId);
    });

    it('should search tasks by title and description', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockTask],
          meta: {
            filters: { search: 'Test' },
            sort: { field: 'created_at', order: 'desc' },
          },
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch('/api/tasks?search=Test', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.meta.filters.search).toBe('Test');
      expect(data.data).toHaveLength(1);
    });

    it('should sort tasks by priority', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { ...mockTask, priority: 'urgent' },
            { ...mockTask, id: 'task-2', priority: 'high' },
            { ...mockTask, id: 'task-3', priority: 'normal' },
          ],
          meta: {
            filters: {},
            sort: { field: 'priority', order: 'desc' },
          },
          pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
        }),
      });

      const response = await fetch('/api/tasks?sort=priority&order=desc', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.meta.sort.field).toBe('priority');
      expect(data.meta.sort.order).toBe('desc');
    });

    it('should return 401 without authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const response = await fetch('/api/tasks');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task with basic fields', async () => {
      const newTask = {
        title: 'New Task',
        description: 'New description',
        priority: 'high',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { ...mockTask, ...newTask } }),
      });

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify(newTask),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.title).toBe('New Task');
      expect(data.data.priority).toBe('high');
    });

    it('should create a task with assignee_id', async () => {
      const newTask = {
        title: 'Assigned Task',
        assignee_id: mockAgentId,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: { ...mockTask, ...newTask, assignee: { id: mockAgentId, name: 'Test Agent' } },
        }),
      });

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify(newTask),
      });
      const data = await response.json();

      expect(data.data.assignee_id).toBe(mockAgentId);
      expect(data.data.assignee).toBeDefined();
    });

    it('should create a task with parent_task_id', async () => {
      const parentId = 'parent-task-123';
      const newTask = {
        title: 'Child Task',
        parent_task_id: parentId,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: { ...mockTask, ...newTask, depth: 1 },
        }),
      });

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify(newTask),
      });
      const data = await response.json();

      expect(data.data.parent_task_id).toBe(parentId);
      expect(data.data.depth).toBe(1);
    });

    it('should validate required title field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error', details: [{ path: ['title'], message: 'Title is required' }] }),
      });

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ description: 'Missing title' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should reject invalid assignee_id format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error', details: [{ path: ['assignee_id'], message: 'Invalid assignee ID format' }] }),
      });

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ title: 'Test', assignee_id: 'invalid-uuid' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/tasks/[id]', () => {
    it('should get a single task with all related data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ...mockTask,
            assignee: { id: mockAgentId, name: 'Test Agent', avatar_url: null },
            dependencies: [mockTaskDependency],
            blocked_by: [],
            decisions: [],
            escalations: [],
            activity_history: [],
          },
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data.id).toBe(mockTaskId);
      expect(data.data.assignee).toBeDefined();
      expect(data.data.dependencies).toBeDefined();
    });

    it('should return 404 for non-existent task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Task not found' }),
      });

      const response = await fetch('/api/tasks/non-existent', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/tasks/[id]', () => {
    it('should update task status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockTask, status: 'in_progress', started_at: new Date().toISOString() },
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      const data = await response.json();

      expect(data.data.status).toBe('in_progress');
      expect(data.data.started_at).toBeDefined();
    });

    it('should update task assignee', async () => {
      const newAssigneeId = 'agent-456';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockTask, assignee_id: newAssigneeId },
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ assignee_id: newAssigneeId }),
      });
      const data = await response.json();

      expect(data.data.assignee_id).toBe(newAssigneeId);
    });

    it('should unassign task by setting assignee_id to null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockTask, assignee_id: null },
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ assignee_id: null }),
      });
      const data = await response.json();

      expect(data.data.assignee_id).toBeNull();
    });

    it('should reject invalid status transitions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid status transition from completed to queued' }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ status: 'queued' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/tasks/[id]/dependencies', () => {
    it('should add a dependency to a task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: mockTaskDependency,
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          depends_on_task_id: mockDependencyId,
          dependency_type: 'blocks',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.depends_on_task_id).toBe(mockDependencyId);
      expect(data.data.dependency_type).toBe('blocks');
    });

    it('should prevent self-dependency', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'A task cannot depend on itself' }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          depends_on_task_id: mockTaskId, // Same as task id
          dependency_type: 'blocks',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should prevent circular dependencies', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Circular dependency detected' }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          depends_on_task_id: mockDependencyId,
          dependency_type: 'blocks',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 409 for duplicate dependencies', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Dependency already exists' }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          depends_on_task_id: mockDependencyId,
          dependency_type: 'blocks',
        }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/tasks/[id]/dependencies', () => {
    it('should get all dependencies for a task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: mockTaskId,
            dependencies: [mockTaskDependency],
            dependents: [],
          },
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/dependencies`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data.task_id).toBe(mockTaskId);
      expect(data.data.dependencies).toHaveLength(1);
    });

    it('should include both dependencies and dependents', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: mockTaskId,
            dependencies: [mockTaskDependency],
            dependents: [
              {
                id: 'dep-456',
                task_id: 'task-dependent-123',
                depends_on_task_id: mockTaskId,
                dependency_type: 'blocks',
                dependent_task: { id: 'task-dependent-123', title: 'Dependent Task' },
              },
            ],
          },
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/dependencies`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data.dependencies).toHaveLength(1);
      expect(data.data.dependents).toHaveLength(1);
    });
  });

  describe('DELETE /api/tasks/[id]/dependencies', () => {
    it('should remove a dependency by dependency_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Dependency removed successfully',
          count: 1,
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/dependencies?dependency_id=dep-123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.message).toBe('Dependency removed successfully');
    });

    it('should remove a dependency by depends_on_task_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Dependency removed successfully',
          count: 1,
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/dependencies?depends_on_task_id=${mockDependencyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.message).toBe('Dependency removed successfully');
    });

    it('should require dependency_id or depends_on_task_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Either dependency_id or depends_on_task_id is required' }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/dependencies`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/tasks/[id]/assign', () => {
    it('should assign task to agent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockTask, assignee_id: mockAgentId },
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ assignee_id: mockAgentId }),
      });
      const data = await response.json();

      expect(data.data.assignee_id).toBe(mockAgentId);
    });

    it('should reject assignment to terminated agent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Cannot assign task to agent with status 'terminated'" }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ assignee_id: 'terminated-agent-123' }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject assignment of completed tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Cannot assign task that is completed' }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ assignee_id: mockAgentId }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/tasks/[id]/assign', () => {
    it('should unassign task from agent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockTask, assignee_id: null, status: 'blocked' },
        }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/assign`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data.assignee_id).toBeNull();
    });

    it('should return 400 if task is not assigned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Task is not currently assigned to any agent' }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}/assign`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/tasks/[id]', () => {
    it('should delete a task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Task deleted successfully', id: mockTaskId }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.id).toBe(mockTaskId);
    });

    it('should prevent deletion of in_progress tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Cannot delete task that is in progress' }),
      });

      const response = await fetch(`/api/tasks/${mockTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('useTasks Hook Logic', () => {
    it('should construct proper URL with all filters', () => {
      const filters = {
        status: 'in_progress',
        priority: 'high',
        assignee_id: mockAgentId,
        search: 'important',
      };

      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.assignee_id) params.set('assignee_id', filters.assignee_id);
      if (filters.search) params.set('search', filters.search);

      const url = `/api/tasks?${params.toString()}`;

      expect(url).toContain('status=in_progress');
      expect(url).toContain('priority=high');
      expect(url).toContain(`assignee_id=${mockAgentId}`);
      expect(url).toContain('search=important');
    });

    it('should handle date range filters', () => {
      const dueBefore = '2026-02-28T00:00:00Z';
      const dueAfter = '2026-02-01T00:00:00Z';

      const params = new URLSearchParams();
      params.set('due_before', dueBefore);
      params.set('due_after', dueAfter);

      const url = `/api/tasks?${params.toString()}`;

      expect(url).toContain(`due_before=${encodeURIComponent(dueBefore)}`);
      expect(url).toContain(`due_after=${encodeURIComponent(dueAfter)}`);
    });

    it('should handle sorting parameters', () => {
      const sort = 'deadline_at';
      const order = 'asc';
      const page = 2;
      const limit = 50;

      const params = new URLSearchParams();
      params.set('sort', sort);
      params.set('order', order);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const url = `/api/tasks?${params.toString()}`;

      expect(url).toContain('sort=deadline_at');
      expect(url).toContain('order=asc');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=50');
    });
  });
});
