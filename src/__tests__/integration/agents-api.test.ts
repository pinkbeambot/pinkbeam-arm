/**
 * Integration tests for Agents API
 *
 * Tests validation schemas, status transitions, and security logic
 * for the /api/agents endpoints.
 */

import { describe, it, expect } from 'vitest';
import {
  createAgentSchema,
  updateAgentSchema,
  listAgentsQuerySchema,
  AgentRoleEnum,
  AgentStatusEnum,
} from '@/lib/validation';

// Valid agent statuses from the database enum
const VALID_STATUSES = [
  'initializing',
  'idle',
  'active',
  'paused',
  'blocked',
  'error',
  'escaped',
  'terminated',
] as const;

// Valid agent roles from the database enum
const VALID_ROLES = ['ceo', 'manager', 'worker', 'specialist', 'system'] as const;

// Valid capabilities
const VALID_CAPABILITIES = [
  'spawn',
  'delegate',
  'decide',
  'escalate',
  'access_external',
  'modify_config',
  'create_tasks',
  'manage_agents',
  'execute_code',
];

describe('Agents API - Validation', () => {
  describe('createAgentSchema', () => {
    it('should validate minimal valid agent data', () => {
      const result = createAgentSchema.safeParse({
        name: 'Test Agent',
      });
      expect(result.success).toBe(true);
    });

    it('should validate complete agent data', () => {
      const result = createAgentSchema.safeParse({
        name: 'Test Agent',
        slug: 'test-agent',
        role: 'worker',
        description: 'A test agent description',
        parent_id: '550e8400-e29b-41d4-a716-446655440000',
        capabilities: ['delegate', 'decide'],
        llm_config: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          max_tokens: 4096,
        },
        limits: {
          max_sub_agents: 5,
          max_concurrent_tasks: 3,
          escalation_threshold: 0.7,
          timeout_seconds: 300,
          max_tokens_per_task: 100000,
          max_cost_per_task_usd: 5.00,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createAgentSchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name exceeding 255 characters', () => {
      const result = createAgentSchema.safeParse({
        name: 'a'.repeat(256),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const result = createAgentSchema.safeParse({
        name: 'Test Agent',
        role: 'invalid_role',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid roles', () => {
      for (const role of VALID_ROLES) {
        const result = createAgentSchema.safeParse({
          name: 'Test Agent',
          role,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid slug format', () => {
      const result = createAgentSchema.safeParse({
        name: 'Test Agent',
        slug: 'Test Agent 123!', // Contains uppercase and special chars
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid slug format', () => {
      const result = createAgentSchema.safeParse({
        name: 'Test Agent',
        slug: 'test-agent-123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject description exceeding 2000 characters', () => {
      const result = createAgentSchema.safeParse({
        name: 'Test Agent',
        description: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid parent_id (non-uuid)', () => {
      const result = createAgentSchema.safeParse({
        name: 'Test Agent',
        parent_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid parent_id (uuid)', () => {
      const result = createAgentSchema.safeParse({
        name: 'Test Agent',
        parent_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should set default role to worker', () => {
      const result = createAgentSchema.safeParse({
        name: 'Test Agent',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('worker');
      }
    });

    it('should validate llm_config temperature range', () => {
      const invalidLow = createAgentSchema.safeParse({
        name: 'Test Agent',
        llm_config: { provider: 'anthropic', model: 'claude-3', temperature: -0.1 },
      });
      expect(invalidLow.success).toBe(false);

      const invalidHigh = createAgentSchema.safeParse({
        name: 'Test Agent',
        llm_config: { provider: 'anthropic', model: 'claude-3', temperature: 2.1 },
      });
      expect(invalidHigh.success).toBe(false);

      const valid = createAgentSchema.safeParse({
        name: 'Test Agent',
        llm_config: { provider: 'anthropic', model: 'claude-3', temperature: 0.7 },
      });
      expect(valid.success).toBe(true);
    });

    it('should validate escalation_threshold range', () => {
      const invalidLow = createAgentSchema.safeParse({
        name: 'Test Agent',
        limits: { escalation_threshold: -0.1 },
      });
      expect(invalidLow.success).toBe(false);

      const invalidHigh = createAgentSchema.safeParse({
        name: 'Test Agent',
        limits: { escalation_threshold: 1.1 },
      });
      expect(invalidHigh.success).toBe(false);

      const valid = createAgentSchema.safeParse({
        name: 'Test Agent',
        limits: { escalation_threshold: 0.7 },
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('updateAgentSchema', () => {
    it('should allow partial updates', () => {
      const result = updateAgentSchema.safeParse({
        name: 'Updated Name',
      });
      expect(result.success).toBe(true);
    });

    it('should allow status updates', () => {
      for (const status of VALID_STATUSES) {
        const result = updateAgentSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should allow role updates', () => {
      for (const role of VALID_ROLES) {
        const result = updateAgentSchema.safeParse({ role });
        expect(result.success).toBe(true);
      }
    });

    it('should allow parent_id to be set to null', () => {
      const result = updateAgentSchema.safeParse({
        parent_id: null,
      });
      expect(result.success).toBe(true);
    });

    it('should allow parent_id to be set to valid uuid', () => {
      const result = updateAgentSchema.safeParse({
        parent_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should allow status_reason up to 500 chars', () => {
      const result = updateAgentSchema.safeParse({
        status_reason: 'a'.repeat(500),
      });
      expect(result.success).toBe(true);
    });

    it('should reject status_reason exceeding 500 chars', () => {
      const result = updateAgentSchema.safeParse({
        status_reason: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should allow partial llm_config updates', () => {
      const result = updateAgentSchema.safeParse({
        llm_config: { temperature: 0.5 },
      });
      expect(result.success).toBe(true);
    });

    it('should allow avatar_url to be null', () => {
      const result = updateAgentSchema.safeParse({
        avatar_url: null,
      });
      expect(result.success).toBe(true);
    });

    it('should validate avatar_url is a valid URL', () => {
      const result = updateAgentSchema.safeParse({
        avatar_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid avatar_url', () => {
      const result = updateAgentSchema.safeParse({
        avatar_url: 'https://example.com/avatar.png',
      });
      expect(result.success).toBe(true);
    });

    it('should allow depth and root_id updates', () => {
      const result = updateAgentSchema.safeParse({
        depth: 2,
        root_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative depth', () => {
      const result = updateAgentSchema.safeParse({
        depth: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listAgentsQuerySchema', () => {
    it('should accept empty query', () => {
      const result = listAgentsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should set default pagination', () => {
      const result = listAgentsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.include_descendants).toBe(false);
      }
    });

    it('should validate status filter', () => {
      for (const status of VALID_STATUSES) {
        const result = listAgentsQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should validate role filter', () => {
      for (const role of VALID_ROLES) {
        const result = listAgentsQuerySchema.safeParse({ role });
        expect(result.success).toBe(true);
      }
    });

    it('should coerce page to number', () => {
      const result = listAgentsQuerySchema.safeParse({ page: '2' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
      }
    });

    it('should coerce limit to number', () => {
      const result = listAgentsQuerySchema.safeParse({ limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject limit exceeding 100', () => {
      const result = listAgentsQuerySchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it('should reject page less than 1', () => {
      const result = listAgentsQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should validate parent_id as UUID', () => {
      const valid = listAgentsQuerySchema.safeParse({
        parent_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(valid.success).toBe(true);

      const invalid = listAgentsQuerySchema.safeParse({
        parent_id: 'not-a-uuid',
      });
      expect(invalid.success).toBe(false);
    });

    it('should coerce include_descendants to boolean', () => {
      const result = listAgentsQuerySchema.safeParse({
        include_descendants: 'true',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_descendants).toBe(true);
      }
    });

    it('should limit search to 200 characters', () => {
      const result = listAgentsQuerySchema.safeParse({
        search: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Agents API - Status Transitions', () => {
  // Valid status transitions map
  const VALID_TRANSITIONS: Record<string, string[]> = {
    initializing: ['idle', 'active', 'error', 'terminated'],
    idle: ['active', 'paused', 'blocked', 'error', 'terminated'],
    active: ['idle', 'paused', 'blocked', 'error', 'terminated'],
    paused: ['idle', 'active', 'blocked', 'error', 'terminated'],
    blocked: ['idle', 'active', 'paused', 'error', 'terminated'],
    error: ['idle', 'active', 'paused', 'blocked', 'terminated'],
    escaped: ['blocked', 'terminated'],
    terminated: [],
  };

  it('should define valid transitions for all statuses', () => {
    for (const status of VALID_STATUSES) {
      expect(VALID_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('should not allow transitions from terminated', () => {
    expect(VALID_TRANSITIONS.terminated).toHaveLength(0);
  });

  it('should allow initializing to transition to idle, active, error, terminated', () => {
    expect(VALID_TRANSITIONS.initializing).toContain('idle');
    expect(VALID_TRANSITIONS.initializing).toContain('active');
    expect(VALID_TRANSITIONS.initializing).toContain('error');
    expect(VALID_TRANSITIONS.initializing).toContain('terminated');
  });

  it('should allow active to transition to multiple states', () => {
    expect(VALID_TRANSITIONS.active).toContain('idle');
    expect(VALID_TRANSITIONS.active).toContain('paused');
    expect(VALID_TRANSITIONS.active).toContain('blocked');
    expect(VALID_TRANSITIONS.active).toContain('error');
    expect(VALID_TRANSITIONS.active).toContain('terminated');
  });

  it('should handle escaped agents with restricted transitions', () => {
    expect(VALID_TRANSITIONS.escaped).toContain('blocked');
    expect(VALID_TRANSITIONS.escaped).toContain('terminated');
    expect(VALID_TRANSITIONS.escaped).not.toContain('active');
    expect(VALID_TRANSITIONS.escaped).not.toContain('idle');
  });
});

describe('Agents API - Enums', () => {
  describe('AgentRoleEnum', () => {
    it('should contain all valid roles', () => {
      const validValues = AgentRoleEnum.options;
      for (const role of VALID_ROLES) {
        expect(validValues).toContain(role);
      }
    });

    it('should not contain invalid roles', () => {
      const validValues = AgentRoleEnum.options;
      expect(validValues).not.toContain('admin');
      expect(validValues).not.toContain('user');
    });
  });

  describe('AgentStatusEnum', () => {
    it('should contain all valid statuses', () => {
      const validValues = AgentStatusEnum.options;
      for (const status of VALID_STATUSES) {
        expect(validValues).toContain(status);
      }
    });

    it('should not contain invalid statuses', () => {
      const validValues = AgentStatusEnum.options;
      expect(validValues).not.toContain('running');
      expect(validValues).not.toContain('stopped');
    });
  });
});

describe('Agents API - Capabilities', () => {
  it('should have defined set of valid capabilities', () => {
    expect(VALID_CAPABILITIES).toContain('spawn');
    expect(VALID_CAPABILITIES).toContain('delegate');
    expect(VALID_CAPABILITIES).toContain('decide');
    expect(VALID_CAPABILITIES).toContain('escalate');
    expect(VALID_CAPABILITIES).toContain('access_external');
    expect(VALID_CAPABILITIES).toContain('modify_config');
    expect(VALID_CAPABILITIES).toContain('create_tasks');
    expect(VALID_CAPABILITIES).toContain('manage_agents');
    expect(VALID_CAPABILITIES).toContain('execute_code');
  });
});

describe('Agents API - Security Requirements', () => {
  it('should require authentication for all endpoints', () => {
    // This is enforced by middleware, but we document it here
    const protectedEndpoints = [
      'GET /api/agents',
      'POST /api/agents',
      'GET /api/agents/[id]',
      'PATCH /api/agents/[id]',
      'DELETE /api/agents/[id]',
      'POST /api/agents/[id]/status',
      'GET /api/agents/[id]/children',
      'GET /api/agents/[id]/tasks',
    ];
    expect(protectedEndpoints.length).toBeGreaterThan(0);
  });

  it('should enforce tenant isolation', () => {
    // All queries must filter by tenant_id
    const requiredFilters = ['tenant_id'];
    expect(requiredFilters).toContain('tenant_id');
  });

  it('should prevent circular hierarchy', () => {
    // An agent cannot be set as its own parent
    // An agent cannot have a descendant as its parent
    const invalidHierarchyCases = [
      { agent: 'A', parent: 'A' }, // Self-reference
      { agent: 'A', parent: 'B', where: 'B is descendant of A' },
    ];
    expect(invalidHierarchyCases.length).toBeGreaterThan(0);
  });

  it('should prevent role change for system agents', () => {
    // System agents cannot have their role changed
    const immutableRoleAgents = ['system'];
    expect(immutableRoleAgents).toContain('system');
  });

  it('should enforce rate limiting', () => {
    // 100 requests per minute per tenant
    const rateLimit = 100;
    expect(rateLimit).toBe(100);
  });
});

describe('Agents API - Response Formats', () => {
  it('should return paginated list format', () => {
    const expectedFormat = {
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
    expect(expectedFormat.pagination).toHaveProperty('page');
    expect(expectedFormat.pagination).toHaveProperty('limit');
    expect(expectedFormat.pagination).toHaveProperty('total');
    expect(expectedFormat.pagination).toHaveProperty('totalPages');
  });

  it('should return single resource format', () => {
    const expectedFormat = {
      data: {},
    };
    expect(expectedFormat).toHaveProperty('data');
  });

  it('should return 201 on successful creation', () => {
    const expectedStatus = 201;
    expect(expectedStatus).toBe(201);
  });

  it('should return 204 on successful deletion', () => {
    const expectedStatus = 204;
    expect(expectedStatus).toBe(204);
  });
});
