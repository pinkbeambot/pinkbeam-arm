/**
 * Agent Spawner Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AgentSpawner,
  createAgentSpawner,
  AGENT_TEMPLATES,
  MAX_AGENT_DEPTH,
  DEFAULT_MAX_SUB_AGENTS,
  DEFAULT_ESCALATION_THRESHOLD,
  DEFAULT_TIMEOUT_SECONDS,
  getRoleCapabilities,
  canRoleSpawn,
  validateAgentDepth,
  SpawnOptions
} from '@/lib/agent/spawner';
import { AgentRole, Capability } from '@/types';

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234'
}));

describe('AgentSpawner', () => {
  let spawner: AgentSpawner;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      from: vi.fn(() => mockDb),
      select: vi.fn(() => mockDb),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => mockDb),
      eq: vi.fn(() => mockDb),
      order: vi.fn(() => mockDb),
      limit: vi.fn(() => mockDb),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
    };
    
    spawner = new AgentSpawner(mockDb);
    vi.clearAllMocks();
  });

  describe('Constants', () => {
    it('should have correct MAX_AGENT_DEPTH', () => {
      expect(MAX_AGENT_DEPTH).toBe(5);
    });

    it('should have correct DEFAULT_MAX_SUB_AGENTS', () => {
      expect(DEFAULT_MAX_SUB_AGENTS).toBe(10);
    });

    it('should have correct DEFAULT_ESCALATION_THRESHOLD', () => {
      expect(DEFAULT_ESCALATION_THRESHOLD).toBe(0.7);
    });

    it('should have correct DEFAULT_TIMEOUT_SECONDS', () => {
      expect(DEFAULT_TIMEOUT_SECONDS).toBe(300);
    });
  });

  describe('Templates', () => {
    it('should have worker template', () => {
      expect(AGENT_TEMPLATES.worker).toBeDefined();
      expect(AGENT_TEMPLATES.worker.role).toBe('worker');
      expect(AGENT_TEMPLATES.worker.capabilities).toContain('decide');
    });

    it('should have manager template', () => {
      expect(AGENT_TEMPLATES.manager).toBeDefined();
      expect(AGENT_TEMPLATES.manager.role).toBe('manager');
      expect(AGENT_TEMPLATES.manager.capabilities).toContain('spawn');
      expect(AGENT_TEMPLATES.manager.capabilities).toContain('delegate');
    });

    it('should have specialist template', () => {
      expect(AGENT_TEMPLATES.specialist).toBeDefined();
      expect(AGENT_TEMPLATES.specialist.role).toBe('specialist');
      expect(AGENT_TEMPLATES.specialist.capabilities).toContain('access_external');
    });
  });

  describe('spawn', () => {
    const validOptions: SpawnOptions = {
      name: 'Test Agent',
      role: 'worker',
      description: 'A test agent',
      triggeredBy: 'user-1'
    };

    it('should spawn a new agent with valid options', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await spawner.spawn('tenant-1', validOptions);

      expect(result.success).toBe(true);
      expect(result.agent).toBeDefined();
      expect(result.agent!.name).toBe('Test Agent');
      expect(result.agent!.role).toBe('worker');
      expect(result.agent!.status).toBe('initializing');
      expect(result.agent!.id).toBe('agent-mock-uuid-1234');
    });

    it('should fail without name', async () => {
      const options = { ...validOptions, name: '' };
      const result = await spawner.spawn('tenant-1', options);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONFIGURATION');
    });

    it('should fail without triggeredBy', async () => {
      const options = { ...validOptions, triggeredBy: '' as any };
      const result = await spawner.spawn('tenant-1', options);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONFIGURATION');
    });

    it('should fail with invalid role', async () => {
      const options = { ...validOptions, role: 'invalid' as AgentRole };
      const result = await spawner.spawn('tenant-1', options);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ROLE');
    });

    it('should set parent relationships correctly', async () => {
      mockDb.single
        .mockResolvedValueOnce({
          data: {
            id: 'parent-1',
            tenant_id: 'tenant-1',
            root_id: 'root-1',
            depth: 0,
            capabilities: ['spawn']
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: { count: 0 },
          error: null
        });

      const options = {
        ...validOptions,
        parentId: 'parent-1'
      };

      const result = await spawner.spawn('tenant-1', options);

      expect(result.success).toBe(true);
      expect(result.agent!.parent_id).toBe('parent-1');
      expect(result.agent!.root_id).toBe('root-1');
      expect(result.agent!.depth).toBe(1);
    });

    it('should fail if parent not found', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const options = {
        ...validOptions,
        parentId: 'nonexistent'
      };

      const result = await spawner.spawn('tenant-1', options);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARENT_NOT_FOUND');
    });

    it('should merge capabilities correctly', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const options = {
        ...validOptions,
        capabilities: ['access_external'] as Capability[]
      };

      const result = await spawner.spawn('tenant-1', options);

      expect(result.success).toBe(true);
      expect(result.agent!.capabilities).toContain('decide');
      expect(result.agent!.capabilities).toContain('escalate');
      expect(result.agent!.capabilities).toContain('access_external');
    });

    it('should set configuration correctly', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const options = {
        ...validOptions,
        configuration: { customKey: 'customValue' },
        limits: {
          maxSubAgents: 3,
          escalationThreshold: 0.5,
          timeoutSeconds: 600
        }
      };

      const result = await spawner.spawn('tenant-1', options);

      expect(result.success).toBe(true);
      expect(result.agent!.configuration).toMatchObject({
        customKey: 'customValue',
        limits: {
          maxSubAgents: 3,
          escalationThreshold: 0.5,
          timeoutSeconds: 600
        }
      });
    });
  });

  describe('spawnFromTemplate', () => {
    it('should spawn from worker template', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await spawner.spawnFromTemplate('tenant-1', 'worker', {
        name: 'Custom Worker',
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.agent!.name).toBe('Custom Worker');
      expect(result.agent!.role).toBe('worker');
    });

    it('should fail for non-existent template', async () => {
      const result = await spawner.spawnFromTemplate('tenant-1', 'nonexistent', {
        triggeredBy: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONFIGURATION');
    });

    it('should apply template defaults with overrides', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await spawner.spawnFromTemplate('tenant-1', 'manager', {
        name: 'Custom Manager',
        description: 'Overridden description',
        triggeredBy: 'user-1',
        model: 'custom-model'
      });

      expect(result.success).toBe(true);
      expect(result.agent!.description).toBe('Overridden description');
      expect(result.agent!.model).toBe('custom-model');
    });
  });

  describe('canSpawnChildren', () => {
    it('should allow spawn for manager with capability', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: {
          id: 'manager-1',
          depth: 1,
          capabilities: ['spawn'],
          configuration: {}
        },
        error: null
      });

      mockDb.select.mockReturnValueOnce({
        ...mockDb,
        count: 2
      });

      const result = await spawner.canSpawnChildren('tenant-1', 'manager-1');
      expect(result.allowed).toBe(true);
    });

    it('should deny spawn without capability', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: {
          id: 'worker-1',
          depth: 1,
          capabilities: ['decide'],
          configuration: {}
        },
        error: null
      });

      const result = await spawner.canSpawnChildren('tenant-1', 'worker-1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('spawn capability');
    });

    it('should deny spawn at max depth', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: {
          id: 'deep-agent',
          depth: MAX_AGENT_DEPTH,
          capabilities: ['spawn'],
          configuration: {}
        },
        error: null
      });

      const result = await spawner.canSpawnChildren('tenant-1', 'deep-agent');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('depth');
    });

    it('should deny spawn when at max sub-agents', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: {
          id: 'manager-1',
          depth: 1,
          capabilities: ['spawn'],
          configuration: {
            limits: { maxSubAgents: 2 }
          }
        },
        error: null
      });

      mockDb.select.mockReturnValueOnce({
        ...mockDb,
        count: 2
      });

      const result = await spawner.canSpawnChildren('tenant-1', 'manager-1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('sub-agents');
    });
  });

  describe('getChildren', () => {
    it('should return child agents', async () => {
      const mockChildren = [
        { id: 'child-1', name: 'Child 1' },
        { id: 'child-2', name: 'Child 2' }
      ];

      mockDb.select.mockReturnValueOnce({
        ...mockDb,
        eq: vi.fn(() => Promise.resolve({ data: mockChildren, error: null }))
      });

      // Need to fix the mock chain
      const dbMock = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockChildren, error: null })
              })
            })
          })
        })
      };

      const spawnerWithMock = new AgentSpawner(dbMock as any);
      const children = await spawnerWithMock.getChildren('tenant-1', 'parent-1');

      expect(children).toHaveLength(2);
    });
  });

  describe('getAncestry', () => {
    it('should return ancestry path', async () => {
      const dbMock = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn()
                  .mockResolvedValueOnce({
                    data: { id: 'child', parent_id: 'parent', name: 'Child' },
                    error: null
                  })
                  .mockResolvedValueOnce({
                    data: { id: 'parent', parent_id: 'root', name: 'Parent' },
                    error: null
                  })
                  .mockResolvedValueOnce({
                    data: { id: 'root', parent_id: null, name: 'Root' },
                    error: null
                  })
              })
            })
          })
        })
      };

      const spawnerWithMock = new AgentSpawner(dbMock as any);
      const ancestry = await spawnerWithMock.getAncestry('tenant-1', 'child');

      expect(ancestry).toHaveLength(3);
      expect(ancestry[0].name).toBe('Root');
      expect(ancestry[1].name).toBe('Parent');
      expect(ancestry[2].name).toBe('Child');
    });
  });

  describe('template management', () => {
    it('should return all templates', () => {
      const templates = spawner.getTemplates();
      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.id)).toContain('template-worker');
    });

    it('should return specific template', () => {
      const template = spawner.getTemplate('worker');
      expect(template).toBeDefined();
      expect(template?.role).toBe('worker');
    });

    it('should register custom template', () => {
      const customTemplate = {
        id: 'custom-template',
        name: 'Custom Agent',
        role: 'specialist' as AgentRole,
        description: 'A custom agent',
        capabilities: ['decide'] as Capability[],
        defaultModel: 'model-1',
        defaultConfiguration: {},
        defaultLimits: {
          maxSubAgents: 0,
          escalationThreshold: 0.5,
          timeoutSeconds: 300
        }
      };

      spawner.registerTemplate(customTemplate);
      const retrieved = spawner.getTemplate('custom-template');
      expect(retrieved).toEqual(customTemplate);
    });
  });

  describe('generateAgentId', () => {
    it('should generate unique IDs', () => {
      const id1 = spawner.generateAgentId();
      const id2 = spawner.generateAgentId();
      
      expect(id1).toMatch(/^agent-/);
      expect(id2).toMatch(/^agent-/);
      expect(id1).not.toBe(id2);
    });
  });
});

describe('Helper Functions', () => {
  describe('getRoleCapabilities', () => {
    it('should return capabilities for ceo', () => {
      const caps = getRoleCapabilities('ceo');
      expect(caps).toContain('spawn');
      expect(caps).toContain('delegate');
      expect(caps).toContain('decide');
      expect(caps).toContain('escalate');
      expect(caps).toContain('access_external');
      expect(caps).toContain('modify_config');
    });

    it('should return capabilities for worker', () => {
      const caps = getRoleCapabilities('worker');
      expect(caps).toContain('decide');
      expect(caps).toContain('escalate');
      expect(caps).not.toContain('spawn');
      expect(caps).not.toContain('delegate');
    });

    it('should return a copy (not reference)', () => {
      const caps1 = getRoleCapabilities('worker');
      const caps2 = getRoleCapabilities('worker');
      caps1.push('new_cap' as Capability);
      expect(caps2).not.toContain('new_cap');
    });
  });

  describe('canRoleSpawn', () => {
    it('should return true for roles with spawn capability', () => {
      expect(canRoleSpawn('ceo')).toBe(true);
      expect(canRoleSpawn('manager')).toBe(true);
      expect(canRoleSpawn('system')).toBe(true);
    });

    it('should return false for roles without spawn capability', () => {
      expect(canRoleSpawn('worker')).toBe(false);
      expect(canRoleSpawn('specialist')).toBe(false);
    });
  });

  describe('validateAgentDepth', () => {
    it('should validate depth within limits', () => {
      const result = validateAgentDepth(3);
      expect(result.valid).toBe(true);
      expect(result.maxDepth).toBe(MAX_AGENT_DEPTH);
    });

    it('should invalidate depth exceeding limits', () => {
      const result = validateAgentDepth(MAX_AGENT_DEPTH + 1);
      expect(result.valid).toBe(false);
    });

    it('should validate exact limit', () => {
      const result = validateAgentDepth(MAX_AGENT_DEPTH);
      expect(result.valid).toBe(true);
    });
  });
});

describe('createAgentSpawner', () => {
  it('should create spawner instance', () => {
    const db = {} as any;
    const spawner = createAgentSpawner(db);
    expect(spawner).toBeInstanceOf(AgentSpawner);
  });
});
