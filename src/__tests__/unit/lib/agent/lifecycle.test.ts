/**
 * Agent Lifecycle Manager Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AgentLifecycleManager,
  createLifecycleManager,
  RECOVERY_STRATEGIES
} from '@/lib/agent/lifecycle';
import { AgentSpawner } from '@/lib/agent/spawner';

describe('AgentLifecycleManager', () => {
  let lifecycle: AgentLifecycleManager;
  let mockDb: any;
  let mockSpawner: any;

  beforeEach(() => {
    mockDb = {
      from: vi.fn(() => mockDb),
      select: vi.fn(() => mockDb),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => Promise.resolve({ error: null })),
      eq: vi.fn(() => mockDb),
      order: vi.fn(() => mockDb),
      limit: vi.fn(() => mockDb),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
    };

    mockSpawner = {
      getChildren: vi.fn(() => Promise.resolve([])),
      getAgentTree: vi.fn(() => Promise.resolve([]))
    };

    lifecycle = new AgentLifecycleManager(mockDb, mockSpawner);
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize agent from initializing state', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'initializing',
        configuration: {}
      };

      let callCount = 0;
      mockDb.single.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({ data: mockAgent, error: null });
        }
        return Promise.resolve({
          data: { ...mockAgent, status: 'idle' },
          error: null
        });
      });

      const result = await lifecycle.initialize({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.agent?.status).toBe('idle');
    });

    it('should fail if agent not found', async () => {
      mockDb.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const result = await lifecycle.initialize({
        agentId: 'nonexistent',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AGENT_NOT_FOUND');
    });

    it('should fail if agent not in initializing state', async () => {
      mockDb.single.mockResolvedValue({
        data: {
          id: 'agent-1',
          tenant_id: 'tenant-1',
          status: 'active',
          configuration: {}
        },
        error: null
      });

      const result = await lifecycle.initialize({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_STATE');
    });
  });

  describe('start', () => {
    it('should start agent from idle state', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'idle',
        current_task_id: null
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const result = await lifecycle.start({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(true);
    });

    it('should start agent from paused state', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'paused',
        current_task_id: null
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const result = await lifecycle.start({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(true);
    });

    it('should set current task if provided', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'idle',
        current_task_id: null
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const result = await lifecycle.start({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      }, 'task-123');

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-123');
    });

    it('should fail if agent not in valid start state', async () => {
      mockDb.single.mockResolvedValue({
        data: {
          id: 'agent-1',
          tenant_id: 'tenant-1',
          status: 'terminated'
        },
        error: null
      });

      const result = await lifecycle.start({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_STATE');
    });
  });

  describe('pause', () => {
    it('should pause active agent', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'active',
        current_task_id: 'task-1'
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const result = await lifecycle.pause({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('active');
    });

    it('should pause idle agent', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'idle',
        current_task_id: null
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const result = await lifecycle.pause({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('idle');
    });

    it('should suspend current task when pausing', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'active',
        current_task_id: 'task-1'
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      await lifecycle.pause({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should fail if agent not in pausable state', async () => {
      mockDb.single.mockResolvedValue({
        data: {
          id: 'agent-1',
          tenant_id: 'tenant-1',
          status: 'terminated'
        },
        error: null
      });

      const result = await lifecycle.pause({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_STATE');
    });
  });

  describe('resume', () => {
    it('should resume paused agent to previous state', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'paused',
        configuration: {}
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      // Mock getting paused state
      mockDb.select.mockReturnValueOnce({
        ...mockDb,
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { previous_status: 'active' },
                  error: null
                })
              }))
            }))
          }))
        }))
      });

      const result = await lifecycle.resume({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(true);
    });

    it('should fail if agent not in paused state', async () => {
      mockDb.single.mockResolvedValue({
        data: {
          id: 'agent-1',
          tenant_id: 'tenant-1',
          status: 'active'
        },
        error: null
      });

      const result = await lifecycle.resume({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_STATE');
    });
  });

  describe('terminate', () => {
    it('should terminate idle agent', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'idle',
        current_task_id: null,
        configuration: {}
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });
      mockSpawner.getChildren.mockResolvedValue([]);

      const result = await lifecycle.terminate({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.archived).toBe(true);
    });

    it('should fail if agent already terminated', async () => {
      mockDb.single.mockResolvedValue({
        data: {
          id: 'agent-1',
          tenant_id: 'tenant-1',
          status: 'terminated'
        },
        error: null
      });

      const result = await lifecycle.terminate({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_STATE');
    });

    it('should fail if active children without force', async () => {
      mockDb.single.mockResolvedValue({
        data: {
          id: 'agent-1',
          tenant_id: 'tenant-1',
          status: 'idle',
          configuration: {}
        },
        error: null
      });

      mockSpawner.getChildren.mockResolvedValue([
        { id: 'child-1', status: 'active' }
      ]);

      const result = await lifecycle.terminate({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CHILDREN_ACTIVE');
      expect(result.error?.retryable).toBe(true);
    });

    it('should force terminate with active children', async () => {
      mockDb.single.mockResolvedValue({
        data: {
          id: 'agent-1',
          tenant_id: 'tenant-1',
          status: 'idle',
          current_task_id: null,
          configuration: {}
        },
        error: null
      });

      mockSpawner.getChildren.mockResolvedValue([
        { id: 'child-1', status: 'active' }
      ]);

      const result = await lifecycle.terminate({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      }, true);

      expect(result.success).toBe(true);
    });

    it('should cancel current task when terminating', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'active',
        current_task_id: 'task-1',
        configuration: {}
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });
      mockSpawner.getChildren.mockResolvedValue([]);

      await lifecycle.terminate({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('handleError', () => {
    it('should handle error and recover for transient errors', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'active',
        configuration: {}
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const error = new Error('Network timeout occurred');
      const result = await lifecycle.handleError({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'system'
      }, error);

      expect(result.success).toBe(true);
      expect(result.recoveredFrom).toBe('active');
      expect(result.newStatus).toBe('active');
    });

    it('should block agent for escalation errors', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'active',
        configuration: {}
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const error = new Error('Needs human escalation');
      const result = await lifecycle.handleError({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'system'
      }, error);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('blocked');
    });

    it('should enter error state for unknown errors', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'active',
        configuration: {}
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const error = new Error('Something unexpected happened');
      const result = await lifecycle.handleError({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'system'
      }, error);

      expect(result.success).toBe(false);
      expect(result.newStatus).toBe('error');
    });

    it('should fail if agent not found', async () => {
      mockDb.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const result = await lifecycle.handleError({
        agentId: 'nonexistent',
        tenantId: 'tenant-1',
        triggeredBy: 'system'
      }, new Error('Test error'));

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AGENT_NOT_FOUND');
    });
  });

  describe('setError', () => {
    it('should force agent into error state', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'active',
        configuration: {}
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const result = await lifecycle.setError({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'system'
      }, 'Forced error for testing');

      expect(result.success).toBe(false);
      expect(result.newStatus).toBe('error');
    });
  });

  describe('block/unblock', () => {
    it('should block agent with escalation', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'active',
        configuration: {}
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const result = await lifecycle.block({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'system'
      }, 'escalation-1', 'Waiting for approval');

      expect(result.success).toBe(true);
    });

    it('should unblock agent after escalation resolved', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        status: 'blocked',
        configuration: { blockedByEscalation: 'escalation-1' }
      };

      mockDb.single.mockResolvedValue({ data: mockAgent, error: null });

      const result = await lifecycle.unblock({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.restoredStatus).toBe('active');
    });

    it('should fail unblock if agent not blocked', async () => {
      mockDb.single.mockResolvedValue({
        data: {
          id: 'agent-1',
          tenant_id: 'tenant-1',
          status: 'active'
        },
        error: null
      });

      const result = await lifecycle.unblock({
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_STATE');
    });
  });
});

describe('RECOVERY_STRATEGIES', () => {
  it('should have transient error recovery strategy', () => {
    const strategy = RECOVERY_STRATEGIES.find(s => s.name === 'transient_error_recovery');
    expect(strategy).toBeDefined();
    
    expect(strategy!.condition({} as any, new Error('timeout'))).toBe(true);
    expect(strategy!.condition({} as any, new Error('rate_limit'))).toBe(true);
    expect(strategy!.condition({} as any, new Error('other error'))).toBe(false);
  });

  it('should have escalation recovery strategy', () => {
    const strategy = RECOVERY_STRATEGIES.find(s => s.name === 'escalation_recovery');
    expect(strategy).toBeDefined();
    
    expect(strategy!.condition({} as any, new Error('needs escalation'))).toBe(true);
    expect(strategy!.condition({} as any, new Error('other error'))).toBe(false);
  });

  it('should have default recovery strategy', () => {
    const strategy = RECOVERY_STRATEGIES.find(s => s.name === 'default_recovery');
    expect(strategy).toBeDefined();
    expect(strategy!.condition({} as any, new Error('anything'))).toBe(true);
  });
});

describe('createLifecycleManager', () => {
  it('should create lifecycle manager instance', () => {
    const db = {} as any;
    const manager = createLifecycleManager(db);
    expect(manager).toBeInstanceOf(AgentLifecycleManager);
  });

  it('should accept optional spawner', () => {
    const db = {} as any;
    const spawner = {} as any;
    const manager = createLifecycleManager(db, spawner);
    expect(manager).toBeInstanceOf(AgentLifecycleManager);
  });
});
