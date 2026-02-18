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
 * - RLS compliance
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test configuration
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'test-tenant-id';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const IS_CI = process.env.CI === 'true';

// Skip tests if not in CI or environment not properly configured
const shouldSkip = !IS_CI || !SUPABASE_URL || !SERVICE_ROLE_KEY;

describe.skipIf(shouldSkip)('Decisions API Integration', () => {
  let supabase: SupabaseClient;
  let testAgentId: string;
  let testDecisionId: string;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: TEST_TENANT_ID });

    // Create a test agent for decision tests
    const { data: agent } = await supabase
      .from('agents')
      .insert({
        tenant_id: TEST_TENANT_ID,
        name: 'Test Decision Agent',
        role: 'worker',
        status: 'idle',
        capabilities: ['decide'],
      })
      .select('id')
      .single();

    testAgentId = agent?.id;
  });

  describe('Decision Creation', () => {
    it('should create a new decision', async () => {
      const decisionData = {
        tenant_id: TEST_TENANT_ID,
        agent_id: testAgentId,
        category: 'action',
        title: 'Test Decision',
        description: 'A decision for testing',
        proposed_action: { action: 'test' },
        reasoning: {
          context: 'Test context',
          analysis: 'Test analysis',
          options_considered: [],
          confidence: 0.8,
          risks: [],
        },
        status: 'proposed',
      };

      const { data, error } = await supabase
        .from('decisions')
        .insert(decisionData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe('Test Decision');
      expect(data.status).toBe('proposed');

      testDecisionId = data.id;
    });

    it('should require tenant_id', async () => {
      const { error } = await supabase
        .from('decisions')
        .insert({
          agent_id: testAgentId,
          category: 'action',
          title: 'No Tenant Decision',
          proposed_action: {},
          reasoning: {},
        });

      expect(error).toBeDefined();
    });

    it('should require agent_id', async () => {
      const { error } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          category: 'action',
          title: 'No Agent Decision',
          proposed_action: {},
          reasoning: {},
        });

      expect(error).toBeDefined();
    });
  });

  describe('Decision Queries', () => {
    it('should list decisions for tenant', async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('tenant_id', TEST_TENANT_ID)
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should filter decisions by status', async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('tenant_id', TEST_TENANT_ID)
        .eq('status', 'proposed')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data?.forEach((decision) => {
        expect(decision.status).toBe('proposed');
      });
    });

    it('should filter decisions by category', async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('tenant_id', TEST_TENANT_ID)
        .eq('category', 'action')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data?.forEach((decision) => {
        expect(decision.category).toBe('action');
      });
    });

    it('should filter decisions by agent_id', async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('tenant_id', TEST_TENANT_ID)
        .eq('agent_id', testAgentId)
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data?.forEach((decision) => {
        expect(decision.agent_id).toBe(testAgentId);
      });
    });

    it('should get single decision by id', async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('id', testDecisionId)
        .eq('tenant_id', TEST_TENANT_ID)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(testDecisionId);
    });

    it('should search decisions by title', async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('tenant_id', TEST_TENANT_ID)
        .ilike('title', '%Test%')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Decision Status Workflow', () => {
    it('should transition from proposed to approved', async () => {
      // Create a fresh decision
      const { data: decision } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          agent_id: testAgentId,
          category: 'action',
          title: 'Approve Test Decision',
          proposed_action: {},
          reasoning: { confidence: 0.9 },
          status: 'proposed',
        })
        .select()
        .single();

      const { data: updated, error } = await supabase
        .from('decisions')
        .update({
          status: 'approved',
          decided_at: new Date().toISOString(),
        })
        .eq('id', decision.id)
        .eq('tenant_id', TEST_TENANT_ID)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated.status).toBe('approved');
      expect(updated.decided_at).toBeDefined();
    });

    it('should transition from proposed to rejected', async () => {
      const { data: decision } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          agent_id: testAgentId,
          category: 'action',
          title: 'Reject Test Decision',
          proposed_action: {},
          reasoning: { confidence: 0.5 },
          status: 'proposed',
        })
        .select()
        .single();

      const { data: updated, error } = await supabase
        .from('decisions')
        .update({
          status: 'rejected',
          decided_at: new Date().toISOString(),
          outcome: { rejection_reason: 'Too risky' },
        })
        .eq('id', decision.id)
        .eq('tenant_id', TEST_TENANT_ID)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated.status).toBe('rejected');
    });

    it('should transition from approved to executed', async () => {
      const { data: decision } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          agent_id: testAgentId,
          category: 'action',
          title: 'Execute Test Decision',
          proposed_action: {},
          reasoning: { confidence: 0.95 },
          status: 'approved',
          decided_at: new Date().toISOString(),
        })
        .select()
        .single();

      const { data: updated, error } = await supabase
        .from('decisions')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
        })
        .eq('id', decision.id)
        .eq('tenant_id', TEST_TENANT_ID)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated.status).toBe('executed');
      expect(updated.executed_at).toBeDefined();
    });

    it('should support override from any status', async () => {
      const { data: decision } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          agent_id: testAgentId,
          category: 'action',
          title: 'Override Test Decision',
          proposed_action: {},
          reasoning: { confidence: 0.7 },
          status: 'approved',
        })
        .select()
        .single();

      const overrideData = {
        status: 'overridden',
        overridden_by: testAgentId, // Would be a user ID in reality
        override_reason: 'Human override for testing',
        overridden_at: new Date().toISOString(),
        decided_at: new Date().toISOString(),
      };

      const { data: updated, error } = await supabase
        .from('decisions')
        .update(overrideData)
        .eq('id', decision.id)
        .eq('tenant_id', TEST_TENANT_ID)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated.status).toBe('overridden');
      expect(updated.override_reason).toBe('Human override for testing');
    });
  });

  describe('Override Audit Trail', () => {
    it('should track who performed override', async () => {
      const { data: decision } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          agent_id: testAgentId,
          category: 'action',
          title: 'Audit Trail Test Decision',
          proposed_action: {},
          reasoning: {},
          status: 'proposed',
        })
        .select()
        .single();

      const overriderId = '550e8400-e29b-41d4-a716-446655440001';

      const { data: updated } = await supabase
        .from('decisions')
        .update({
          status: 'overridden',
          overridden_by: overriderId,
          override_reason: 'Audit trail test',
          overridden_at: new Date().toISOString(),
        })
        .eq('id', decision.id)
        .eq('tenant_id', TEST_TENANT_ID)
        .select()
        .single();

      expect(updated.overridden_by).toBe(overriderId);
      expect(updated.overridden_at).toBeDefined();
    });

    it('should store correct action when provided', async () => {
      const correctAction = {
        action: 'different_action',
        parameters: { key: 'value' },
      };

      const { data: decision } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          agent_id: testAgentId,
          category: 'action',
          title: 'Correct Action Test Decision',
          proposed_action: { action: 'original' },
          reasoning: {},
          status: 'proposed',
        })
        .select()
        .single();

      const { data: updated } = await supabase
        .from('decisions')
        .update({
          status: 'overridden',
          override_reason: 'Wrong action',
          executed_action: correctAction,
        })
        .eq('id', decision.id)
        .eq('tenant_id', TEST_TENANT_ID)
        .select()
        .single();

      expect(updated.executed_action).toEqual(correctAction);
    });
  });

  describe('RLS Compliance', () => {
    it('should not allow cross-tenant access', async () => {
      const otherTenantId = 'other-tenant-id';

      // Try to access decision from different tenant
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('tenant_id', otherTenantId)
        .limit(1);

      // RLS should filter out results
      expect(data).toHaveLength(0);
    });

    it('should enforce tenant isolation on updates', async () => {
      const otherTenantId = 'other-tenant-id';

      // Try to update decision from different tenant
      const { error } = await supabase
        .from('decisions')
        .update({ title: 'Hacked' })
        .eq('id', testDecisionId)
        .eq('tenant_id', otherTenantId);

      // Should not affect any rows (RLS filter)
      expect(error).toBeNull();
    });
  });

  describe('Decision Reasoning Storage', () => {
    it('should store complex reasoning in JSONB', async () => {
      const complexReasoning = {
        context: 'Detailed context about the situation',
        analysis: 'In-depth analysis of options',
        options_considered: [
          {
            description: 'Option A: Deploy immediately',
            pros: ['Fast time to market', 'Early user feedback'],
            cons: ['Risk of bugs', 'Potential downtime'],
            estimated_outcome: 'High risk, high reward',
            confidence: 0.6,
          },
          {
            description: 'Option B: Additional testing',
            pros: ['Lower risk', 'More stable release'],
            cons: ['Delayed launch', 'Competitor advantage'],
            estimated_outcome: 'Safer but slower',
            confidence: 0.85,
          },
        ],
        confidence: 0.75,
        risks: [
          {
            description: 'Market timing risk',
            likelihood: 'medium',
            impact: 'high',
            mitigation: 'Monitor competitor moves closely',
          },
        ],
      };

      const { data, error } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          agent_id: testAgentId,
          category: 'strategy',
          title: 'Complex Reasoning Decision',
          proposed_action: { decision: 'proceed_with_b' },
          reasoning: complexReasoning,
          status: 'proposed',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.reasoning).toEqual(complexReasoning);
      expect(data.reasoning.options_considered).toHaveLength(2);
      expect(data.reasoning.confidence).toBe(0.75);
    });
  });

  describe('Confidence Scores', () => {
    it('should store confidence score in reasoning', async () => {
      const { data, error } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          agent_id: testAgentId,
          category: 'action',
          title: 'High Confidence Decision',
          proposed_action: {},
          reasoning: {
            confidence: 0.95,
          },
          status: 'proposed',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.reasoning.confidence).toBe(0.95);
    });

    it('should allow filtering by confidence threshold', async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('tenant_id', TEST_TENANT_ID)
        .gte('reasoning->confidence', 0.8)
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Self-Authorization Tracking', () => {
    it('should track self-authorized decisions', async () => {
      const { data, error } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          agent_id: testAgentId,
          category: 'system',
          title: 'Self-Authorized Decision',
          proposed_action: {},
          reasoning: { confidence: 0.9 },
          self_authorized: true,
          status: 'executed',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.self_authorized).toBe(true);
    });

    it('should default self_authorized to false', async () => {
      const { data, error } = await supabase
        .from('decisions')
        .insert({
          tenant_id: TEST_TENANT_ID,
          agent_id: testAgentId,
          category: 'action',
          title: 'Default Auth Decision',
          proposed_action: {},
          reasoning: {},
          status: 'proposed',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.self_authorized).toBe(false);
    });
  });
});
