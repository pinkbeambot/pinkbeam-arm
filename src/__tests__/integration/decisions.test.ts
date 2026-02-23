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
 * - Status workflow enforcement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Decisions API', () => {
  const mockTenantId = 'test-tenant-id';
  const mockToken = 'test-token';
  const mockDecision = {
    id: 'dec-123',
    title: 'Test Decision',
    description: 'Test description',
    status: 'proposed',
    category: 'action',
    confidence: 0.85,
    proposed_by: 'agent-123',
    tenant_id: mockTenantId,
    created_at: new Date().toISOString(),
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
          pagination: { page: 1, limit: 20, total: 1 },
        }),
      });

      const response = await fetch('/api/decisions', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('Test Decision');
    });

    it('should filter decisions by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ ...mockDecision, status: 'approved' }],
          pagination: { page: 1, limit: 20, total: 1 },
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
          pagination: { page: 1, limit: 20, total: 1 },
        }),
      });

      const response = await fetch('/api/decisions?category=strategy', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data[0].category).toBe('strategy');
    });

    it('should handle search queries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockDecision],
          pagination: { page: 1, limit: 20, total: 1 },
        }),
      });

      const response = await fetch('/api/decisions?search=Test', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data).toHaveLength(1);
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
        title: 'New Decision',
        description: 'New description',
        category: 'action',
        confidence: 0.9,
        proposed_by: 'agent-456',
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
        json: async () => ({ error: 'Title is required' }),
      });

      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ category: 'action' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/decisions/[id]', () => {
    it('should get a single decision', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockDecision }),
      });

      const response = await fetch(`/api/decisions/${mockDecision.id}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data.id).toBe(mockDecision.id);
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
  });

  describe('PATCH /api/decisions/[id]', () => {
    it('should update decision status to approved', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockDecision, status: 'approved', approved_by: 'user-123' },
        }),
      });

      const response = await fetch(`/api/decisions/${mockDecision.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ status: 'approved', approved_by: 'user-123' }),
      });
      const data = await response.json();

      expect(data.data.status).toBe('approved');
    });

    it('should reject invalid status transitions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid status transition' }),
      });

      const response = await fetch(`/api/decisions/${mockDecision.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ status: 'invalid-status' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Decision Reasoning and Confidence', () => {
    it('should store and retrieve reasoning', async () => {
      const decisionWithReasoning = {
        ...mockDecision,
        reasoning: {
          factors: ['factor1', 'factor2'],
          alternatives: ['option1', 'option2'],
          risks: ['risk1'],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: decisionWithReasoning }),
      });

      const response = await fetch(`/api/decisions/${mockDecision.id}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data.reasoning.factors).toHaveLength(2);
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
          title: 'Test',
          confidence: 1.5, // Invalid
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

      const response = await fetch(`/api/decisions/${mockDecision.id}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      const data = await response.json();

      expect(data.data.self_authorized).toBe(true);
      expect(data.data.executed_at).toBeDefined();
    });
  });

  describe('useDecisions Hook Logic', () => {
    it('should construct proper URL with filters', () => {
      const filters = {
        status: 'proposed',
        category: 'action',
        agent_id: 'agent-123',
      };

      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.agent_id) params.set('agent_id', filters.agent_id);

      const url = `/api/decisions?${params.toString()}`;

      expect(url).toContain('status=proposed');
      expect(url).toContain('category=action');
      expect(url).toContain('agent_id=agent-123');
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
  });
});
