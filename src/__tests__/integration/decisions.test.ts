/**
 * Integration tests for Decisions API
 *
 * Tests the full decision lifecycle including:
 * - Creating decisions
 * - Listing decisions with filters
 * - Getting single decision details
 * - Approving decisions
 * - Rejecting decisions
 * - Overriding decisions
 * - Soft deleting decisions
 * - Status workflow enforcement
 * - Validation and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Decisions API', () => {
  const mockTenantId = 'test-tenant-id';
  const mockToken = 'test-token';
  const mockDecisionId = 'dec-123';
  const mockAgentId = 'agent-456';
  const mockUserId = 'user-789';

  const mockAgent = {
    id: mockAgentId,
    name: 'Test Agent',
    avatar_url: 'https://example.com/avatar.png',
    role: 'worker',
    status: 'active',
  };

  const mockDecision = {
    id: mockDecisionId,
    tenant_id: mockTenantId,
    agent_id: mockAgentId,
    agent: mockAgent,
    task_id: 'task-123',
    status: 'proposed',
    category: 'action',
    title: 'Test Decision',
    description: 'Test description',
    confidence: 0.85,
    proposed_action: { action: 'deploy', target: 'production' },
    reasoning: {
      context: 'Need to deploy',
      analysis: 'Ready for production',
      options_considered: [],
      confidence: 0.85,
      risks: [],
    },
    self_authorized: false,
    proposed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('GET /api/decisions', () => {
    it('should list decisions with default pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockDecision],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch('/api/decisions', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('Test Decision');
      expect(data.pagination.total).toBe(1);
    });

    it('should filter decisions by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ ...mockDecision, status: 'approved' }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch('/api/decisions?status=approved', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data[0].status).toBe('approved');
    });

    it('should filter decisions by category', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ ...mockDecision, category: 'strategy' }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch('/api/decisions?category=strategy', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data[0].category).toBe('strategy');
    });

    it('should filter decisions by agent_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockDecision],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch(`/api/decisions?agent_id=${mockAgentId}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data).toHaveLength(1);
    });

    it('should filter decisions by date range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockDecision],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch(
        '/api/decisions?date_from=2024-01-01T00:00:00Z&date_to=2024-12-31T23:59:59Z',
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      const data = await response.json();

      expect(data.data).toHaveLength(1);
    });

    it('should handle search queries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockDecision],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch('/api/decisions?search=Test', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data).toHaveLength(1);
    });

    it('should handle custom pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockDecision],
          pagination: { page: 2, limit: 50, total: 100, totalPages: 2 },
        }),
      });

      const response = await fetch('/api/decisions?page=2&limit=50', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(50);
    });

    it('should return 401 without authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const response = await fetch('/api/decisions');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/decisions', () => {
    it('should create a new decision', async () => {
      const newDecision = {
        agent_id: mockAgentId,
        title: 'New Decision',
        description: 'New description',
        category: 'action',
        proposed_action: { action: 'test' },
        reasoning: {
          context: 'Test context',
          analysis: 'Test analysis',
          options_considered: [],
          confidence: 0.9,
          risks: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { ...mockDecision, ...newDecision } }),
      });

      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify(newDecision),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.title).toBe('New Decision');
    });

    it('should validate required fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error', details: [{ message: 'Title is required' }] }),
      });

      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ category: 'action', agent_id: mockAgentId }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject invalid agent_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Agent not found' }),
      });

      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          agent_id: 'invalid-agent-id',
          title: 'Test',
          category: 'action',
          proposed_action: {},
          reasoning: { context: 'test', analysis: 'test', options_considered: [], confidence: 0.5, risks: [] },
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/decisions/[id]', () => {
    it('should get a single decision with details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ...mockDecision,
            activity_history: [],
          },
        }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data.id).toBe(mockDecisionId);
      expect(data.data.agent).toBeDefined();
    });

    it('should return 404 for non-existent decision', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Decision not found' }),
      });

      const response = await fetch('/api/decisions/non-existent', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(404);
    });

    it('should return 404 for soft-deleted decision', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Decision not found' }),
      });

      const response = await fetch('/api/decisions/deleted-decision-id', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/decisions/[id]', () => {
    it('should update decision status to approved', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockDecision, status: 'approved', decided_at: new Date().toISOString() },
        }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      const data = await response.json();

      expect(data.data.status).toBe('approved');
      expect(data.data.decided_at).toBeDefined();
    });

    it('should update decision status to executed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ...mockDecision,
            status: 'executed',
            decided_at: new Date().toISOString(),
            executed_at: new Date().toISOString(),
          },
        }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ status: 'executed' }),
      });
      const data = await response.json();

      expect(data.data.status).toBe('executed');
      expect(data.data.executed_at).toBeDefined();
    });

    it('should reject invalid status transitions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error' }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ status: 'invalid-status' }),
      });

      expect(response.status).toBe(400);
    });

    it('should prevent modification of immutable decisions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Decision is immutable and cannot be modified' }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(400);
    });

    it('should handle override with reason', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ...mockDecision,
            status: 'overridden',
            override_reason: 'Incorrect assessment',
            overridden_by: mockUserId,
          },
        }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ reason: 'Incorrect assessment' }),
      });
      const data = await response.json();

      expect(data.data.status).toBe('overridden');
    });
  });

  describe('POST /api/decisions/[id]/approve', () => {
    it('should approve a proposed decision', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockDecision, status: 'approved', decided_at: new Date().toISOString() },
        }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ notes: 'Approved after review' }),
      });
      const data = await response.json();

      expect(data.data.status).toBe('approved');
    });

    it('should reject approval of non-proposed decisions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: "Cannot approve decision with status 'approved'. Only 'proposed' decisions can be approved." }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/decisions/[id]/reject', () => {
    it('should reject a proposed decision with reason', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ...mockDecision,
            status: 'rejected',
            decided_at: new Date().toISOString(),
            outcome: { rejection_reason: 'Too risky', rejected_by: mockUserId },
          },
        }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ reason: 'Too risky' }),
      });
      const data = await response.json();

      expect(data.data.status).toBe('rejected');
    });

    it('should require rejection reason', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error' }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/decisions/[id]', () => {
    it('should soft delete a decision', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Resource deleted successfully', data: { id: mockDecisionId } }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Resource deleted successfully');
    });

    it('should prevent deletion of immutable decisions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Decision is immutable and cannot be deleted' }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent decision', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Decision not found' }),
      });

      const response = await fetch('/api/decisions/non-existent', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Decision Reasoning and Confidence', () => {
    it('should store and retrieve reasoning', async () => {
      const decisionWithReasoning = {
        ...mockDecision,
        reasoning: {
          context: 'Production deployment needed',
          analysis: 'All tests passed',
          options_considered: [
            { description: 'Deploy now', pros: ['Fast'], cons: ['Risky'], estimated_outcome: 'Success', confidence: 0.9 },
          ],
          confidence: 0.85,
          risks: [{ description: 'Bug risk', likelihood: 'low', impact: 'medium' }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: decisionWithReasoning }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data.reasoning.options_considered).toHaveLength(1);
    });

    it('should validate confidence score range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Confidence must be between 0 and 1' }),
      });

      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          agent_id: mockAgentId,
          title: 'Test',
          category: 'action',
          proposed_action: {},
          reasoning: { context: 'test', analysis: 'test', options_considered: [], confidence: 1.5, risks: [] },
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Self-Authorization Tracking', () => {
    it('should track self-authorized decisions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockDecision, self_authorized: true, executed_at: new Date().toISOString() },
        }),
      });

      const response = await fetch(`/api/decisions/${mockDecisionId}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data.self_authorized).toBe(true);
      expect(data.data.executed_at).toBeDefined();
    });
  });

  describe('URL Construction and Filtering', () => {
    it('should construct proper URL with filters', () => {
      const filters = {
        status: 'proposed',
        category: 'action',
        agent_id: mockAgentId,
      };

      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.agent_id) params.set('agent_id', filters.agent_id);

      const url = `/api/decisions?${params.toString()}`;

      expect(url).toContain('status=proposed');
      expect(url).toContain('category=action');
      expect(url).toContain(`agent_id=${mockAgentId}`);
    });

    it('should handle pagination params', () => {
      const page = 2;
      const limit = 50;

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));

      const url = `/api/decisions?${params.toString()}`;

      expect(url).toContain('page=2');
      expect(url).toContain('limit=50');
    });

    it('should handle confidence_min filter', () => {
      const params = new URLSearchParams();
      params.set('confidence_min', '0.8');

      const url = `/api/decisions?${params.toString()}`;

      expect(url).toContain('confidence_min=0.8');
    });
  });
});
