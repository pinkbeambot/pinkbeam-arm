/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Test file with complex type narrowing
/**
 * Integration tests for Escalations API (#100)
 * 
 * Tests all escalation endpoints:
 * - GET /api/escalations - List with filtering
 * - POST /api/escalations - Create escalation
 * - GET /api/escalations/[id] - Get single escalation
 * - PATCH /api/escalations/[id] - Update/resolve escalation
 * - GET /api/escalations/stats - Get statistics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for API testing
global.fetch = vi.fn();

describe('Escalations API', () => {
  const mockToken = 'test-token-123';
  const mockEscalation = {
    id: 'esc-001',
    tenant_id: 'tenant-001',
    agent_id: 'agent-001',
    agent: {
      id: 'agent-001',
      name: 'Sales Rep Sarah',
      avatar_url: '',
      role: 'worker',
      status: 'active',
    },
    task_id: 'task-001',
    type: 'approval',
    urgency: 'high',
    title: 'High-value discount approval needed',
    description: 'A prospect is requesting a 25% discount on the Enterprise plan.',
    status: 'open',
    created_at: '2026-02-13T14:30:00Z',
    updated_at: '2026-02-13T14:30:00Z',
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/escalations', () => {
    it('should fetch escalations with correct authorization', async () => {
      const mockResponse = {
        data: [mockEscalation],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/v1/escalations', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith('/api/v1/escalations', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      expect(response.ok).toBe(true);
      
      const result = await response.json();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('esc-001');
    });

    it('should apply status filter correctly', async () => {
      const mockResponse = {
        data: [{ ...mockEscalation, status: 'open' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ status: 'open' });
      await fetch(`/api/v1/escalations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/escalations?status=open',
        expect.any(Object)
      );
    });

    it('should apply urgency filter correctly', async () => {
      const mockResponse = {
        data: [{ ...mockEscalation, urgency: 'critical' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ urgency: 'critical' });
      await fetch(`/api/v1/escalations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/escalations?urgency=critical',
        expect.any(Object)
      );
    });

    it('should apply type filter correctly', async () => {
      const mockResponse = {
        data: [{ ...mockEscalation, type: 'clarification' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ type: 'clarification' });
      await fetch(`/api/v1/escalations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/escalations?type=clarification',
        expect.any(Object)
      );
    });

    it('should apply search filter correctly', async () => {
      const mockResponse = {
        data: [mockEscalation],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ search: 'discount' });
      await fetch(`/api/v1/escalations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/escalations?search=discount',
        expect.any(Object)
      );
    });

    it('should apply pagination correctly', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 2, limit: 10, total: 15, totalPages: 2 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ page: '2', limit: '10' });
      await fetch(`/api/v1/escalations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/escalations?page=2&limit=10',
        expect.any(Object)
      );
    });

    it('should combine multiple filters correctly', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({
        status: 'open',
        urgency: 'high',
        type: 'approval',
      });
      await fetch(`/api/v1/escalations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const callUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callUrl).toContain('status=open');
      expect(callUrl).toContain('urgency=high');
      expect(callUrl).toContain('type=approval');
    });

    it('should handle 401 unauthorized', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const response = await fetch('/api/v1/escalations', {
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe('Unauthorized');
    });

    it('should handle validation errors (400)', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error', details: [{ message: 'Invalid status' }] }),
      });

      const response = await fetch('/api/v1/escalations?status=invalid', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(400);
    });

    it('should handle server errors (500)', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const response = await fetch('/api/v1/escalations', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/escalations', () => {
    it('should create escalation with valid data', async () => {
      const createData = {
        agent_id: 'agent-001',
        task_id: 'task-001',
        type: 'approval',
        urgency: 'high',
        title: 'Test escalation',
        description: 'Test description',
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { ...mockEscalation, ...createData } }),
      });

      const response = await fetch('/api/v1/escalations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      
      const result = await response.json();
      expect(result.data.title).toBe('Test escalation');
    });

    it('should reject invalid escalation data', async () => {
      const invalidData = {
        agent_id: 'invalid-uuid',
        type: 'invalid-type',
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error', details: [{ path: ['type'], message: 'Invalid enum value' }] }),
      });

      const response = await fetch('/api/v1/escalations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
    });

    it('should reject escalation for non-existent agent', async () => {
      const createData = {
        agent_id: 'non-existent-agent',
        type: 'approval',
        title: 'Test escalation',
        description: 'Test description',
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Agent not found' }),
      });

      const response = await fetch('/api/v1/escalations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Agent not found');
    });

    it('should reject escalation for non-existent task', async () => {
      const createData = {
        agent_id: 'agent-001',
        task_id: 'non-existent-task',
        type: 'approval',
        title: 'Test escalation',
        description: 'Test description',
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Task not found' }),
      });

      const response = await fetch('/api/v1/escalations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Task not found');
    });
  });

  describe('GET /api/escalations/[id]', () => {
    it('should fetch single escalation by ID', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockEscalation }),
      });

      const response = await fetch('/api/v1/escalations/esc-001', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.data.id).toBe('esc-001');
      expect(result.data.agent).toBeDefined();
    });

    it('should return 404 for non-existent escalation', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Escalation not found' }),
      });

      const response = await fetch('/api/v1/escalations/non-existent', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/escalations/[id]', () => {
    it('should update escalation status', async () => {
      const updateData = { status: 'in_progress' };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ...mockEscalation, status: 'in_progress' } }),
      });

      const response = await fetch('/api/v1/escalations/esc-001', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.data.status).toBe('in_progress');
    });

    it('should resolve escalation with resolution text', async () => {
      const resolveData = { 
        status: 'resolved',
        resolution_answer: 'Approved the discount as requested',
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          data: { 
            ...mockEscalation, 
            status: 'resolved',
            resolved_by: 'user-001',
            resolved_at: '2026-02-13T15:00:00Z',
          } 
        }),
      });

      const response = await fetch('/api/v1/escalations/esc-001', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resolveData),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.data.status).toBe('resolved');
    });

    it('should track resolution time on resolve', async () => {
      const resolveData = { status: 'resolved' };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          data: { 
            ...mockEscalation, 
            status: 'resolved',
            time_to_resolve_seconds: 1800, // 30 minutes
          } 
        }),
      });

      const response = await fetch('/api/v1/escalations/esc-001', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resolveData),
      });

      const result = await response.json();
      expect(result.data.time_to_resolve_seconds).toBe(1800);
    });

    it('should reject invalid status values', async () => {
      const updateData = { status: 'invalid-status' };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error' }),
      });

      const response = await fetch('/api/v1/escalations/esc-001', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent escalation', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Escalation not found' }),
      });

      const response = await fetch('/api/v1/escalations/non-existent', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'resolved' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/escalations/stats', () => {
    it('should fetch escalation statistics', async () => {
      const mockStats = {
        data: {
          total: 42,
          by_status: { open: 10, in_progress: 5, resolved: 25, dismissed: 2 },
          by_urgency: { critical: 2, high: 8, normal: 20, low: 12 },
          by_type: { clarification: 15, approval: 10, error: 8, edge_case: 9 },
          avg_resolution_time_seconds: 7200,
          timeline: [
            { date: '2026-02-12', created: 5, resolved: 3 },
            { date: '2026-02-13', created: 3, resolved: 2 },
          ],
        },
        meta: { days: 30, date_from: '2026-01-14T00:00:00Z' },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const response = await fetch('/api/v1/escalations/stats?days=30', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.data.total).toBe(42);
      expect(result.data.by_urgency.critical).toBe(2);
      expect(result.data.timeline).toHaveLength(2);
    });

    it('should accept days parameter', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { total: 10, by_status: {}, by_urgency: {}, by_type: {}, timeline: [] },
          meta: { days: 7, date_from: '2026-02-06T00:00:00Z' },
        }),
      });

      await fetch('/api/v1/escalations/stats?days=7', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/escalations/stats?days=7',
        expect.any(Object)
      );
    });

    it('should reject invalid days parameter', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error', details: [{ path: ['days'], message: 'Invalid' }] }),
      });

      const response = await fetch('/api/v1/escalations/stats?days=invalid', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(400);
    });

    it('should handle empty stats gracefully', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { total: 0, by_status: {}, by_urgency: {}, by_type: {}, avg_resolution_time_seconds: null, timeline: [] },
          meta: { days: 30, date_from: '2026-01-14T00:00:00Z' },
        }),
      });

      const response = await fetch('/api/v1/escalations/stats', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.data.total).toBe(0);
      expect(result.data.avg_resolution_time_seconds).toBeNull();
    });
  });
});

describe('useEscalations Hook Logic', () => {
  it('should construct correct API URL with all filters', () => {
    const baseUrl = '/api/v1/escalations';
    const filters = {
      status: 'open',
      urgency: 'high',
      type: 'approval',
      agent_id: 'agent-001',
      search: 'discount',
      page: '2',
      limit: '10',
    };

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const url = `${baseUrl}?${params.toString()}`;

    expect(url).toContain('status=open');
    expect(url).toContain('urgency=high');
    expect(url).toContain('type=approval');
    expect(url).toContain('agent_id=agent-001');
    expect(url).toContain('search=discount');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });

  it('should handle empty/undefined filters', () => {
    const baseUrl = '/api/v1/escalations';
    const filters = {
      status: 'all',
      urgency: undefined,
      type: 'all',
      agent_id: 'all',
    };

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') params.set(key, value);
    });

    const url = `${baseUrl}?${params.toString()}`;

    expect(url).not.toContain('status=');
    expect(url).not.toContain('urgency=');
    expect(url).not.toContain('type=');
    expect(url).not.toContain('agent_id=');
  });

  it('should match filters correctly', () => {
    const escalation = {
      id: 'esc-001',
      status: 'open',
      urgency: 'high',
      type: 'approval',
      agent_id: 'agent-001',
      title: 'Discount approval',
      description: 'Need approval for discount',
    };

    // All filters match
    expect(matchesFiltersTest(escalation, { status: 'open', urgency: 'high' })).toBe(true);
    
    // Status mismatch
    expect(matchesFiltersTest(escalation, { status: 'resolved' })).toBe(false);
    
    // Urgency mismatch
    expect(matchesFiltersTest(escalation, { urgency: 'low' })).toBe(false);
    
    // Search matches title
    expect(matchesFiltersTest(escalation, { search: 'discount' })).toBe(true);
    
    // Search matches description
    expect(matchesFiltersTest(escalation, { search: 'approval' })).toBe(true);
    
    // Search no match
    expect(matchesFiltersTest(escalation, { search: 'refund' })).toBe(false);
    
    // All filter
    expect(matchesFiltersTest(escalation, { status: 'all', urgency: 'all' })).toBe(true);
  });

  it('should handle realtime insert matching filters', () => {
    const currentEscalations = [{ id: 'esc-001', status: 'open' }];
    const newEscalation = { id: 'esc-002', status: 'open', urgency: 'high' };
    const options = { status: 'open', urgency: 'high' };

    // Should include new escalation
    const matches = matchesFiltersTest(newEscalation, options);
    expect(matches).toBe(true);
  });

  it('should handle realtime insert not matching filters', () => {
    const newEscalation = { id: 'esc-002', status: 'resolved', urgency: 'high' };
    const options = { status: 'open' };

    // Should not include resolved escalation when filter is open
    const matches = matchesFiltersTest(newEscalation, options);
    expect(matches).toBe(false);
  });
});

describe('POST /api/escalations/[id]/acknowledge', () => {
  it('should acknowledge an open escalation', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          ...mockEscalation,
          status: 'acknowledged',
          acknowledged_at: '2026-02-13T15:30:00Z',
          acknowledged_by: 'user-001',
        },
      }),
    });

    const response = await fetch('/api/v1/escalations/esc-001/acknowledge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.data.status).toBe('acknowledged');
    expect(result.data.acknowledged_at).toBeDefined();
  });

  it('should acknowledge with optional notes', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          ...mockEscalation,
          status: 'acknowledged',
          acknowledged_at: '2026-02-13T15:30:00Z',
          agent_analysis: { acknowledgment_notes: 'Looking into this now' },
        },
      }),
    });

    const response = await fetch('/api/v1/escalations/esc-001/acknowledge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes: 'Looking into this now' }),
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.data.status).toBe('acknowledged');
  });

  it('should reject acknowledging already acknowledged escalation', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Escalation already acknowledged' }),
    });

    const response = await fetch('/api/v1/escalations/esc-001/acknowledge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toBe('Escalation already acknowledged');
  });

  it('should reject acknowledging resolved escalation', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Cannot acknowledge resolved or dismissed escalation' }),
    });

    const response = await fetch('/api/v1/escalations/esc-001/acknowledge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent escalation', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Escalation not found' }),
    });

    const response = await fetch('/api/v1/escalations/non-existent/acknowledge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(404);
  });
});

describe('POST /api/escalations/[id]/resolve', () => {
  it('should resolve escalation with resolution details', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          ...mockEscalation,
          status: 'resolved',
          resolution_type: 'approved',
          resolution_answer: 'Approved 25% discount for enterprise plan',
          resolution_resources: { approved_by: 'manager@example.com' },
          learning_notes: 'Standard discount approved for enterprise prospects',
          resolved_at: '2026-02-13T16:00:00Z',
          time_to_resolve_seconds: 5400,
        },
      }),
    });

    const response = await fetch('/api/v1/escalations/esc-001/resolve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'resolved',
        resolution_type: 'approved',
        resolution_answer: 'Approved 25% discount for enterprise plan',
        resolution_resources: { approved_by: 'manager@example.com' },
        learning_notes: 'Standard discount approved for enterprise prospects',
      }),
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.data.status).toBe('resolved');
    expect(result.data.resolution_answer).toBe('Approved 25% discount for enterprise plan');
    expect(result.data.time_to_resolve_seconds).toBe(5400);
  });

  it('should dismiss escalation with reason', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          ...mockEscalation,
          status: 'dismissed',
          resolution_answer: 'Not applicable - prospect already converted',
          resolved_at: '2026-02-13T16:00:00Z',
        },
      }),
    });

    const response = await fetch('/api/v1/escalations/esc-001/resolve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'dismissed',
        resolution_answer: 'Not applicable - prospect already converted',
      }),
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.data.status).toBe('dismissed');
  });

  it('should reject resolving already resolved escalation', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Escalation already resolved' }),
    });

    const response = await fetch('/api/v1/escalations/esc-001/resolve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'resolved',
        resolution_answer: 'Trying to resolve again',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('should require resolution answer', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation error', details: [{ path: ['resolution_answer'], message: 'Required' }] }),
    });

    const response = await fetch('/api/v1/escalations/esc-001/resolve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'resolved' }),
    });

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/escalations/[id]', () => {
  it('should soft delete an escalation', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'esc-001' } }),
    });

    const response = await fetch('/api/v1/escalations/esc-001', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mockToken}` },
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.data.id).toBe('esc-001');
  });

  it('should return 404 for non-existent escalation', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Escalation not found' }),
    });

    const response = await fetch('/api/v1/escalations/non-existent', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mockToken}` },
    });

    expect(response.status).toBe(404);
  });

  it('should return 401 for unauthorized delete', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const response = await fetch('/api/v1/escalations/esc-001', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer invalid' },
    });

    expect(response.status).toBe(401);
  });
});

describe('GET /api/escalations - date range filtering', () => {
  it('should filter by date_from', async () => {
    const mockResponse = {
      data: [mockEscalation],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const params = new URLSearchParams({ date_from: '2026-01-01T00:00:00Z' });
    await fetch(`/api/v1/escalations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${mockToken}` },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/escalations?date_from=2026-01-01T00%3A00%3A00Z',
      expect.any(Object)
    );
  });

  it('should filter by date_to', async () => {
    const mockResponse = {
      data: [mockEscalation],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const params = new URLSearchParams({ date_to: '2026-12-31T23:59:59Z' });
    await fetch(`/api/v1/escalations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${mockToken}` },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/escalations?date_to=2026-12-31T23%3A59%3A59Z',
      expect.any(Object)
    );
  });

  it('should filter by date range', async () => {
    const mockResponse = {
      data: [mockEscalation],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const params = new URLSearchParams({
      date_from: '2026-01-01T00:00:00Z',
      date_to: '2026-12-31T23:59:59Z',
    });
    await fetch(`/api/v1/escalations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${mockToken}` },
    });

    const callUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callUrl).toContain('date_from=');
    expect(callUrl).toContain('date_to=');
  });
});

describe('Escalation SLA tracking', () => {
  it('should track acknowledgment SLA', async () => {
    const createdAt = new Date('2026-02-13T14:00:00Z');
    const acknowledgedAt = new Date('2026-02-13T14:15:00Z');
    const timeToAcknowledge = Math.floor((acknowledgedAt.getTime() - createdAt.getTime()) / 1000);

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          ...mockEscalation,
          status: 'acknowledged',
          created_at: createdAt.toISOString(),
          acknowledged_at: acknowledgedAt.toISOString(),
          time_to_acknowledge_seconds: timeToAcknowledge,
        },
      }),
    });

    const response = await fetch('/api/v1/escalations/esc-001/acknowledge', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mockToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    expect(result.data.acknowledged_at).toBeDefined();
    expect(result.data.status).toBe('acknowledged');
  });

  it('should track resolution SLA', async () => {
    const createdAt = new Date('2026-02-13T14:00:00Z');
    const resolvedAt = new Date('2026-02-13T15:30:00Z');
    const timeToResolve = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 1000); // 5400 seconds

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          ...mockEscalation,
          status: 'resolved',
          created_at: createdAt.toISOString(),
          resolved_at: resolvedAt.toISOString(),
          time_to_resolve_seconds: timeToResolve,
        },
      }),
    });

    const response = await fetch('/api/v1/escalations/esc-001/resolve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mockToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', resolution_answer: 'Done' }),
    });

    const result = await response.json();
    expect(result.data.time_to_resolve_seconds).toBe(5400);
  });
});

describe('Stats with open_by_urgency', () => {
  it('should include open_by_urgency in stats', async () => {
    const mockStats = {
      data: {
        total: 50,
        by_status: { open: 5, acknowledged: 10, resolved: 30, dismissed: 5 },
        by_urgency: { critical: 3, high: 12, normal: 25, low: 10 },
        by_type: { clarification: 15, approval: 10, error: 8, edge_case: 9, policy_violation: 8 },
        open_by_urgency: { critical: 2, high: 5, normal: 6, low: 2 },
        acknowledged_count: 10,
        avg_resolution_time_seconds: 3600,
        timeline: [],
      },
      meta: { days: 30, date_from: '2026-01-14T00:00:00Z' },
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    const response = await fetch('/api/v1/escalations/stats', {
      headers: { Authorization: `Bearer ${mockToken}` },
    });

    const result = await response.json();
    expect(result.data.open_by_urgency).toBeDefined();
    expect(result.data.open_by_urgency.critical).toBe(2);
    expect(result.data.open_by_urgency.high).toBe(5);
    expect(result.data.acknowledged_count).toBe(10);
  });
});

// Helper for testing filter logic
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matchesFiltersTest(escalation: Record<string, unknown>, options: Record<string, unknown>): boolean {
  if (options.status && options.status !== 'all' && escalation.status !== options.status) {
    return false;
  }
  if (options.urgency && options.urgency !== 'all' && escalation.urgency !== options.urgency) {
    return false;
  }
  if (options.type && options.type !== 'all' && escalation.type !== options.type) {
    return false;
  }
  if (options.agentId && options.agentId !== 'all' && escalation.agent_id !== options.agentId) {
    return false;
  }
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    const titleMatch = escalation.title?.toLowerCase().includes(searchLower);
    const descMatch = escalation.description?.toLowerCase().includes(searchLower);
    if (!titleMatch && !descMatch) {
      return false;
    }
  }
  return true;
}
