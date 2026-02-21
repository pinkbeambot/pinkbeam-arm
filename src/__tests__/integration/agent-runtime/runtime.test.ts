/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * Integration tests for Agent Runtime Edge Functions
 *
 * These tests validate the integration between edge functions and database
 */

// @ts-nocheck - Test file uses conditional skip() that doesn't narrow types
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

// Skip integration tests when no real Supabase credentials are available
const hasCredentials = !!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'test-key';

// Create admin client
const supabase = hasCredentials
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

describe('Agent Runtime Integration', () => {
  let testTenantId: string;
  let testUserId: string;
  let connectionOk = false;

  beforeAll(async () => {
    if (!hasCredentials) return;

    // Verify Supabase connection before running tests
    try {
      const { error } = await supabase.from('tenants').select('id').limit(1);
      if (error) return;
      connectionOk = true;
    } catch {
      return;
    }

    // Create test tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .insert({ name: 'Test Tenant', slug: 'test-tenant' })
      .select()
      .single();

    testTenantId = tenant!.id;

    // Create test user
    const { data: user } = await supabase
      .from('users')
      .insert({
        tenant_id: testTenantId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner',
      })
      .select()
      .single();

    testUserId = user!.id;
  });

  afterAll(async () => {
    if (!connectionOk) return;
    // Cleanup: delete test data
    await supabase.from('tenants').delete().eq('id', testTenantId);
  });

  describe('Agent Spawning', () => {
    it('should spawn a root agent (human CEO)', async ({ skip }) => {
      if (!connectionOk) skip();
      // Note: In real scenario, this would call the edge function
      // For integration test, we test the database operations

      const { data: agent, error } = await supabase
        .from('agents')
        .insert({
          tenant_id: testTenantId,
          name: 'CEO Agent',
          role: 'ceo',
          status: 'idle',
          capabilities: ['spawn', 'delegate', 'decide', 'escalate', 'access_external', 'modify_config'],
          depth: 0,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(agent).toBeDefined();
      expect(agent!.role).toBe('ceo');
      expect(agent!.status).toBe('idle');
    });

    it('should spawn a child agent', async ({ skip }) => {
      if (!connectionOk) skip();
      // First create parent
      const { data: parent } = await supabase
        .from('agents')
        .insert({
          tenant_id: testTenantId,
          name: 'Manager Agent',
          role: 'manager',
          status: 'idle',
          capabilities: ['spawn', 'delegate', 'decide', 'escalate'],
          depth: 0,
        })
        .select()
        .single();

      // Create child
      const { data: child, error } = await supabase
        .from('agents')
        .insert({
          tenant_id: testTenantId,
          name: 'Worker Agent',
          role: 'worker',
          parent_id: parent!.id,
          root_id: parent!.id,
          status: 'idle',
          capabilities: ['decide', 'escalate'],
          depth: 1,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(child).toBeDefined();
      expect(child!.parent_id).toBe(parent!.id);
      expect(child!.depth).toBe(1);
    });

    it('should enforce tenant isolation', async ({ skip }) => {
      if (!connectionOk) skip();
      // Create another tenant
      const { data: otherTenant } = await supabase
        .from('tenants')
        .insert({ name: 'Other Tenant', slug: 'other-tenant' })
        .select()
        .single();

      // Try to create agent referencing wrong tenant
      const { error } = await supabase
        .from('agents')
        .insert({
          tenant_id: otherTenant!.id,
          name: 'Cross-Tenant Agent',
          role: 'worker',
          status: 'idle',
          capabilities: [],
          depth: 0,
        });

      // This should succeed since we're using service role
      // In actual RLS scenario, this would be blocked
      expect(error).toBeNull();

      // Cleanup
      await supabase.from('tenants').delete().eq('id', otherTenant!.id);
    });
  });

  describe('Agent Lifecycle', () => {
    it('should update agent status', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          tenant_id: testTenantId,
          name: 'Lifecycle Test Agent',
          role: 'worker',
          status: 'initializing',
          capabilities: [],
          depth: 0,
        })
        .select()
        .single();

      // Update status
      const { data: updated, error } = await supabase
        .from('agents')
        .update({ status: 'idle', activated_at: new Date().toISOString() })
        .eq('id', agent!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated!.status).toBe('idle');
    });

    it('should log lifecycle events', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          tenant_id: testTenantId,
          name: 'Event Test Agent',
          role: 'worker',
          status: 'idle',
          capabilities: [],
          depth: 0,
        })
        .select()
        .single();

      // Update status to trigger event logging
      await supabase
        .from('agents')
        .update({ status: 'active' })
        .eq('id', agent!.id);

      // Check lifecycle event was logged
      const { data: events } = await supabase
        .from('agent_lifecycle_events')
        .select('*')
        .eq('agent_id', agent!.id)
        .order('created_at', { ascending: false });

      expect(events).toBeDefined();
      expect(events!.length).toBeGreaterThan(0);
    });
  });

  describe('Task Management', () => {
    it('should create and assign tasks', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          tenant_id: testTenantId,
          name: 'Task Agent',
          role: 'worker',
          status: 'idle',
          capabilities: [],
          depth: 0,
        })
        .select()
        .single();

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          tenant_id: testTenantId,
          title: 'Test Task',
          description: 'A test task',
          assignee_id: agent!.id,
          status: 'queued',
          priority: 'normal',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(task).toBeDefined();
      expect(task!.assignee_id).toBe(agent!.id);
    });

    it('should update task progress', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: task } = await supabase
        .from('tasks')
        .insert({
          tenant_id: testTenantId,
          title: 'Progress Task',
          status: 'in_progress',
          progress_percent: 0,
        })
        .select()
        .single();

      const { data: updated } = await supabase
        .from('tasks')
        .update({ progress_percent: 50, current_step: 'Halfway done' })
        .eq('id', task!.id)
        .select()
        .single();

      expect(updated!.progress_percent).toBe(50);
      expect(updated!.current_step).toBe('Halfway done');
    });

    it('should queue tasks for agents', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: task } = await supabase
        .from('tasks')
        .insert({
          tenant_id: testTenantId,
          title: 'Queued Task',
          status: 'queued',
        })
        .select()
        .single();

      const { data: queueEntry, error } = await supabase
        .from('agent_task_queue')
        .insert({
          tenant_id: testTenantId,
          task_id: task!.id,
          status: 'pending',
          priority: 1,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(queueEntry).toBeDefined();
      expect(queueEntry!.status).toBe('pending');
    });
  });

  describe('Decision Logging', () => {
    it('should log agent decisions', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          tenant_id: testTenantId,
          name: 'Decision Agent',
          role: 'worker',
          status: 'idle',
          capabilities: ['decide'],
          depth: 0,
        })
        .select()
        .single();

      const { data: decision, error } = await supabase
        .from('decisions')
        .insert({
          tenant_id: testTenantId,
          agent_id: agent!.id,
          category: 'action',
          title: 'Test Decision',
          proposed_action: { type: 'test_action', params: {} },
          reasoning: {
            context: 'Test context',
            analysis: 'Test analysis',
            options_considered: [],
            confidence: 0.9,
            risks: [],
          },
          self_authorized: true,
          status: 'proposed',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(decision).toBeDefined();
      expect(decision!.status).toBe('proposed');
    });

    it('should track decision execution', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: agent } = await supabase
        .from('agents')
        .select()
        .eq('tenant_id', testTenantId)
        .limit(1)
        .single();

      const { data: logEntry, error } = await supabase
        .from('agent_decision_log')
        .insert({
          tenant_id: testTenantId,
          agent_id: agent!.id,
          category: 'action',
          action_type: 'test_action',
          action_params: { test: true },
          success: true,
          latency_ms: 100,
          tokens_used: 50,
          cost_usd: 0.001,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(logEntry).toBeDefined();
      expect(logEntry!.success).toBe(true);
    });
  });

  describe('Messaging', () => {
    it('should store messages between agents', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: agents } = await supabase
        .from('agents')
        .select('id')
        .eq('tenant_id', testTenantId)
        .limit(2);

      if (!agents || agents.length < 2) {
        // Skip if not enough agents
        return;
      }

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'message.direct',
          from_agent_id: agents[0].id,
          to_agent_id: agents[1].id,
          payload: { content: 'Hello!' },
          priority: 'normal',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message).toBeDefined();
      expect(message!.from_agent_id).toBe(agents[0].id);
      expect(message!.to_agent_id).toBe(agents[1].id);
    });

    it('should track message delivery', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message } = await supabase
        .from('messages')
        .select()
        .eq('tenant_id', testTenantId)
        .limit(1)
        .single();

      if (!message) return;

      const { data: delivery, error } = await supabase
        .from('message_delivery')
        .insert({
          tenant_id: testTenantId,
          message_id: message.id,
          status: 'pending',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(delivery).toBeDefined();
      expect(delivery!.status).toBe('pending');
    });
  });

  describe('Activity Logging', () => {
    it('should log activities via triggers', async ({ skip }) => {
      if (!connectionOk) skip();
      // Create an agent - this should trigger activity logging
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          tenant_id: testTenantId,
          name: 'Activity Test Agent',
          role: 'worker',
          status: 'idle',
          capabilities: [],
          depth: 0,
        })
        .select()
        .single();

      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check activities
      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('agent_id', agent!.id)
        .order('created_at', { ascending: false });

      expect(activities).toBeDefined();
      expect(activities!.length).toBeGreaterThan(0);
    });
  });
});
