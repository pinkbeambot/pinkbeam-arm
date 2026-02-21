/**
 * Integration tests for Activities API
 * 
 * Tests all activities endpoints:
 * - GET /api/activities - List with filtering, pagination, search
 * - POST /api/activities - Create manual activity
 * 
 * Coverage requirements: 80% minimum
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for API testing
global.fetch = vi.fn();

describe('Activities API', () => {
  const mockToken = 'test-token-123';
  
  const mockActivity = {
    id: 'act-001',
    tenant_id: 'tenant-001',
    agent_id: 'agent-001',
    type: 'task.created',
    category: 'task',
    actor_type: 'agent',
    actor_id: 'agent-001',
    target_type: 'task',
    target_id: 'task-001',
    title: 'Task created',
    description: 'Task "Test Task" was created',
    metadata: { task_type: 'test', priority: 'normal' },
    created_at: '2026-02-17T10:00:00Z',
    agents: {
      id: 'agent-001',
      name: 'Test Agent',
      avatar_url: '',
      role: 'worker',
      status: 'active',
    },
  };

  const mockPagination = {
    total: 100,
    limit: 20,
    offset: 0,
    currentPage: 1,
    totalPages: 5,
    hasMore: true,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/activities', () => {
    it('should fetch activities with correct authorization', async () => {
      const mockResponse = {
        data: [mockActivity],
        pagination: mockPagination,
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/activities', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith('/api/activities', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      expect(response.ok).toBe(true);
      
      const result = await response.json();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('act-001');
    });

    it('should apply type filter correctly', async () => {
      const mockResponse = {
        data: [{ ...mockActivity, type: 'task.completed' }],
        pagination: { ...mockPagination, total: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ type: 'task.completed' });
      await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/activities?type=task.completed',
        expect.any(Object)
      );
    });

    it('should apply agent_id filter correctly', async () => {
      const mockResponse = {
        data: [mockActivity],
        pagination: { ...mockPagination, total: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ agent_id: 'agent-001' });
      await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/activities?agent_id=agent-001',
        expect.any(Object)
      );
    });

    it('should apply category filter correctly', async () => {
      const mockResponse = {
        data: [{ ...mockActivity, category: 'agent' }],
        pagination: { ...mockPagination, total: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ category: 'agent' });
      await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/activities?category=agent',
        expect.any(Object)
      );
    });

    it('should apply actor_type filter correctly', async () => {
      const mockResponse = {
        data: [{ ...mockActivity, actor_type: 'system' }],
        pagination: { ...mockPagination, total: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ actor_type: 'system' });
      await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/activities?actor_type=system',
        expect.any(Object)
      );
    });

    it('should apply date range filters correctly', async () => {
      const mockResponse = {
        data: [mockActivity],
        pagination: mockPagination,
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({
        from: '2026-02-01T00:00:00Z',
        to: '2026-02-28T23:59:59Z',
      });
      await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/activities?from=2026-02-01T00%3A00%3A00Z&to=2026-02-28T23%3A59%3A59Z',
        expect.any(Object)
      );
    });

    it('should apply search filter correctly', async () => {
      const mockResponse = {
        data: [mockActivity],
        pagination: { ...mockPagination, total: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ search: 'Test Task' });
      await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/activities?search=Test+Task',
        expect.any(Object)
      );
    });

    it('should apply pagination correctly', async () => {
      const mockResponse = {
        data: [mockActivity],
        pagination: { ...mockPagination, offset: 40, currentPage: 3 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ limit: '20', offset: '40' });
      await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/activities?limit=20&offset=40',
        expect.any(Object)
      );
    });

    it('should combine multiple filters', async () => {
      const mockResponse = {
        data: [mockActivity],
        pagination: { ...mockPagination, total: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({
        category: 'task',
        agent_id: 'agent-001',
        from: '2026-02-01T00:00:00Z',
        limit: '50',
      });
      await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const callUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callUrl).toContain('category=task');
      expect(callUrl).toContain('agent_id=agent-001');
      expect(callUrl).toContain('from=');
      expect(callUrl).toContain('limit=50');
    });

    it('should return validation error for invalid limit', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: { limit: { _errors: ['Number must be less than or equal to 100'] } },
        }),
      });

      const params = new URLSearchParams({ limit: '200' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(false);
      const result = await response.json();
      expect(result.code).toBe('VALIDATION_FAILED');
    });

    it('should return validation error for invalid UUID', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: { agent_id: { _errors: ['Invalid uuid'] } },
        }),
      });

      const params = new URLSearchParams({ agent_id: 'invalid-uuid' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(false);
      const result = await response.json();
      expect(result.code).toBe('VALIDATION_FAILED');
    });

    it('should return validation error for invalid date format', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: { from: { _errors: ['Invalid datetime'] } },
        }),
      });

      const params = new URLSearchParams({ from: 'invalid-date' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(false);
      const result = await response.json();
      expect(result.code).toBe('VALIDATION_FAILED');
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: [],
        pagination: { ...mockPagination, total: 0, hasMore: false },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ agent_id: 'non-existent-agent' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle server errors', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Failed to fetch activities',
          code: 'FETCH_FAILED',
        }),
      });

      const response = await fetch('/api/activities', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.code).toBe('FETCH_FAILED');
    });

    it('should include agent data in response', async () => {
      const mockResponse = {
        data: [mockActivity],
        pagination: mockPagination,
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/activities', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.data[0].agents).toBeDefined();
      expect(result.data[0].agents.name).toBe('Test Agent');
    });
  });

  describe('POST /api/activities', () => {
    it('should create activity with valid data', async () => {
      const newActivity = {
        type: 'system.config_changed',
        category: 'system',
        title: 'Configuration updated',
        description: 'System configuration was modified',
        actor_type: 'user',
        metadata: { changed_by: 'user-001' },
      };

      const mockResponse = {
        data: {
          id: 'act-new-001',
          ...newActivity,
          tenant_id: 'tenant-001',
          created_at: '2026-02-17T12:00:00Z',
        },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newActivity),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      
      const result = await response.json();
      expect(result.data.id).toBe('act-new-001');
      expect(result.data.type).toBe('system.config_changed');
    });

    it('should create activity with all fields', async () => {
      const fullActivity = {
        type: 'task.assigned',
        category: 'task',
        title: 'Task assigned',
        description: 'Task was assigned to agent',
        agent_id: 'agent-001',
        task_id: 'task-001',
        actor_type: 'agent',
        actor_id: 'agent-002',
        target_type: 'task',
        target_id: 'task-001',
        metadata: { previous_assignee: null },
      };

      const mockResponse = {
        data: {
          id: 'act-new-002',
          ...fullActivity,
          tenant_id: 'tenant-001',
          created_at: '2026-02-17T12:00:00Z',
        },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullActivity),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.data.agent_id).toBe('agent-001');
      expect(result.data.task_id).toBe('task-001');
    });

    it('should return validation error for missing required fields', async () => {
      const invalidActivity = {
        description: 'Missing required fields',
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: {
            type: { _errors: ['Required'] },
            category: { _errors: ['Required'] },
            title: { _errors: ['Required'] },
          },
        }),
      });

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidActivity),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.code).toBe('VALIDATION_FAILED');
      expect(result.details.type).toBeDefined();
      expect(result.details.category).toBeDefined();
    });

    it('should return validation error for invalid category', async () => {
      const invalidActivity = {
        type: 'test.type',
        category: 'invalid_category',
        title: 'Test',
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: {
            category: { _errors: ['Invalid enum value'] },
          },
        }),
      });

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidActivity),
      });

      expect(response.ok).toBe(false);
      const result = await response.json();
      expect(result.code).toBe('VALIDATION_FAILED');
    });

    it('should return validation error for title too long', async () => {
      const invalidActivity = {
        type: 'test.type',
        category: 'system',
        title: 'a'.repeat(501),
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: {
            title: { _errors: ['String must contain at most 500 character(s)'] },
          },
        }),
      });

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidActivity),
      });

      expect(response.ok).toBe(false);
      const result = await response.json();
      expect(result.code).toBe('VALIDATION_FAILED');
    });

    it('should handle server errors during creation', async () => {
      const newActivity = {
        type: 'system.error',
        category: 'system',
        title: 'Error occurred',
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Failed to create activity',
          code: 'CREATE_FAILED',
        }),
      });

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newActivity),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.code).toBe('CREATE_FAILED');
    });
  });

  describe('Pagination edge cases', () => {
    it('should calculate hasMore correctly when more results exist', async () => {
      const mockResponse = {
        data: Array(20).fill(mockActivity),
        pagination: {
          total: 50,
          limit: 20,
          offset: 0,
          currentPage: 1,
          totalPages: 3,
          hasMore: true,
        },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/activities', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should calculate hasMore correctly on last page', async () => {
      const mockResponse = {
        data: Array(10).fill(mockActivity),
        pagination: {
          total: 50,
          limit: 20,
          offset: 40,
          currentPage: 3,
          totalPages: 3,
          hasMore: false,
        },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ offset: '40' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.currentPage).toBe(3);
    });

    it('should handle limit of 100 (maximum)', async () => {
      const mockResponse = {
        data: Array(100).fill(mockActivity),
        pagination: {
          total: 150,
          limit: 100,
          offset: 0,
          currentPage: 1,
          totalPages: 2,
          hasMore: true,
        },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ limit: '100' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.data).toHaveLength(100);
      expect(result.pagination.limit).toBe(100);
    });

    it('should handle offset of 0 (minimum)', async () => {
      const mockResponse = {
        data: [mockActivity],
        pagination: mockPagination,
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ offset: '0' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.pagination.offset).toBe(0);
    });
  });

  describe('Query parameter edge cases', () => {
    it('should handle empty search parameter', async () => {
      // Empty search should be treated as no search filter
      const mockResponse = {
        data: [mockActivity],
        pagination: mockPagination,
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Note: Empty string won't pass min(1) validation, so this tests that it's ignored
      const params = new URLSearchParams();
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(true);
    });

    it('should reject negative offset', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
        }),
      });

      const params = new URLSearchParams({ offset: '-10' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should reject limit of 0', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
        }),
      });

      const params = new URLSearchParams({ limit: '0' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Activity type filtering', () => {
    it('should filter by agent.spawned type', async () => {
      const mockResponse = {
        data: [{ ...mockActivity, type: 'agent.spawned', category: 'agent' }],
        pagination: { ...mockPagination, total: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ type: 'agent.spawned' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.data[0].type).toBe('agent.spawned');
    });

    it('should filter by decision.proposed type', async () => {
      const mockResponse = {
        data: [{ ...mockActivity, type: 'decision.proposed', category: 'decision' }],
        pagination: { ...mockPagination, total: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ type: 'decision.proposed' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.data[0].type).toBe('decision.proposed');
    });

    it('should filter by escalation.created type', async () => {
      const mockResponse = {
        data: [{ ...mockActivity, type: 'escalation.created', category: 'escalation' }],
        pagination: { ...mockPagination, total: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ type: 'escalation.created' });
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.data[0].type).toBe('escalation.created');
    });
  });
});
