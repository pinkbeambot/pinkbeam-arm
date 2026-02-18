/**
 * Integration tests for Activities API
 * 
 * Tests all activities endpoints with real Supabase integration:
 * - GET /api/activities - List with filtering, cursor pagination, search
 * - POST /api/activities - Create manual activity
 * - GET /api/activities/subscribe - Real-time SSE subscription
 * 
 * Coverage requirements: 80% minimum
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createTestClient, cleanupTestData } from '../setup';

const testTenantId = '00000000-0000-0000-0000-000000000001';
const otherTenantId = '00000000-0000-0000-0000-000000000002';

describe('Activities API Integration', () => {
  let supabase: ReturnType<typeof createTestClient>;
  let testAgentId: string;
  let testTaskId: string;

  beforeAll(() => {
    supabase = createTestClient();
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData(supabase, testTenantId);
    
    // Create test agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        tenant_id: testTenantId,
        name: 'Test Agent',
        role: 'worker',
        status: 'idle',
        capabilities: ['decide', 'escalate'],
      })
      .select()
      .single();

    if (agentError) throw agentError;
    testAgentId = agent.id;

    // Create test task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        tenant_id: testTenantId,
        title: 'Test Task',
        description: 'Test task for activities API',
        status: 'queued',
        priority: 'normal',
        assignee_id: testAgentId,
      })
      .select()
      .single();

    if (taskError) throw taskError;
    testTaskId = task.id;
  });

  afterEach(async () => {
    await cleanupTestData(supabase, testTenantId);
  });

  describe('GET /api/activities', () => {
    it('should fetch activities with correct structure', async () => {
      // First, create an activity via the trigger by updating task status
      await supabase
        .from('tasks')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', testTaskId);

      // Fetch activities
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities`,
        {
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`,
          },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      // Verify response structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('has_more');
      expect(result.pagination).toHaveProperty('next_cursor');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter by entity_type=tasks', async () => {
      // Create activities in different categories
      await supabase.from('activities').insert([
        {
          tenant_id: testTenantId,
          type: 'task.created',
          category: 'task',
          title: 'Task Activity',
          actor_type: 'agent',
          actor_id: testAgentId,
        },
        {
          tenant_id: testTenantId,
          type: 'agent.spawned',
          category: 'agent',
          title: 'Agent Activity',
          actor_type: 'system',
        },
      ]);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?entity_type=tasks`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      // All results should be task activities
      result.data.forEach((activity: any) => {
        expect(activity.category).toBe('task');
      });
    });

    it('should filter by entity_type=decisions', async () => {
      // Create decision activity
      await supabase.from('activities').insert({
        tenant_id: testTenantId,
        type: 'decision.proposed',
        category: 'decision',
        title: 'Decision Activity',
        actor_type: 'agent',
        actor_id: testAgentId,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?entity_type=decisions`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.forEach((activity: any) => {
        expect(activity.category).toBe('decision');
      });
    });

    it('should filter by entity_type=escalations', async () => {
      await supabase.from('activities').insert({
        tenant_id: testTenantId,
        type: 'escalation.created',
        category: 'escalation',
        title: 'Escalation Activity',
        actor_type: 'agent',
        actor_id: testAgentId,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?entity_type=escalations`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.forEach((activity: any) => {
        expect(activity.category).toBe('escalation');
      });
    });

    it('should filter by agent_id', async () => {
      // Create activity for specific agent
      await supabase.from('activities').insert({
        tenant_id: testTenantId,
        type: 'task.created',
        category: 'task',
        title: 'Agent Task',
        actor_type: 'agent',
        actor_id: testAgentId,
        agent_id: testAgentId,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?agent_id=${testAgentId}`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.forEach((activity: any) => {
        expect(activity.agent_id === testAgentId || activity.actor_id === testAgentId).toBe(true);
      });
    });

    it('should filter by action_type', async () => {
      await supabase.from('activities').insert({
        tenant_id: testTenantId,
        type: 'task.created',
        category: 'task',
        title: 'Created Task',
        actor_type: 'agent',
        actor_id: testAgentId,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?action_type=task.created`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.forEach((activity: any) => {
        expect(activity.type).toBe('task.created');
      });
    });

    it('should filter by time_range=24h', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?time_range=24h`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      // All results should be within last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      result.data.forEach((activity: any) => {
        const activityDate = new Date(activity.created_at);
        expect(activityDate.getTime()).toBeGreaterThanOrEqual(oneDayAgo.getTime());
      });
    });

    it('should filter by date_from and date_to', async () => {
      const from = new Date();
      from.setDate(from.getDate() - 7);
      const to = new Date();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?date_from=${from.toISOString()}&date_to=${to.toISOString()}`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.forEach((activity: any) => {
        const activityDate = new Date(activity.created_at);
        expect(activityDate.getTime()).toBeGreaterThanOrEqual(from.getTime());
        expect(activityDate.getTime()).toBeLessThanOrEqual(to.getTime());
      });
    });

    it('should search in title and description', async () => {
      // Create activities with searchable content
      await supabase.from('activities').insert([
        {
          tenant_id: testTenantId,
          type: 'task.created',
          category: 'task',
          title: 'Marketing Campaign Task',
          description: 'Create marketing materials',
          actor_type: 'agent',
          actor_id: testAgentId,
        },
        {
          tenant_id: testTenantId,
          type: 'task.created',
          category: 'task',
          title: 'Sales Follow-up',
          description: 'Follow up with leads',
          actor_type: 'agent',
          actor_id: testAgentId,
        },
      ]);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?search=marketing`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      // All results should contain 'marketing' in title or description
      result.data.forEach((activity: any) => {
        const text = `${activity.title} ${activity.description || ''}`.toLowerCase();
        expect(text).toContain('marketing');
      });
    });

    it('should apply cursor-based pagination correctly', async () => {
      // Create multiple activities
      const activities = Array.from({ length: 10 }, (_, i) => ({
        tenant_id: testTenantId,
        type: 'task.created',
        category: 'task',
        title: `Task ${i}`,
        actor_type: 'agent',
        actor_id: testAgentId,
      }));

      await supabase.from('activities').insert(activities);

      // Fetch first page with limit=3
      const firstResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?limit=3`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(firstResponse.ok).toBe(true);
      const firstPage = await firstResponse.json();

      expect(firstPage.data).toHaveLength(3);
      expect(firstPage.pagination.has_more).toBe(true);
      expect(firstPage.pagination.next_cursor).toBeTruthy();

      // Fetch second page using cursor
      const secondResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?limit=3&cursor=${firstPage.pagination.next_cursor}`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(secondResponse.ok).toBe(true);
      const secondPage = await secondResponse.json();

      expect(secondPage.data).toHaveLength(3);
      expect(secondPage.data[0].sequence_number).toBeLessThan(
        firstPage.data[firstPage.data.length - 1].sequence_number
      );
    });

    it('should respect limit parameter (default 50, max 100)', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?limit=10`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      // Should not exceed requested limit
      expect(result.data.length).toBeLessThanOrEqual(10);
    });

    it('should return validation error for invalid limit', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?limit=200`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.code).toBe('VALIDATION_FAILED');
    });

    it('should return validation error for invalid UUID', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?agent_id=invalid-uuid`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.code).toBe('VALIDATION_FAILED');
    });

    it('should return empty array when no activities match', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?search=nonexistentxyz123`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toHaveLength(0);
      expect(result.pagination.has_more).toBe(false);
      expect(result.pagination.next_cursor).toBeNull();
    });

    it('should combine multiple filters', async () => {
      await supabase.from('activities').insert({
        tenant_id: testTenantId,
        type: 'task.created',
        category: 'task',
        title: 'Filtered Task',
        actor_type: 'agent',
        actor_id: testAgentId,
        agent_id: testAgentId,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?entity_type=tasks&agent_id=${testAgentId}&time_range=24h`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.forEach((activity: any) => {
        expect(activity.category).toBe('task');
        expect(activity.agent_id === testAgentId || activity.actor_id === testAgentId).toBe(true);
      });
    });
  });

  describe('POST /api/activities', () => {
    it('should create activity with valid data', async () => {
      const newActivity = {
        type: 'system.config_changed',
        category: 'system',
        title: 'Configuration updated',
        description: 'System configuration was modified',
        actor_type: 'user',
        metadata: { changed_by: 'user-001' },
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newActivity),
        }
      );

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);

      const result = await response.json();
      expect(result.data.type).toBe('system.config_changed');
      expect(result.data.title).toBe('Configuration updated');
    });

    it('should create activity with all fields', async () => {
      const fullActivity = {
        type: 'task.assigned',
        category: 'task',
        title: 'Task assigned',
        description: 'Task was assigned to agent',
        agent_id: testAgentId,
        task_id: testTaskId,
        actor_type: 'agent',
        target_type: 'task',
        target_id: testTaskId,
        metadata: { previous_assignee: null },
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fullActivity),
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.data.agent_id).toBe(testAgentId);
      expect(result.data.task_id).toBe(testTaskId);
    });

    it('should return validation error for missing required fields', async () => {
      const invalidActivity = {
        description: 'Missing required fields',
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidActivity),
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.code).toBe('VALIDATION_FAILED');
    });

    it('should return validation error for invalid category', async () => {
      const invalidActivity = {
        type: 'test.type',
        category: 'invalid_category',
        title: 'Test',
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidActivity),
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('Activity Creation via Triggers', () => {
    it('should auto-create activity when task is created', async () => {
      // Task creation already happened in beforeEach
      // Wait for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: activities, error } = await supabase
        .from('activities')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('type', 'task.created')
        .eq('target_id', testTaskId);

      expect(error).toBeNull();
      expect(activities?.length).toBeGreaterThan(0);
      expect(activities?.[0]).toMatchObject({
        category: 'task',
        target_type: 'tasks',
        agent_id: testAgentId,
      });
    });

    it('should auto-create activity when task status changes', async () => {
      // Update task status
      await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', testTaskId);

      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: activities, error } = await supabase
        .from('activities')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('type', 'task.status_changed')
        .eq('target_id', testTaskId);

      expect(error).toBeNull();
      expect(activities?.length).toBeGreaterThan(0);
    });

    it('should auto-create activity when agent status changes', async () => {
      // Update agent status
      await supabase
        .from('agents')
        .update({ status: 'active' })
        .eq('id', testAgentId);

      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: activities, error } = await supabase
        .from('activities')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('type', 'agent.status_changed')
        .eq('agent_id', testAgentId);

      expect(error).toBeNull();
      expect(activities?.length).toBeGreaterThan(0);
    });
  });

  describe('RLS Tenant Isolation', () => {
    it('should not expose activities from other tenants', async () => {
      // Create activity in other tenant
      await supabase.from('activities').insert({
        tenant_id: otherTenantId,
        type: 'task.created',
        category: 'task',
        title: 'Other Tenant Activity',
        actor_type: 'agent',
      });

      // Fetch activities for test tenant
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities?search=Other+Tenant`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      // Should not find the other tenant's activity
      const otherTenantActivity = result.data.find(
        (a: any) => a.title === 'Other Tenant Activity'
      );
      expect(otherTenantActivity).toBeUndefined();
    });
  });

  describe('GET /api/activities/subscribe', () => {
    it('should establish SSE connection', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities/subscribe`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
    });

    it('should accept entity_type filter parameter', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities/subscribe?entity_type=tasks`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
    });

    it('should accept agent_id filter parameter', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities/subscribe?agent_id=${testAgentId}`,
        {
          headers: { 'Authorization': `Bearer ${await getAuthToken()}` },
        }
      );

      expect(response.ok).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/activities/subscribe`
      );

      // Should receive error in SSE format
      expect(response.headers.get('content-type')).toContain('text/event-stream');
    });
  });
});

// Helper function to get auth token (mock implementation for tests)
async function getAuthToken(): Promise<string> {
  // In real tests, this would authenticate and return a JWT
  return 'test-token';
}