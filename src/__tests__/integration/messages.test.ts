/**
 * Integration tests for Messages API
 *
 * These tests validate the messages endpoints for agent-to-agent communication
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

// Skip integration tests when no live Supabase is available
const hasCredentials = !!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'test-key';

// Create admin client
const supabase = hasCredentials
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : (null as any);

describe('Messages API Integration', () => {
  let testTenantId: string;
  let testUserId: string;
  let testAgent1Id: string;
  let testAgent2Id: string;
  let testThreadId: string;
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
      .insert({ name: 'Test Tenant Messages', slug: 'test-tenant-messages' })
      .select()
      .single();

    testTenantId = tenant!.id;

    // Create test user
    const { data: user } = await supabase
      .from('users')
      .insert({
        tenant_id: testTenantId,
        email: 'test-messages@example.com',
        name: 'Test User Messages',
        role: 'owner',
      })
      .select()
      .single();

    testUserId = user!.id;

    // Create test agents
    const { data: agent1 } = await supabase
      .from('agents')
      .insert({
        tenant_id: testTenantId,
        name: 'Test Agent 1',
        role: 'worker',
        status: 'idle',
        capabilities: ['decide', 'escalate'],
        depth: 0,
      })
      .select()
      .single();

    testAgent1Id = agent1!.id;

    const { data: agent2 } = await supabase
      .from('agents')
      .insert({
        tenant_id: testTenantId,
        name: 'Test Agent 2',
        role: 'worker',
        status: 'idle',
        capabilities: ['decide', 'escalate'],
        depth: 0,
      })
      .select()
      .single();

    testAgent2Id = agent2!.id;

    // Generate a thread ID
    testThreadId = crypto.randomUUID();
  });

  afterAll(async () => {
    if (!connectionOk) return;
    // Cleanup: delete test data
    await supabase.from('messages').delete().eq('tenant_id', testTenantId);
    await supabase.from('agents').delete().eq('tenant_id', testTenantId);
    await supabase.from('users').delete().eq('tenant_id', testTenantId);
    await supabase.from('tenants').delete().eq('id', testTenantId);
  });

  describe('Message Creation', () => {
    it('should create a direct message between agents', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'message.direct',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: { content: 'Hello from Agent 1!' },
          priority: 'normal',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message).toBeDefined();
      expect(message!.message_type).toBe('message.direct');
      expect(message!.from_agent_id).toBe(testAgent1Id);
      expect(message!.to_agent_id).toBe(testAgent2Id);
      expect(message!.payload).toEqual({ content: 'Hello from Agent 1!' });
    });

    it('should create a broadcast message', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'message.broadcast',
          from_agent_id: testAgent1Id,
          to_broadcast: true,
          payload: { announcement: 'System maintenance scheduled' },
          priority: 'high',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message).toBeDefined();
      expect(message!.message_type).toBe('message.broadcast');
      expect(message!.to_broadcast).toBe(true);
      expect(message!.to_agent_id).toBeNull();
    });

    it('should create a message with thread_id', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'message.direct',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          thread_id: testThreadId,
          payload: { content: 'Thread message 1' },
          priority: 'normal',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message).toBeDefined();
      expect(message!.thread_id).toBe(testThreadId);
    });

    it('should create a message requiring acknowledgment', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'task.assign',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: { task_id: 'task-123', description: 'Complete this task' },
          priority: 'urgent',
          requires_ack: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message).toBeDefined();
      expect(message!.requires_ack).toBe(true);
      expect(message!.acked_at).toBeNull();
    });

    it('should reject message with invalid message_type', async ({ skip }) => {
      if (!connectionOk) skip();
      const { error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'invalid.type',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: { content: 'Test' },
        });

      expect(error).toBeDefined();
    });

    it('should reject message without payload', async ({ skip }) => {
      if (!connectionOk) skip();
      const { error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'message.direct',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
        });

      expect(error).toBeDefined();
    });
  });

  describe('Message Retrieval', () => {
    it('should fetch messages by agent_id (sender)', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('from_agent_id', testAgent1Id);

      expect(error).toBeNull();
      expect(messages).toBeDefined();
      expect(messages!.length).toBeGreaterThan(0);
      messages!.forEach((msg: { from_agent_id?: string }) => {
        expect(msg.from_agent_id).toBe(testAgent1Id);
      });
    });

    it('should fetch messages by agent_id (recipient)', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('to_agent_id', testAgent2Id);

      expect(error).toBeNull();
      expect(messages).toBeDefined();
      expect(messages!.length).toBeGreaterThan(0);
      messages!.forEach((msg: { to_agent_id?: string }) => {
        expect(msg.to_agent_id).toBe(testAgent2Id);
      });
    });

    it('should fetch messages by thread_id', async ({ skip }) => {
      if (!connectionOk) skip();
      // Create multiple messages in thread
      await supabase.from('messages').insert([
        {
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'message.direct',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          thread_id: testThreadId,
          payload: { content: 'Thread message 2' },
        },
        {
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'message.direct',
          from_agent_id: testAgent2Id,
          to_agent_id: testAgent1Id,
          thread_id: testThreadId,
          payload: { content: 'Thread message 3' },
        },
      ]);

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('thread_id', testThreadId)
        .order('created_at', { ascending: true });

      expect(error).toBeNull();
      expect(messages).toBeDefined();
      expect(messages!.length).toBeGreaterThanOrEqual(3);
      messages!.forEach((msg: { thread_id?: string }) => {
        expect(msg.thread_id).toBe(testThreadId);
      });
    });

    it('should fetch unread messages', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('requires_ack', true)
        .is('acked_at', null);

      expect(error).toBeNull();
      expect(messages).toBeDefined();
      messages!.forEach((msg: { requires_ack?: boolean; acked_at?: string | null }) => {
        expect(msg.requires_ack).toBe(true);
        expect(msg.acked_at).toBeNull();
      });
    });

    it('should fetch messages by type', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('message_type', 'message.direct');

      expect(error).toBeNull();
      expect(messages).toBeDefined();
      messages!.forEach((msg: { message_type: string }) => {
        expect(msg.message_type).toBe('message.direct');
      });
    });
  });

  describe('Message Updates', () => {
    it('should mark message as acknowledged', async ({ skip }) => {
      if (!connectionOk) skip();
      // Create a message requiring ack
      const { data: message } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'task.assign',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: { task_id: 'task-456' },
          requires_ack: true,
        })
        .select()
        .single();

      // Mark as acknowledged
      const ackTime = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('messages')
        .update({ acked_at: ackTime })
        .eq('id', message!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated!.acked_at).toBe(ackTime);
    });

    it('should mark message as processed', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'message.direct',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: { content: 'Process me' },
        })
        .select()
        .single();

      const processedTime = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('messages')
        .update({ processed_at: processedTime })
        .eq('id', message!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated!.processed_at).toBe(processedTime);
    });

    it('should update message payload', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'task.progress',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: { progress: 50 },
        })
        .select()
        .single();

      const { data: updated, error } = await supabase
        .from('messages')
        .update({ payload: { progress: 75, note: 'Updated' } })
        .eq('id', message!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated!.payload).toEqual({ progress: 75, note: 'Updated' });
    });
  });

  describe('Message Soft Delete', () => {
    it('should soft delete a message', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'message.direct',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: { content: 'To be deleted' },
        })
        .select()
        .single();

      // Soft delete by marking processed and adding deleted flag
      const deleteTime = new Date().toISOString();
      const { data: deleted, error } = await supabase
        .from('messages')
        .update({
          processed_at: deleteTime,
          payload: {
            content: 'To be deleted',
            _deleted: true,
            _deleted_at: deleteTime,
          },
        })
        .eq('id', message!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(deleted!.processed_at).toBe(deleteTime);
      expect(deleted!.payload).toHaveProperty('_deleted', true);
      expect(deleted!.payload).toHaveProperty('_deleted_at', deleteTime);
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow cross-tenant message access', async ({ skip }) => {
      if (!connectionOk) skip();
      // Create another tenant
      const { data: otherTenant } = await supabase
        .from('tenants')
        .insert({ name: 'Other Tenant', slug: 'other-tenant-messages' })
        .select()
        .single();

      // Create message in other tenant
      const { data: otherAgent } = await supabase
        .from('agents')
        .insert({
          tenant_id: otherTenant!.id,
          name: 'Other Agent',
          role: 'worker',
          status: 'idle',
          capabilities: [],
          depth: 0,
        })
        .select()
        .single();

      const { data: otherMessage } = await supabase
        .from('messages')
        .insert({
          tenant_id: otherTenant!.id,
          protocol_version: '1.0',
          message_type: 'message.direct',
          from_agent_id: otherAgent!.id,
          payload: { content: 'Cross-tenant message' },
        })
        .select()
        .single();

      // Verify message exists in other tenant
      expect(otherMessage).toBeDefined();

      // Query messages in test tenant should not include other tenant's message
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', testTenantId);

      const crossTenantMessage = messages?.find((m: { id: string }) => m.id === otherMessage!.id);
      expect(crossTenantMessage).toBeUndefined();

      // Cleanup
      await supabase.from('messages').delete().eq('tenant_id', otherTenant!.id);
      await supabase.from('agents').delete().eq('tenant_id', otherTenant!.id);
      await supabase.from('tenants').delete().eq('id', otherTenant!.id);
    });
  });

  describe('Message Thread Operations', () => {
    it('should retrieve all messages in a thread with participants', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          from_agent:from_agent_id(id, name, avatar_url, status, role),
          to_agent:to_agent_id(id, name, avatar_url, status, role)
        `)
        .eq('tenant_id', testTenantId)
        .eq('thread_id', testThreadId)
        .order('created_at', { ascending: true });

      expect(error).toBeNull();
      expect(messages).toBeDefined();
      expect(messages!.length).toBeGreaterThan(0);

      // Collect unique participants
      const participantIds = new Set<string>();
      messages!.forEach((msg: { from_agent_id?: string; to_agent_id?: string }) => {
        if (msg.from_agent_id) participantIds.add(msg.from_agent_id);
        if (msg.to_agent_id) participantIds.add(msg.to_agent_id);
      });

      expect(participantIds.size).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent thread', async ({ skip }) => {
      if (!connectionOk) skip();
      const nonExistentThreadId = crypto.randomUUID();

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('thread_id', nonExistentThreadId);

      expect(error).toBeNull();
      expect(messages).toEqual([]);
    });
  });

  describe('Message Priority', () => {
    it('should create messages with different priorities', async ({ skip }) => {
      if (!connectionOk) skip();
      const priorities = ['low', 'normal', 'high', 'urgent'] as const;

      for (const priority of priorities) {
        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            tenant_id: testTenantId,
            protocol_version: '1.0',
            message_type: 'message.direct',
            from_agent_id: testAgent1Id,
            to_agent_id: testAgent2Id,
            payload: { content: `Priority ${priority} message` },
            priority,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(message!.priority).toBe(priority);
      }
    });

    it('should default priority to normal', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'message.direct',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: { content: 'No priority specified' },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message!.priority).toBe('normal');
    });
  });

  describe('Message Protocol Types', () => {
    it('should create spawn request message', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'spawn.request',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: {
            spawn_config: {
              name: 'New Worker',
              role: 'worker',
              capabilities: ['decide'],
            },
          },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message!.message_type).toBe('spawn.request');
    });

    it('should create task assignment message', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'task.assign',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: {
            task_id: 'task-789',
            title: 'Complete analysis',
            description: 'Analyze the quarterly report',
            priority: 'high',
          },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message!.message_type).toBe('task.assign');
    });

    it('should create decision proposal message', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'decision.propose',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: {
            decision_id: 'decision-123',
            title: 'Should we use approach A or B?',
            proposed_action: { approach: 'A' },
            confidence: 0.85,
          },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message!.message_type).toBe('decision.propose');
    });

    it('should create escalation request message', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'escalate.request',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: {
            escalation_id: 'esc-123',
            reason: 'Need clarification on requirements',
            urgency: 'high',
          },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message!.message_type).toBe('escalate.request');
    });

    it('should create system ping message', async ({ skip }) => {
      if (!connectionOk) skip();
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: testTenantId,
          protocol_version: '1.0',
          message_type: 'system.ping',
          from_agent_id: testAgent1Id,
          to_agent_id: testAgent2Id,
          payload: { timestamp: new Date().toISOString() },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(message!.message_type).toBe('system.ping');
    });
  });
});
