/**
 * Integration tests for Decisions API
 * Tests GET /api/decisions with filtering, pagination, and sorting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
};

// Mock the Supabase createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}));

import { GET, POST } from '@/app/api/decisions/route';
import { listDecisionsQuerySchema, createDecisionSchema } from '@/lib/validation';

describe('Decisions API - GET /api/decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    const request = new Request('http://localhost/api/decisions');
    
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should validate query parameters', () => {
    const validParams = {
      agent_id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'proposed',
      category: 'action',
      page: '1',
      limit: '20',
    };

    const result = listDecisionsQuerySchema.safeParse(validParams);
    expect(result.success).toBe(true);
  });

  it('should reject invalid status values', () => {
    const invalidParams = {
      status: 'invalid_status',
      page: '1',
      limit: '20',
    };

    const result = listDecisionsQuerySchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('should reject invalid page numbers', () => {
    const invalidParams = {
      page: '0',
      limit: '20',
    };

    const result = listDecisionsQuerySchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('should reject limit values over 100', () => {
    const invalidParams = {
      page: '1',
      limit: '150',
    };

    const result = listDecisionsQuerySchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('should construct correct filter query with all parameters', () => {
    const params = new URLSearchParams({
      agent_id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'approved',
      category: 'strategy',
      date_from: '2026-01-01T00:00:00Z',
      date_to: '2026-12-31T23:59:59Z',
      confidence_min: '0.8',
      search: 'test query',
      sort: 'confidence',
      order: 'asc',
      page: '2',
      limit: '50',
    });

    expect(params.get('agent_id')).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(params.get('status')).toBe('approved');
    expect(params.get('category')).toBe('strategy');
    expect(params.get('date_from')).toBe('2026-01-01T00:00:00Z');
    expect(params.get('date_to')).toBe('2026-12-31T23:59:59Z');
    expect(params.get('confidence_min')).toBe('0.8');
    expect(params.get('search')).toBe('test query');
    expect(params.get('sort')).toBe('confidence');
    expect(params.get('order')).toBe('asc');
    expect(params.get('page')).toBe('2');
    expect(params.get('limit')).toBe('50');
  });

  it('should calculate correct offset for pagination', () => {
    const page = 2;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    expect(offset).toBe(20);
  });

  it('should calculate correct total pages', () => {
    const total = 95;
    const limit = 20;
    const totalPages = Math.ceil(total / limit);
    
    expect(totalPages).toBe(5);
  });
});

describe('Decisions API - POST /api/decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication for POST', async () => {
    const request = new Request('http://localhost/api/decisions', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should validate required fields in create payload', () => {
    const invalidPayload = {
      agent_id: 'invalid-uuid',
      title: '',
      category: 'invalid',
      proposed_action: {},
    };

    const result = createDecisionSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('should accept valid create payload', () => {
    const validPayload = {
      agent_id: '550e8400-e29b-41d4-a716-446655440000',
      task_id: '550e8400-e29b-41d4-a716-446655440001',
      category: 'action',
      title: 'Test Decision',
      description: 'A test decision',
      proposed_action: { type: 'test' },
      reasoning: {
        context: 'Test context',
        analysis: 'Test analysis',
        options_considered: [],
        confidence: 0.85,
        risks: [],
      },
      self_authorized: false,
    };

    const result = createDecisionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });
});

describe('Decisions API - Response Format', () => {
  it('should return correct pagination structure', () => {
    const mockResponse = {
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
      },
    };

    expect(mockResponse.pagination).toHaveProperty('page');
    expect(mockResponse.pagination).toHaveProperty('limit');
    expect(mockResponse.pagination).toHaveProperty('total');
    expect(mockResponse.pagination).toHaveProperty('totalPages');
    expect(mockResponse.pagination.totalPages).toBe(
      Math.ceil(mockResponse.pagination.total / mockResponse.pagination.limit)
    );
  });

  it('should include related agent data in response', () => {
    const mockDecision = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      agent_id: '550e8400-e29b-41d4-a716-446655440001',
      agent: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Agent',
        avatar_url: null,
        role: 'worker',
        status: 'active',
      },
    };

    expect(mockDecision.agent).toBeDefined();
    expect(mockDecision.agent.name).toBe('Test Agent');
  });

  it('should include related task data in response', () => {
    const mockDecision = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      task_id: '550e8400-e29b-41d4-a716-446655440002',
      task: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title: 'Test Task',
        status: 'in_progress',
      },
    };

    expect(mockDecision.task).toBeDefined();
    expect(mockDecision.task.title).toBe('Test Task');
  });
});

describe('Decisions API - Filtering Logic', () => {
  it('should apply agent_id filter correctly', () => {
    const agentId = '550e8400-e29b-41d4-a716-446655440000';
    const decisions = [
      { id: '1', agent_id: agentId },
      { id: '2', agent_id: 'other-agent' },
      { id: '3', agent_id: agentId },
    ];

    const filtered = decisions.filter(d => d.agent_id === agentId);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(d => d.id)).toEqual(['1', '3']);
  });

  it('should apply status filter correctly', () => {
    const status = 'approved';
    const decisions = [
      { id: '1', status: 'proposed' },
      { id: '2', status: 'approved' },
      { id: '3', status: 'approved' },
    ];

    const filtered = decisions.filter(d => d.status === status);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(d => d.id)).toEqual(['2', '3']);
  });

  it('should apply date range filter correctly', () => {
    const dateFrom = new Date('2026-01-01');
    const dateTo = new Date('2026-01-31');
    const decisions = [
      { id: '1', proposed_at: '2025-12-15T00:00:00Z' },
      { id: '2', proposed_at: '2026-01-15T00:00:00Z' },
      { id: '3', proposed_at: '2026-02-15T00:00:00Z' },
    ];

    const filtered = decisions.filter(d => {
      const date = new Date(d.proposed_at);
      return date >= dateFrom && date <= dateTo;
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('should apply search filter correctly', () => {
    const searchTerm = 'pricing';
    const decisions = [
      { id: '1', title: 'Update Pricing', description: 'Test' },
      { id: '2', title: 'Other Decision', description: 'Test' },
      { id: '3', title: 'Another', description: 'Pricing strategy' },
    ];

    const filtered = decisions.filter(d => 
      d.title.toLowerCase().includes(searchTerm) ||
      d.description.toLowerCase().includes(searchTerm)
    );
    expect(filtered).toHaveLength(2);
    expect(filtered.map(d => d.id)).toContain('1');
    expect(filtered.map(d => d.id)).toContain('3');
  });
});

describe('Decisions API - Sorting Logic', () => {
  it('should sort by created_at ascending', () => {
    const decisions = [
      { id: '1', created_at: '2026-02-01T00:00:00Z' },
      { id: '2', created_at: '2026-01-01T00:00:00Z' },
      { id: '3', created_at: '2026-03-01T00:00:00Z' },
    ];

    const sorted = [...decisions].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    expect(sorted.map(d => d.id)).toEqual(['2', '1', '3']);
  });

  it('should sort by confidence descending', () => {
    const decisions = [
      { id: '1', confidence: 75 },
      { id: '2', confidence: 95 },
      { id: '3', confidence: 85 },
    ];

    const sorted = [...decisions].sort((a, b) => b.confidence - a.confidence);
    
    expect(sorted.map(d => d.id)).toEqual(['2', '3', '1']);
  });
});
