/**
 * Agent Context Manager Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AgentContextManager,
  createContextManager,
  DEFAULT_CONTEXT_CONFIG,
  CONTEXT_SUMMARY_TRUNCATION,
  ContextError
} from '@/lib/agent/context';

describe('AgentContextManager', () => {
  let contextManager: AgentContextManager;
  let mockDb: any;

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
      or: vi.fn(() => mockDb),
      gte: vi.fn(() => mockDb),
      lte: vi.fn(() => mockDb),
      in: vi.fn(() => mockDb)
    };

    contextManager = new AgentContextManager(mockDb);
    vi.clearAllMocks();
  });

  describe('Constants', () => {
    it('should have correct DEFAULT_CONTEXT_CONFIG', () => {
      expect(DEFAULT_CONTEXT_CONFIG.maxTokens).toBe(8000);
      expect(DEFAULT_CONTEXT_CONFIG.maxHistoryItems).toBe(50);
      expect(DEFAULT_CONTEXT_CONFIG.timeWindowHours).toBe(24);
      expect(DEFAULT_CONTEXT_CONFIG.includeParentContext).toBe(true);
    });

    it('should have correct CONTEXT_SUMMARY_TRUNCATION', () => {
      expect(CONTEXT_SUMMARY_TRUNCATION.taskDescription).toBe(500);
      expect(CONTEXT_SUMMARY_TRUNCATION.decisionReasoning).toBe(1000);
      expect(CONTEXT_SUMMARY_TRUNCATION.activityDescription).toBe(200);
    });
  });

  describe('buildContext', () => {
    it('should build complete context for agent', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        name: 'Test Agent',
        role: 'worker',
        capabilities: ['decide', 'escalate'],
        depth: 1,
        status: 'active',
        current_task_id: 'task-1',
        parent_id: null,
        configuration: {}
      };

      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        description: 'A test task',
        status: 'in_progress',
        priority: 'high',
        created_at: new Date().toISOString()
      };

      // Setup mock chain
      let callCount = 0;
      mockDb.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ data: mockAgent, error: null });
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      });

      mockDb.limit.mockReturnValue({
        ...mockDb,
        then: vi.fn((cb: any) => cb({ data: [mockTask], error: null }))
      });

      // Mock the query chain
      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({ data: mockTask, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const result = await contextManager.buildContext({
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        includeParentContext: false
      });

      expect(result.agent.id).toBe('agent-1');
      expect(result.agent.name).toBe('Test Agent');
      expect(result.agent.role).toBe('worker');
    });

    it('should throw ContextError if agent not found', async () => {
      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      await expect(contextManager.buildContext({
        tenantId: 'tenant-1',
        agentId: 'nonexistent'
      })).rejects.toThrow(ContextError);
    });

    it('should include parent context when requested', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        name: 'Child Agent',
        role: 'worker',
        capabilities: ['decide'],
        depth: 1,
        status: 'active',
        current_task_id: null,
        parent_id: 'parent-1',
        configuration: {}
      };

      const mockParent = {
        id: 'parent-1',
        tenant_id: 'tenant-1',
        name: 'Parent Agent',
        role: 'manager',
        configuration: {
          goal: 'Manage team',
          inheritedContext: { key: 'value' }
        }
      };

      let callCount = 0;
      mockDb.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ data: mockAgent, error: null });
        return Promise.resolve({ data: mockParent, error: null });
      });

      mockDb.limit.mockResolvedValue({ data: [], error: null });

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAgent, error: null })
          .mockResolvedValueOnce({ data: mockTask, error: null })
          .mockResolvedValueOnce({ data: mockParent, error: null })
      };

      const mockTask = {
        id: 'task-1',
        title: 'Current Task',
        status: 'in_progress',
        priority: 'high',
        created_at: new Date().toISOString()
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const result = await contextManager.buildContext({
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        includeParentContext: true
      });

      expect(result.metadata.includesParentContext).toBe(true);
    });
  });

  describe('buildTaskContext', () => {
    it('should build context for specific task', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        name: 'Test Agent',
        role: 'worker',
        capabilities: ['decide'],
        depth: 1,
        status: 'active',
        current_task_id: 'task-1',
        parent_id: null,
        configuration: {}
      };

      const mockTask = {
        id: 'task-1',
        title: 'Specific Task',
        description: 'Task description',
        status: 'in_progress',
        priority: 'urgent',
        created_at: new Date().toISOString()
      };

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAgent, error: null })
          .mockResolvedValueOnce({ data: mockTask, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const result = await contextManager.buildTaskContext('tenant-1', 'agent-1', 'task-1');

      expect(result.state.currentTaskId).toBe('task-1');
      expect(result.state.currentTask?.title).toBe('Specific Task');
    });
  });

  describe('buildMinimalContext', () => {
    it('should build minimal context', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        name: 'Test Agent',
        role: 'worker',
        capabilities: ['decide'],
        depth: 1,
        status: 'idle',
        current_task_id: null
      };

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAgent, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const result = await contextManager.buildMinimalContext('tenant-1', 'agent-1');

      expect(result.agent.id).toBe('agent-1');
      expect(result.agent.name).toBe('Test Agent');
      expect(result.state.status).toBe('idle');
      expect('history' in result).toBe(false);
    });

    it('should throw if agent not found', async () => {
      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      await expect(contextManager.buildMinimalContext('tenant-1', 'nonexistent'))
        .rejects.toThrow(ContextError);
    });
  });

  describe('context window management', () => {
    it('should estimate context size correctly', () => {
      const tasks = [
        { id: '1', title: 'Task 1', description: 'Description 1', status: 'completed', priority: 'high', createdAt: '' }
      ];
      const decisions = [
        { id: '1', title: 'Decision 1', description: 'Description', status: 'executed', confidence: 0.9, createdAt: '' }
      ];
      const activities = [
        { id: '1', type: 'task_started', title: 'Activity 1', createdAt: '' }
      ];

      const size = contextManager.estimateContextSize(tasks as any, decisions as any, activities as any);
      expect(size).toBeGreaterThan(0);
    });

    it('should return true when within limits', () => {
      const context = {
        metadata: {
          contextWindowSize: 4000,
          contextWindowLimit: 8000
        }
      } as any;

      expect(contextManager.isWithinLimits(context)).toBe(true);
    });

    it('should return false when exceeding limits', () => {
      const context = {
        metadata: {
          contextWindowSize: 9000,
          contextWindowLimit: 8000
        }
      } as any;

      expect(contextManager.isWithinLimits(context)).toBe(false);
    });
  });

  describe('parent context inheritance', () => {
    it('should inherit context from parent', async () => {
      const mockParent = {
        id: 'parent-1',
        tenant_id: 'tenant-1',
        name: 'Parent',
        role: 'manager',
        configuration: {
          goal: 'Parent goal',
          constraints: { maxDepth: 3 },
          preferences: { style: 'formal' },
          escalationRules: { threshold: 0.5 }
        }
      };

      const mockChild = {
        id: 'child-1',
        tenant_id: 'tenant-1',
        configuration: {}
      };

      mockDb.single
        .mockResolvedValueOnce({ data: mockParent, error: null })
        .mockResolvedValueOnce({ data: mockChild, error: null });

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockParent, error: null })
          .mockResolvedValueOnce({ data: mockChild, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      await contextManager.inheritContext('tenant-1', 'parent-1', 'child-1');

      expect(chainedDb.update).toHaveBeenCalled();
    });

    it('should throw if parent or child not found', async () => {
      mockDb.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      await expect(contextManager.inheritContext('tenant-1', 'parent-1', 'child-1'))
        .rejects.toThrow(ContextError);
    });

    it('should get inherited context', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        configuration: {
          inheritedContext: { key: 'value', setting: true }
        }
      };

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAgent, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const inherited = await contextManager.getInheritedContext('tenant-1', 'agent-1');

      expect(inherited).toEqual({ key: 'value', setting: true });
    });

    it('should return null if no inherited context', async () => {
      const mockAgent = {
        id: 'agent-1',
        tenant_id: 'tenant-1',
        configuration: {}
      };

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAgent, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const inherited = await contextManager.getInheritedContext('tenant-1', 'agent-1');

      expect(inherited).toBeNull();
    });
  });

  describe('searchContext', () => {
    it('should search tasks by query', async () => {
      const mockTasks = [
        { id: '1', title: 'Test Task', description: 'Description', status: 'completed', priority: 'high', created_at: new Date().toISOString() }
      ];

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockTasks, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const result = await contextManager.searchContext('tenant-1', 'agent-1', {
        query: 'test',
        types: ['task']
      });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('Test Task');
    });

    it('should search decisions by query', async () => {
      const mockDecisions = [
        { id: '1', title: 'Test Decision', description: 'Description', status: 'executed', confidence: 0.9, created_at: new Date().toISOString() }
      ];

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockDecisions, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const result = await contextManager.searchContext('tenant-1', 'agent-1', {
        query: 'decision',
        types: ['decision']
      });

      expect(result.decisions).toHaveLength(1);
    });
  });

  describe('getContextForTimeRange', () => {
    it('should get context for specific time range', async () => {
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const to = new Date();

      const mockTasks = [
        { id: '1', title: 'Task', description: null, status: 'completed', priority: 'high', created_at: from.toISOString() }
      ];

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockTasks, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const result = await contextManager.getContextForTimeRange('tenant-1', 'agent-1', from, to);

      expect(result.history.recentTasks).toHaveLength(1);
    });
  });

  describe('getRelatedContext', () => {
    it('should get related decisions for a task', async () => {
      const mockTask = {
        id: 'task-1',
        metadata: { related_decisions: ['decision-1', 'decision-2'] }
      };

      const mockDecisions = [
        { id: 'decision-1', title: 'Decision 1', description: 'Desc', status: 'executed', confidence: 0.9, created_at: new Date().toISOString() }
      ];

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: mockTask, error: null }),
        limit: vi.fn().mockResolvedValueOnce({ data: mockDecisions, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const result = await contextManager.getRelatedContext('tenant-1', 'agent-1', 'task', 'task-1');

      expect(result.recentDecisions).toBeDefined();
    });

    it('should get related tasks for a decision', async () => {
      const mockDecision = {
        id: 'decision-1',
        metadata: { related_tasks: ['task-1'] }
      };

      const mockTasks = [
        { id: 'task-1', title: 'Task 1', description: null, status: 'completed', priority: 'high', created_at: new Date().toISOString() }
      ];

      const chainedDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: mockDecision, error: null }),
        limit: vi.fn().mockResolvedValueOnce({ data: mockTasks, error: null })
      };

      contextManager = new AgentContextManager(chainedDb as any);

      const result = await contextManager.getRelatedContext('tenant-1', 'agent-1', 'decision', 'decision-1');

      expect(result.recentTasks).toBeDefined();
    });
  });
});

describe('ContextError', () => {
  it('should create error with message', () => {
    const error = new ContextError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ContextError');
  });
});

describe('createContextManager', () => {
  it('should create context manager instance', () => {
    const db = {} as any;
    const manager = createContextManager(db);
    expect(manager).toBeInstanceOf(AgentContextManager);
  });

  it('should accept custom config', () => {
    const db = {} as any;
    const config = { maxTokens: 4000 };
    const manager = createContextManager(db, config);
    expect(manager).toBeInstanceOf(AgentContextManager);
  });
});
