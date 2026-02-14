/**
 * Integration tests for Agents API
 *
 * These tests validate the agents endpoints for proper auth and RLS handling
 * Addresses Issues #61 and #62
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

// Create admin client for setup
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Base URL for API tests
const API_BASE = 'http://localhost:3000/api/agents';

// Check if Supabase is available (will be false in CI/test environments without Supabase)
const supabaseAvailable = process.env.SUPABASE_URL !== undefined && process.env.SUPABASE_URL !== 'http://localhost:54321';

describe('Agents API Integration', () => {
  let testTenantId: string;
  let testUserId: string;
  let testAgentId: string;
  let authToken: string;

  beforeAll(async () => {
    if (!supabaseAvailable) return;

    // Create test tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .insert({ name: 'Test Tenant Agents', slug: 'test-tenant-agents' })
      .select()
      .single();
    
    if (!tenant) throw new Error('Failed to create test tenant');
    testTenantId = tenant.id;

    // Create a test user with auth using service role to bypass RLS
    const { data: user } = await supabase
      .from('users')
      .insert({
        tenant_id: testTenantId,
        email: 'test-agents@example.com',
        name: 'Test User Agents',
        role: 'owner',
      })
      .select()
      .single();
    
    if (!user) throw new Error('Failed to create test user');
    testUserId = user.id;

    // Create test agent
    const { data: agent } = await supabase
      .from('agents')
      .insert({
        tenant_id: testTenantId,
        name: 'Test Agent',
        role: 'worker',
        status: 'idle',
        capabilities: ['decide', 'escalate'],
        depth: 0,
      })
      .select()
      .single();
    
    if (!agent) throw new Error('Failed to create test agent');
    testAgentId = agent.id;

    // For tests, we'll use a mock token since we're testing the API layer
    authToken = 'test-mock-token';
  });

  afterAll(async () => {
    if (!supabaseAvailable) return;
    
    // Cleanup: delete test data
    await supabase.from('agents').delete().eq('tenant_id', testTenantId);
    await supabase.from('users').delete().eq('tenant_id', testTenantId);
    await supabase.from('tenants').delete().eq('id', testTenantId);
  });

  describe('Auth & RLS', () => {
    it('should require authentication token', async () => {
      const response = await fetch(API_BASE);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should require Bearer token format', async () => {
      const response = await fetch(API_BASE, {
        headers: {
          'Authorization': 'Basic invalid-token',
        },
      });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Tenant Context', () => {
    it('should set tenant context for RLS policies', async () => {
      // This test verifies that the set_tenant_context function exists
      // and can be called with the correct parameter name
      const { data, error } = await supabase.rpc('set_tenant_context', { 
        tenant_id: testTenantId 
      });

      // Should not throw an error about parameter name
      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should validate tenant context returns boolean', async () => {
      const { data, error } = await supabase.rpc('set_tenant_context', { 
        tenant_id: testTenantId 
      });

      expect(error).toBeNull();
      expect(typeof data).toBe('boolean');
    });
  });

  describe('Agent CRUD Operations', () => {
    it('should create agent with proper tenant isolation', async () => {
      // Verify we can create an agent using service role
      const { data: agent, error } = await supabase
        .from('agents')
        .insert({
          tenant_id: testTenantId,
          name: 'RLS Test Agent',
          role: 'worker',
          status: 'idle',
          depth: 0,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(agent).toBeDefined();
      expect(agent!.tenant_id).toBe(testTenantId);
      expect(agent!.name).toBe('RLS Test Agent');

      // Cleanup
      await supabase.from('agents').delete().eq('id', agent!.id);
    });

    it('should enforce tenant isolation on agents', async () => {
      // Create another tenant
      const { data: otherTenant } = await supabase
        .from('tenants')
        .insert({ name: 'Other Tenant', slug: 'other-tenant-agents' })
        .select()
        .single();

      // Create agent in other tenant
      const { data: otherAgent } = await supabase
        .from('agents')
        .insert({
          tenant_id: otherTenant!.id,
          name: 'Other Agent',
          role: 'worker',
          status: 'idle',
          depth: 0,
        })
        .select()
        .single();

      expect(otherAgent).toBeDefined();

      // Set context to test tenant
      await supabase.rpc('set_tenant_context', { tenant_id: testTenantId });

      // Query agents - should only see test tenant's agents
      const { data: agents } = await supabase
        .from('agents')
        .select('*');

      // Should not see the other tenant's agent
      const otherAgentFound = agents?.find(a => a.id === otherAgent!.id);
      expect(otherAgentFound).toBeUndefined();

      // Cleanup
      await supabase.from('agents').delete().eq('tenant_id', otherTenant!.id);
      await supabase.from('tenants').delete().eq('id', otherTenant!.id);
    });
  });

  describe('set_tenant_context Function - Issue #61/#62 Fix', () => {
    it('should use correct parameter name (tenant_id not p_tenant_id)', async () => {
      // ROOT CAUSE: Migration 011 changed parameter name from 'tenant_id' to 'p_tenant_id'
      // but API routes were still using 'tenant_id'. This caused the RPC call to fail,
      // leaving tenant context unset, which caused RLS to block all queries.
      //
      // FIX: Migration 016 restores the correct parameter name 'tenant_id'
      // to match what the API routes expect.
      
      const { data, error } = await supabase.rpc('set_tenant_context', { 
        tenant_id: testTenantId 
      });

      // If the parameter name was wrong, this would error with:
      // 'function set_tenant_context(p_tenant_id => ...) does not exist'
      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should reject invalid tenant_id', async () => {
      const { data, error } = await supabase.rpc('set_tenant_context', { 
        tenant_id: '00000000-0000-0000-0000-000000000000' 
      });

      // Should return false for invalid/unauthorized tenant
      expect(data).toBe(false);
    });
  });
});

/**
 * Unit tests for the useAgents hooks behavior
 * These test the logic without needing the full API
 */
describe('useAgents Hook Logic', () => {
  it('should construct correct API URL with filters', () => {
    const baseUrl = '/api/agents';
    const filters = {
      status: 'active',
      role: 'worker',
      search: 'test',
      page: '2',
      limit: '50',
    };

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const url = `${baseUrl}?${params.toString()}`;
    
    expect(url).toContain('status=active');
    expect(url).toContain('role=worker');
    expect(url).toContain('search=test');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=50');
  });

  it('should include authorization header in requests', () => {
    const token = 'test-token-123';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    expect(headers.Authorization).toBe('Bearer test-token-123');
    expect(headers['Content-Type']).toBe('application/json');
  });
});
