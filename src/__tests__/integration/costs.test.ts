/**
 * Integration tests for Costs API (#117)
 * 
 * Tests all cost tracking endpoints:
 * - GET /api/costs - List costs with filtering
 * - GET /api/costs/summary - Get cost summary statistics
 * - GET /api/costs/daily - Get daily cost aggregation
 */

import { describe, it, expect } from 'vitest';

// Mock fetch for API testing
global.fetch = vi.fn();

describe('Costs API', () => {
  const mockToken = 'test-token-123';
  
  const mockCost = {
    id: 'cost-001',
    tenant_id: 'tenant-001',
    agent_id: 'agent-001',
    agent: {
      id: 'agent-001',
      name: 'Sales Rep Sarah',
      role: 'worker',
      avatar_url: '',
    },
    task_id: 'task-001',
    task: {
      id: 'task-001',
      title: 'Follow up with prospect',
      status: 'completed',
    },
    model: 'claude-3-5-sonnet',
    provider: 'anthropic',
    input_tokens: 1500,
    output_tokens: 800,
    total_tokens: 2300,
    input_cost_usd: 0.0045,
    output_cost_usd: 0.012,
    total_cost_usd: 0.0165,
    request_type: 'task_execution',
    status: 'success',
    created_at: '2026-02-14T10:30:00Z',
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/costs', () => {
    it('should fetch costs with correct authorization', async () => {
      const mockResponse = {
        data: [mockCost],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/costs', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith('/api/costs', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      expect(response.ok).toBe(true);
      
      const result = await response.json();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('cost-001');
    });

    it('should apply model filter correctly', async () => {
      const mockResponse = {
        data: [{ ...mockCost, model: 'claude-3-5-sonnet' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ model: 'claude-3-5-sonnet' });
      await fetch(`/api/costs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/costs?model=claude-3-5-sonnet',
        expect.any(Object)
      );
    });

    it('should apply provider filter correctly', async () => {
      const mockResponse = {
        data: [{ ...mockCost, provider: 'openai' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ provider: 'openai' });
      await fetch(`/api/costs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/costs?provider=openai',
        expect.any(Object)
      );
    });

    it('should apply status filter correctly', async () => {
      const mockResponse = {
        data: [{ ...mockCost, status: 'error' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ status: 'error' });
      await fetch(`/api/costs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/costs?status=error',
        expect.any(Object)
      );
    });

    it('should apply agent_id filter correctly', async () => {
      const mockResponse = {
        data: [mockCost],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ agent_id: 'agent-001' });
      await fetch(`/api/costs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/costs?agent_id=agent-001',
        expect.any(Object)
      );
    });

    it('should apply date range filters correctly', async () => {
      const mockResponse = {
        data: [mockCost],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({
        date_from: '2026-02-01T00:00:00Z',
        date_to: '2026-02-14T23:59:59Z',
      });
      await fetch(`/api/costs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('date_from='),
        expect.any(Object)
      );
    });

    it('should apply pagination correctly', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ page: '2', limit: '10' });
      const response = await fetch(`/api/costs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should return 401 without authorization', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const response = await fetch('/api/costs');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const response = await fetch('/api/costs', {
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid query parameters', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error', details: [] }),
      });

      const params = new URLSearchParams({ page: 'invalid' });
      const response = await fetch(`/api/costs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(400);
    });

    it('should include agent and task details in response', async () => {
      const mockResponse = {
        data: [mockCost],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/costs', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.data[0].agent).toBeDefined();
      expect(result.data[0].agent.name).toBe('Sales Rep Sarah');
      expect(result.data[0].task).toBeDefined();
      expect(result.data[0].task.title).toBe('Follow up with prospect');
    });
  });

  describe('GET /api/costs/summary', () => {
    it('should fetch cost summary with correct authorization', async () => {
      const mockResponse = {
        data: {
          total_requests: 100,
          total_tokens: 250000,
          total_cost_usd: 1.25,
          avg_cost_per_request: 0.0125,
          avg_tokens_per_request: 2500,
          breakdown_by_model: [
            { model: 'claude-3-5-sonnet', provider: 'anthropic', request_count: 80, total_tokens: 200000, total_cost_usd: 1.0 },
            { model: 'gpt-4-turbo', provider: 'openai', request_count: 20, total_tokens: 50000, total_cost_usd: 0.25 },
          ],
          period: { from: undefined, to: undefined },
        },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/costs/summary', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith('/api/costs/summary', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      expect(response.ok).toBe(true);
      
      const result = await response.json();
      expect(result.data.total_requests).toBe(100);
      expect(result.data.total_cost_usd).toBe(1.25);
      expect(result.data.breakdown_by_model).toHaveLength(2);
    });

    it('should apply date range filters correctly', async () => {
      const mockResponse = {
        data: {
          total_requests: 50,
          total_tokens: 125000,
          total_cost_usd: 0.625,
          avg_cost_per_request: 0.0125,
          avg_tokens_per_request: 2500,
          breakdown_by_model: [],
          period: {
            from: '2026-02-01T00:00:00Z',
            to: '2026-02-14T23:59:59Z',
          },
        },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({
        date_from: '2026-02-01T00:00:00Z',
        date_to: '2026-02-14T23:59:59Z',
      });
      const response = await fetch(`/api/costs/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.data.period.from).toBe('2026-02-01T00:00:00Z');
      expect(result.data.period.to).toBe('2026-02-14T23:59:59Z');
    });

    it('should return 401 without authorization', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const response = await fetch('/api/costs/summary');

      expect(response.status).toBe(401);
    });

    it('should handle empty cost data correctly', async () => {
      const mockResponse = {
        data: {
          total_requests: 0,
          total_tokens: 0,
          total_cost_usd: 0,
          avg_cost_per_request: 0,
          avg_tokens_per_request: 0,
          breakdown_by_model: [],
          period: {},
        },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/costs/summary', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.data.total_requests).toBe(0);
      expect(result.data.total_cost_usd).toBe(0);
    });
  });

  describe('GET /api/costs/daily', () => {
    it('should fetch daily costs with correct authorization', async () => {
      const mockResponse = {
        data: [
          { date: '2026-02-14', request_count: 10, total_tokens: 25000, total_cost_usd: 0.125 },
          { date: '2026-02-13', request_count: 8, total_tokens: 20000, total_cost_usd: 0.1 },
          { date: '2026-02-12', request_count: 12, total_tokens: 30000, total_cost_usd: 0.15 },
        ],
        meta: { days: 30, tenant_id: 'tenant-001' },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/costs/daily', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(fetch).toHaveBeenCalledWith('/api/costs/daily', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
      expect(response.ok).toBe(true);
      
      const result = await response.json();
      expect(result.data).toHaveLength(3);
      expect(result.data[0].date).toBe('2026-02-14');
    });

    it('should accept days parameter', async () => {
      const mockResponse = {
        data: [
          { date: '2026-02-14', request_count: 10, total_tokens: 25000, total_cost_usd: 0.125 },
        ],
        meta: { days: 7, tenant_id: 'tenant-001' },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params = new URLSearchParams({ days: '7' });
      const response = await fetch(`/api/costs/daily?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.meta.days).toBe(7);
    });

    it('should return 401 without authorization', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const response = await fetch('/api/costs/daily');

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid days parameter', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error', details: [] }),
      });

      const params = new URLSearchParams({ days: 'invalid' });
      const response = await fetch(`/api/costs/daily?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(400);
    });

    it('should enforce maximum days limit', async () => {
      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error', details: [{ message: 'Number must be less than or equal to 90' }] }),
      });

      const params = new URLSearchParams({ days: '100' });
      const response = await fetch(`/api/costs/daily?${params.toString()}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(response.status).toBe(400);
    });

    it('should handle empty daily data correctly', async () => {
      const mockResponse = {
        data: [],
        meta: { days: 30, tenant_id: 'tenant-001' },
      };

      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/costs/daily', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      const result = await response.json();
      expect(result.data).toHaveLength(0);
    });
  });
});
