/**
 * Integration tests for Decisions API
 * 
 * These tests validate the decisions endpoints for decision logging and management
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

describe('Decisions API Integration', () => {
  let testTenantId: string;
  let testUserId: string;
  let testUserAuthId: string;
  let testAgentId: string;
  let testTaskId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Create test tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .insert({ name: 'Test Tenant Decisions', slug: 'test-tenant-decisions' })
      .select()
      .single();
    
    testTenantId = tenant!.id;

    // Create test user auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test-decisions@example.com',
      password: 'test-password-123',
      email_confirm: true,
    });

    if (authError) throw authError;
    testUserAuthId = authUser.user!.id;

    // Create test user profile
    const { data: user } = await supabase
      .from('users')
      .insert({
        tenant_id: testTenantId,
        auth_id: testUserAuthId,
        email: 'test-decisions@example.com',
        name: 'Test User Decisions',
        role: 'owner',
      })
      .select()
      .single();
    
    testUserId = user!.id;

    // Create test agent
    const { data: agent } = await supabase
      .from('agents')
      .insert({
        tenant_id: testTenantId,
        name: 'Test Decision Agent',
        role: 'worker',
        status: 'idle',
        capabilities: ['decide', 'escalate'],
        depth: 0,
      })
      .select()
      .single();
    
    testAgentId = agent!.id;

    // Create test task
    const { data: task } = await supabase
      .from('tasks')
      .insert({
        tenant_id: testTenantId,
        title: 'Test Task for Decisions',
        description: 'A test task',
        status: 'queued',
        priority: 'normal',
      })
      .select()
      .single();
    
    testTaskId = task!.id;

    // Get access token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test-decisions@example.com',
      password: 'test-password-123',
    });

    if (signInError) throw signInError;
    accessToken = signInData.session!.access_token;
  });

  afterAll(async () => {
    // Cleanup: delete test data
    await supabase.from('decisions').delete().eq('tenant_id', testTenantId);
    await supabase.from('tasks').delete().eq('tenant_id', testTenantId);
    await supabase.from('agents').delete().eq('tenant_id', testTenantId);
    await supabase.from('users').delete().eq('tenant_id', testTenantId);
    await supabase.from('tenants').delete().eq('id', testTenantId);
    
    // Clean up auth user
    if (testUserAuthId) {
      await supabase.auth.admin.deleteUser(testUserAuthId);
    }
  });

  describe('POST /api/decisions', () => {
    it('should create a new decision', async () => {
      const decisionData = {
        agent_id: testAgentId,
        task_id: testTaskId,
        category: 'action',
        title: 'Test Decision',
        description: 'A test decision description',
        proposed_action: {
          type: 'test_action',
          value: 'test_value',
        },
        reasoning: {
          context: 'Test context',
          analysis: 'Test analysis',
          options_considered: [
            {
              description: 'Option 1',
              pros: ['Pro 1'],
              cons: ['Con 1'],
              estimated_outcome: 'Good',
              confidence: 0.8,
            },
          ],
          confidence: 0.85,
          risks: [
            {
              description: 'Risk 1',
              likelihood: 'low',
              impact: 'medium',
              mitigation: 'Mitigation 1',
            },
          ],
        },
        self_authorized: false,
      };

      const response = await fetch('http://localhost:3000/api/decisions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(decisionData),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.data).toBeDefined();
      expect(result.data.title).toBe('Test Decision');
      expect(result.data.status).toBe('proposed');
      expect(result.data.agent_id).toBe(testAgentId);
    });

    it('should return 400 for invalid decision data', async () => {
      const invalidData = {
        agent_id: testAgentId,
        // Missing required fields
      };

      const response = await fetch('http://localhost:3000/api/decisions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await fetch('http://localhost:3000/api/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/decisions', () => {
    beforeEach(async () => {
      // Clean up existing decisions before each test
      await supabase.from('decisions').delete().eq('tenant_id', testTenantId);
      
      // Create test decisions
      const decisions = [
        {
          tenant_id: testTenantId,
          agent_id: testAgentId,
          task_id: testTaskId,
          category: 'action',
          title: 'Decision 1',
          description: 'First test decision',
          proposed_action: { type: 'action1' },
          reasoning: { confidence: 0.9 },
          status: 'proposed',
        },
        {
          tenant_id: testTenantId,
          agent_id: testAgentId,
          task_id: testTaskId,
          category: 'strategy',
          title: 'Decision 2',
          description: 'Second test decision',
          proposed_action: { type: 'action2' },
          reasoning: { confidence: 0.7 },
          status: 'approved',
        },
        {
          tenant_id: testTenantId,
          agent_id: testAgentId,
          task_id: testTaskId,
          category: 'escalation',
          title: 'Decision 3',
          description: 'Third test decision',
          proposed_action: { type: 'action3' },
          reasoning: { confidence: 0.5 },
          status: 'executed',
        },
      ];

      await supabase.from('decisions').insert(decisions);
    });

    it('should list decisions with pagination', async () => {
      const response = await fetch('http://localhost:3000/api/decisions?page=1&limit=10', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(3);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter decisions by status', async () => {
      const response = await fetch('http://localhost:3000/api/decisions?status=proposed', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((d: any) => d.status === 'proposed')).toBe(true);
    });

    it('should filter decisions by category', async () => {
      const response = await fetch('http://localhost:3000/api/decisions?category=strategy', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((d: any) => d.category === 'strategy')).toBe(true);
    });

    it('should filter decisions by agent_id', async () => {
      const response = await fetch(`http://localhost:3000/api/decisions?agent_id=${testAgentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((d: any) => d.agent_id === testAgentId)).toBe(true);
    });

    it('should search decisions by title', async () => {
      const response = await fetch('http://localhost:3000/api/decisions?search=Decision%201', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].title).toContain('Decision 1');
    });

    it('should return 401 without auth token', async () => {
      const response = await fetch('http://localhost:3000/api/decisions');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/decisions/:id', () => {
    let testDecisionId: string;

    beforeEach(async () => {
      // Create a test decision
      const { data: decision } = await supabase
        .from('decisions')
        .insert({
          tenant_id: testTenantId,
          agent_id: testAgentId,
          task_id: testTaskId,
          category: 'action',
          title: 'Single Test Decision',
          description: 'A single test decision',
          proposed_action: { type: 'test' },
          reasoning: { confidence: 0.85 },
          status: 'proposed',
        })
        .select()
        .single();
      
      testDecisionId = decision!.id;
    });

    it('should get a single decision by ID', async () => {
      const response = await fetch(`http://localhost:3000/api/decisions/${testDecisionId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(testDecisionId);
      expect(result.data.title).toBe('Single Test Decision');
    });

    it('should return 404 for non-existent decision', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`http://localhost:3000/api/decisions/${fakeId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await fetch(`http://localhost:3000/api/decisions/${testDecisionId}`);
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/decisions/:id', () => {
    let testDecisionId: string;

    beforeEach(async () => {
      // Create a test decision
      const { data: decision } = await supabase
        .from('decisions')
        .insert({
          tenant_id: testTenantId,
          agent_id: testAgentId,
          task_id: testTaskId,
          category: 'action',
          title: 'Updatable Decision',
          description: 'A decision to update',
          proposed_action: { type: 'test' },
          reasoning: { confidence: 0.85 },
          status: 'proposed',
        })
        .select()
        .single();
      
      testDecisionId = decision!.id;
    });

    it('should update decision status', async () => {
      const response = await fetch(`http://localhost:3000/api/decisions/${testDecisionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.status).toBe('approved');
    });

    it('should override a decision', async () => {
      const response = await fetch(`http://localhost:3000/api/decisions/${testDecisionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'This decision was incorrect',
          correct_action: { type: 'corrected_action' },
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.status).toBe('overridden');
      expect(result.data.override_reason).toBe('This decision was incorrect');
    });

    it('should return 400 for immutable decisions', async () => {
      // First, make the decision immutable
      await supabase
        .from('decisions')
        .update({ immutable: true })
        .eq('id', testDecisionId);

      const response = await fetch(`http://localhost:3000/api/decisions/${testDecisionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent decision', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`http://localhost:3000/api/decisions/${fakeId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await fetch(`http://localhost:3000/api/decisions/${testDecisionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Tenant Isolation', () => {
    let otherTenantId: string;
    let otherTenantToken: string;
    let otherTenantDecisionId: string;

    beforeAll(async () => {
      // Create another tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .insert({ name: 'Other Tenant', slug: 'other-tenant' })
        .select()
        .single();
      
      otherTenantId = tenant!.id;

      // Create user for other tenant
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: 'other-tenant@example.com',
        password: 'test-password-123',
        email_confirm: true,
      });

      if (authError) throw authError;
      const otherAuthId = authUser.user!.id;

      await supabase.from('users').insert({
        tenant_id: otherTenantId,
        auth_id: otherAuthId,
        email: 'other-tenant@example.com',
        name: 'Other User',
        role: 'owner',
      });

      // Create agent for other tenant
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          tenant_id: otherTenantId,
          name: 'Other Agent',
          role: 'worker',
          status: 'idle',
          capabilities: ['decide'],
          depth: 0,
        })
        .select()
        .single();

      // Create a decision in other tenant
      const { data: decision } = await supabase
        .from('decisions')
        .insert({
          tenant_id: otherTenantId,
          agent_id: agent!.id,
          category: 'action',
          title: 'Other Tenant Decision',
          description: 'Decision from other tenant',
          proposed_action: { type: 'test' },
          reasoning: { confidence: 0.8 },
          status: 'proposed',
        })
        .select()
        .single();
      
      otherTenantDecisionId = decision!.id;

      // Get token for other tenant user
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: 'other-tenant@example.com',
        password: 'test-password-123',
      });

      otherTenantToken = signInData.session!.access_token;

      // Cleanup: delete other tenant user
      await supabase.auth.admin.deleteUser(otherAuthId);
    });

    afterAll(async () => {
      await supabase.from('decisions').delete().eq('tenant_id', otherTenantId);
      await supabase.from('agents').delete().eq('tenant_id', otherTenantId);
      await supabase.from('users').delete().eq('tenant_id', otherTenantId);
      await supabase.from('tenants').delete().eq('id', otherTenantId);
    });

    it('should not allow access to decisions from other tenants', async () => {
      const response = await fetch(`http://localhost:3000/api/decisions/${otherTenantDecisionId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      // Should return 404 (not 403) to avoid leaking existence
      expect(response.status).toBe(404);
    });

    it('should only list decisions from current tenant', async () => {
      const response = await fetch('http://localhost:3000/api/decisions', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      // Should not contain the other tenant's decision
      const hasOtherTenantDecision = result.data.some(
        (d: any) => d.title === 'Other Tenant Decision'
      );
      expect(hasOtherTenantDecision).toBe(false);
    });
  });
});
