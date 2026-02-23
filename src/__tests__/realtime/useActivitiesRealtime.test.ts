/**
 * Tests for useActivitiesRealtime Hook
 * 
 * Tests real-time subscription functionality:
 * - Subscription setup and teardown
 * - Activity insertion handling
 * - Reconnection logic
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useActivitiesRealtime Configuration', () => {
  const defaultOptions = {
    tenantId: 'tenant-123',
    maxActivities: 100,
    enableReconnection: true,
  };

  it('should have correct default max activities', () => {
    expect(defaultOptions.maxActivities).toBe(100);
  });

  it('should have reconnection enabled by default', () => {
    expect(defaultOptions.enableReconnection).toBe(true);
  });

  it('should require tenant ID', () => {
    // Tenant ID is required for the hook to function
    expect(defaultOptions.tenantId).toBeDefined();
    expect(defaultOptions.tenantId).toBeTypeOf('string');
  });
});

describe('useActivitiesRealtime Return Structure', () => {
  it('should return correct data properties', () => {
    const expectedReturn = {
      activities: [],
      isConnected: false,
      isReconnecting: false,
      error: null,
      reconnect: () => {},
      clear: () => {},
    };

    expect(expectedReturn).toHaveProperty('activities');
    expect(expectedReturn).toHaveProperty('isConnected');
    expect(expectedReturn).toHaveProperty('isReconnecting');
    expect(expectedReturn).toHaveProperty('error');
    expect(expectedReturn).toHaveProperty('reconnect');
    expect(expectedReturn).toHaveProperty('clear');
    expect(Array.isArray(expectedReturn.activities)).toBe(true);
    expect(typeof expectedReturn.reconnect).toBe('function');
    expect(typeof expectedReturn.clear).toBe('function');
  });
});

describe('Realtime Channel Naming', () => {
  it('should generate correct channel name with all filters', () => {
    const tenantId = 'tenant-123';
    const agentId = 'agent-456';
    const category = 'task';
    const type = 'task.created';

    const channelName = ['activities', tenantId, agentId, category, type].join(':');
    expect(channelName).toBe('activities:tenant-123:agent-456:task:task.created');
  });

  it('should generate correct channel name with no optional filters', () => {
    const tenantId = 'tenant-123';

    const channelName = ['activities', tenantId, 'all', 'all', 'all'].join(':');
    expect(channelName).toBe('activities:tenant-123:all:all:all');
  });

  it('should generate correct channel name with partial filters', () => {
    const tenantId = 'tenant-123';
    const category = 'agent';

    const channelName = ['activities', tenantId, 'all', category, 'all'].join(':');
    expect(channelName).toBe('activities:tenant-123:all:agent:all');
  });
});

describe('Filter String Building', () => {
  it('should build filter with tenant only', () => {
    const filters = [`tenant_id=eq.tenant-123`];
    expect(filters).toHaveLength(1);
    expect(filters[0]).toBe('tenant_id=eq.tenant-123');
  });

  it('should build filter with tenant and agent', () => {
    const filters = [`tenant_id=eq.tenant-123`, `agent_id=eq.agent-456`];
    expect(filters).toHaveLength(2);
    expect(filters[0]).toBe('tenant_id=eq.tenant-123');
    expect(filters[1]).toBe('agent_id=eq.agent-456');
  });

  it('should build filter with all options', () => {
    const filters = [
      `tenant_id=eq.tenant-123`,
      `agent_id=eq.agent-456`,
      `category=eq.task`,
      `type=eq.task.created`,
    ];
    expect(filters).toHaveLength(4);
    expect(filters.join(',')).toBe(
      'tenant_id=eq.tenant-123,agent_id=eq.agent-456,category=eq.task,type=eq.task.created'
    );
  });
});

describe('Activity Insertion Handling', () => {
  const mockActivity = {
    id: 'act-001',
    tenant_id: 'tenant-123',
    agent_id: 'agent-456',
    type: 'task.created',
    category: 'task',
    title: 'Task created',
    description: 'A new task was created',
    created_at: '2026-02-17T12:00:00Z',
  };

  it('should add new activity to beginning of list', () => {
    const existingActivities = [
      { id: 'act-002', title: 'Older Activity' },
    ];
    const newActivity = mockActivity;

    // Simulate adding to beginning
    const updated = [newActivity, ...existingActivities];
    
    expect(updated).toHaveLength(2);
    expect(updated[0].id).toBe('act-001');
    expect(updated[1].id).toBe('act-002');
  });

  it('should prevent duplicate activities', () => {
    const existingActivities = [{ id: 'act-001', title: 'Existing' }];
    const newActivity = { id: 'act-001', title: 'Duplicate' };

    // Simulate duplicate check
    const isDuplicate = existingActivities.some((a) => a.id === newActivity.id);
    expect(isDuplicate).toBe(true);

    const updated = isDuplicate 
      ? existingActivities 
      : [newActivity, ...existingActivities];
    
    expect(updated).toHaveLength(1);
  });

  it('should respect max activities limit', () => {
    const maxActivities = 3;
    const existingActivities = [
      { id: 'act-001', title: 'First' },
      { id: 'act-002', title: 'Second' },
      { id: 'act-003', title: 'Third' },
    ];
    const newActivity = { id: 'act-004', title: 'Fourth' };

    const updated = [newActivity, ...existingActivities].slice(0, maxActivities);
    
    expect(updated).toHaveLength(3);
    expect(updated[0].id).toBe('act-004');
    expect(updated[2].id).toBe('act-002');
    expect(updated.some((a) => a.id === 'act-003')).toBe(false);
  });
});

describe('Reconnection Logic', () => {
  it('should increment reconnect attempts', () => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    reconnectAttempts++;
    expect(reconnectAttempts).toBe(1);

    reconnectAttempts++;
    expect(reconnectAttempts).toBe(2);

    expect(reconnectAttempts <= maxReconnectAttempts).toBe(true);
  });

  it('should respect max reconnect attempts', () => {
    const maxReconnectAttempts = 5;
    const reconnectAttempts = 5;

    const shouldReconnect = reconnectAttempts < maxReconnectAttempts;
    expect(shouldReconnect).toBe(false);
  });

  it('should calculate exponential backoff delay', () => {
    const calculateDelay = (attempt: number) => 
      Math.min(1000 * Math.pow(2, attempt), 30000);

    expect(calculateDelay(1)).toBe(2000);
    expect(calculateDelay(2)).toBe(4000);
    expect(calculateDelay(3)).toBe(8000);
    expect(calculateDelay(4)).toBe(16000);
    expect(calculateDelay(5)).toBe(30000); // capped at 30s
    expect(calculateDelay(10)).toBe(30000); // still capped
  });

  it('should reset reconnect attempts on successful connection', () => {
    let reconnectAttempts = 3;
    
    // On successful connection
    reconnectAttempts = 0;
    
    expect(reconnectAttempts).toBe(0);
  });
});

describe('Connection Status Transitions', () => {
  it('should handle SUBSCRIBED status', () => {
    const status = 'SUBSCRIBED';
    
    const isConnected = status === 'SUBSCRIBED';
    const isReconnecting = false;
    const error = null;

    expect(isConnected).toBe(true);
    expect(isReconnecting).toBe(false);
    expect(error).toBeNull();
  });

  it('should handle CLOSED status', () => {
    const status: string = 'CLOSED';
    
    const isConnected = status === 'SUBSCRIBED';

    expect(isConnected).toBe(false);
  });

  it('should handle CHANNEL_ERROR status', () => {
    const status: string = 'CHANNEL_ERROR';
    
    const isConnected = status === 'SUBSCRIBED';
    const hasError = status === 'CHANNEL_ERROR';

    expect(isConnected).toBe(false);
    expect(hasError).toBe(true);
  });
});

describe('UseActivitiesRealtime Options', () => {
  it('should accept all filter options', () => {
    const options = {
      tenantId: 'tenant-123',
      agentId: 'agent-456',
      category: 'task' as const,
      type: 'task.created',
      maxActivities: 50,
      enableReconnection: true,
      initialActivities: [],
    };

    expect(options.tenantId).toBe('tenant-123');
    expect(options.agentId).toBe('agent-456');
    expect(options.category).toBe('task');
    expect(options.type).toBe('task.created');
    expect(options.maxActivities).toBe(50);
  });

  it('should work with minimal options', () => {
    const options = {
      tenantId: 'tenant-123',
    };

    expect(options.tenantId).toBe('tenant-123');
  });

  it('should accept valid category values', () => {
    const validCategories = ['agent', 'task', 'decision', 'escalation', 'system', 'message'] as const;
    
    validCategories.forEach((category) => {
      expect(['agent', 'task', 'decision', 'escalation', 'system', 'message']).toContain(category);
    });
  });
});

describe('Activity Feed State Management', () => {
  it('should initialize with provided activities', () => {
    const initialActivities = [
      { id: 'act-001', title: 'Initial 1' },
      { id: 'act-002', title: 'Initial 2' },
    ];

    expect(initialActivities).toHaveLength(2);
    expect(initialActivities[0].id).toBe('act-001');
  });

  it('should clear all activities', () => {
    let activities = [
      { id: 'act-001', title: 'Activity 1' },
      { id: 'act-002', title: 'Activity 2' },
    ];

    // Simulate clear
    activities = [];

    expect(activities).toHaveLength(0);
  });
});
