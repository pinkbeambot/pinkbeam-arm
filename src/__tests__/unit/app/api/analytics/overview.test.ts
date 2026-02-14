/**
 * Analytics Overview API Route Tests
 * Unit tests for /api/analytics/overview
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/analytics/overview/route';
import { NextRequest } from 'next/server';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('GET /api/analytics/overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 without authorization header', async () => {
    const request = new NextRequest('http://localhost:3000/api/analytics/overview');
    
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 401 with invalid authorization header', async () => {
    const request = new NextRequest('http://localhost:3000/api/analytics/overview', {
      headers: { authorization: 'Invalid' },
    });
    
    const response = await GET(request);
    
    expect(response.status).toBe(401);
  });

  it('should return 401 when user not found', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('User not found'),
    });

    const request = new NextRequest('http://localhost:3000/api/analytics/overview', {
      headers: { authorization: 'Bearer test-token' },
    });
    
    const response = await GET(request);
    
    expect(response.status).toBe(401);
  });

  it('should return 403 when tenant not found', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: null,
            error: new Error('User not found'),
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/analytics/overview', {
      headers: { authorization: 'Bearer test-token' },
    });
    
    const response = await GET(request);
    
    expect(response.status).toBe(403);
  });

  it('should return cached data when available', async () => {
    // Setup successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: { tenant_id: 'tenant-1' },
            error: null,
          }),
        }),
      }),
    });

    // Mock tenant context
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: null });

    // Mock materialized view query
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          gte: vi.fn().mockReturnValueOnce({
            lte: vi.fn().mockReturnValueOnce({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock previous period query
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          gte: vi.fn().mockReturnValueOnce({
            lt: vi.fn().mockReturnValueOnce({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock escalations count
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          in: vi.fn().mockReturnValueOnce({
            data: null,
            count: 5,
            error: null,
          }),
        }),
      }),
    });

    // Mock agents count
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          in: vi.fn().mockReturnValueOnce({
            data: null,
            count: 3,
            error: null,
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/analytics/overview?days=30', {
      headers: { authorization: 'Bearer test-token' },
    });
    
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.summary).toBeDefined();
    expect(body.data.summary.activeAgents.value).toBe(3);
    expect(body.data.summary.openEscalations.value).toBe(5);
  });

  it('should handle validation errors', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: { tenant_id: 'tenant-1' },
            error: null,
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/analytics/overview?days=invalid', {
      headers: { authorization: 'Bearer test-token' },
    });
    
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation error');
  });
});
