/**
 * Agents API Unit Tests
 * 
 * Tests for agent validation schemas and helper functions.
 * Integration tests for the full API flow are in the integration tests directory.
 */

import { describe, it, expect } from 'vitest';
import {
  createAgentSchema,
  updateAgentSchema,
  listAgentsQuerySchema,
} from '@/lib/validation';
import {
  agentHierarchyQuerySchema,
  spawnAgentSchema,
  agentActionSchema,
} from '@/lib/validation/agent';

// ============================================================================
// Create Agent Schema Tests
// ============================================================================

describe('createAgentSchema', () => {
  it('should validate a valid agent creation', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      role: 'worker',
      description: 'A test agent',
    });
    expect(result.success).toBe(true);
  });

  it('should require name', () => {
    const result = createAgentSchema.safeParse({
      role: 'worker',
    });
    expect(result.success).toBe(false);
  });

  it('should validate name length', () => {
    const result = createAgentSchema.safeParse({
      name: '',
      role: 'worker',
    });
    expect(result.success).toBe(false);
  });

  it('should validate role enum', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      role: 'invalid_role',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid role values', () => {
    const validRoles = ['ceo', 'manager', 'worker', 'specialist', 'system'] as const;
    for (const role of validRoles) {
      const result = createAgentSchema.safeParse({
        name: 'Test Agent',
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should validate slug max length', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      slug: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid UUID parent_id', () => {
    const result = createAgentSchema.safeParse({
      name: 'Child Agent',
      role: 'worker',
      parent_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid parent_id', () => {
    const result = createAgentSchema.safeParse({
      name: 'Child Agent',
      parent_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should validate llm_config', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      role: 'worker',
      llm_config: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        temperature: 0.7,
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid temperature in llm_config', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      llm_config: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        temperature: 3, // Invalid: > 2
      },
    });
    expect(result.success).toBe(false);
  });

  it('should validate limits', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      role: 'worker',
      limits: {
        max_sub_agents: 5,
        max_concurrent_tasks: 3,
        escalation_threshold: 0.8,
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative max_sub_agents', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      limits: {
        max_sub_agents: -1,
      },
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Update Agent Schema Tests
// ============================================================================

describe('updateAgentSchema', () => {
  it('should validate partial updates', () => {
    const result = updateAgentSchema.safeParse({
      name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('should validate status updates', () => {
    const result = updateAgentSchema.safeParse({
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = updateAgentSchema.safeParse({
      status: 'invalid_status',
    });
    expect(result.success).toBe(false);
  });

  it('should validate capabilities array', () => {
    const result = updateAgentSchema.safeParse({
      capabilities: ['spawn', 'delegate', 'decide'],
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty update', () => {
    const result = updateAgentSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// List Agents Query Schema Tests
// ============================================================================

describe('listAgentsQuerySchema', () => {
  it('should validate empty query', () => {
    const result = listAgentsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.include_descendants).toBe(false);
    }
  });

  it('should validate status filter', () => {
    const result = listAgentsQuerySchema.safeParse({
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('should validate role filter', () => {
    const result = listAgentsQuerySchema.safeParse({
      role: 'manager',
    });
    expect(result.success).toBe(true);
  });

  it('should validate search parameter', () => {
    const result = listAgentsQuerySchema.safeParse({
      search: 'test agent',
    });
    expect(result.success).toBe(true);
  });

  it('should validate pagination', () => {
    const result = listAgentsQuerySchema.safeParse({
      page: '2',
      limit: '50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should reject page 0', () => {
    const result = listAgentsQuerySchema.safeParse({
      page: '0',
    });
    expect(result.success).toBe(false);
  });

  it('should reject limit over 100', () => {
    const result = listAgentsQuerySchema.safeParse({
      limit: '101',
    });
    expect(result.success).toBe(false);
  });

  it('should validate parent_id filter', () => {
    const result = listAgentsQuerySchema.safeParse({
      parent_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
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

  it('should default include_descendants to false', () => {
    const result = listAgentsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_descendants).toBe(false);
    }
  });
});

// ============================================================================
// Agent Hierarchy Query Schema Tests
// ============================================================================

describe('agentHierarchyQuerySchema', () => {
  it('should require root_id', () => {
    const result = agentHierarchyQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should validate root_id as UUID', () => {
    const result = agentHierarchyQuerySchema.safeParse({
      root_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid root_id', () => {
    const result = agentHierarchyQuerySchema.safeParse({
      root_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should validate max_depth', () => {
    const result = agentHierarchyQuerySchema.safeParse({
      root_id: '550e8400-e29b-41d4-a716-446655440000',
      max_depth: '5',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.max_depth).toBe(5);
    }
  });

  it('should reject max_depth over 10', () => {
    const result = agentHierarchyQuerySchema.safeParse({
      root_id: '550e8400-e29b-41d4-a716-446655440000',
      max_depth: '11',
    });
    expect(result.success).toBe(false);
  });

  it('should coerce include_terminated to boolean', () => {
    const result = agentHierarchyQuerySchema.safeParse({
      root_id: '550e8400-e29b-41d4-a716-446655440000',
      include_terminated: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_terminated).toBe(true);
    }
  });
});

// ============================================================================
// Spawn Agent Schema Tests
// ============================================================================

describe('spawnAgentSchema', () => {
  it('should validate valid spawn request', () => {
    const result = spawnAgentSchema.safeParse({
      name: 'Child Agent',
      role: 'worker',
      goal: 'Complete the assigned task',
      config: {
        model: 'claude-3-5-sonnet',
        capabilities: ['task_execution'],
      },
    });
    expect(result.success).toBe(true);
  });

  it('should require name', () => {
    const result = spawnAgentSchema.safeParse({
      role: 'worker',
      goal: 'Complete task',
    });
    expect(result.success).toBe(false);
  });

  it('should require role', () => {
    const result = spawnAgentSchema.safeParse({
      name: 'Child Agent',
      goal: 'Complete task',
    });
    expect(result.success).toBe(false);
  });

  it('should require goal', () => {
    const result = spawnAgentSchema.safeParse({
      name: 'Child Agent',
      role: 'worker',
    });
    expect(result.success).toBe(false);
  });

  it('should validate context object', () => {
    const result = spawnAgentSchema.safeParse({
      name: 'Child Agent',
      role: 'worker',
      goal: 'Complete task',
      context: {
        task_description: 'Do something important',
        parent_context: { key: 'value' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('should validate budget in config', () => {
    const result = spawnAgentSchema.safeParse({
      name: 'Child Agent',
      role: 'worker',
      goal: 'Complete task',
      config: {
        model: 'claude-3-5-sonnet',
        budget: {
          max_tokens: 1000,
          max_cost_usd: 0.5,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative budget values', () => {
    const result = spawnAgentSchema.safeParse({
      name: 'Child Agent',
      role: 'worker',
      goal: 'Complete task',
      config: {
        model: 'claude-3-5-sonnet',
        budget: {
          max_tokens: -1,
          max_cost_usd: -0.5,
        },
      },
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Agent Action Schema Tests
// ============================================================================

describe('agentActionSchema', () => {
  it('should validate pause action', () => {
    const result = agentActionSchema.safeParse({
      action: 'pause',
    });
    expect(result.success).toBe(true);
  });

  it('should validate resume action', () => {
    const result = agentActionSchema.safeParse({
      action: 'resume',
    });
    expect(result.success).toBe(true);
  });

  it('should validate escape action', () => {
    const result = agentActionSchema.safeParse({
      action: 'escape',
      reason: 'Taking manual control',
    });
    expect(result.success).toBe(true);
  });

  it('should validate return action', () => {
    const result = agentActionSchema.safeParse({
      action: 'return',
    });
    expect(result.success).toBe(true);
  });

  it('should validate restart action', () => {
    const result = agentActionSchema.safeParse({
      action: 'restart',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid action', () => {
    const result = agentActionSchema.safeParse({
      action: 'invalid_action',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Schema Export Tests
// ============================================================================

describe('Schema Exports', () => {
  it('should export all agent schemas from main validation', () => {
    expect(createAgentSchema).toBeDefined();
    expect(updateAgentSchema).toBeDefined();
    expect(listAgentsQuerySchema).toBeDefined();
  });

  it('should export additional schemas from agent validation', () => {
    expect(agentHierarchyQuerySchema).toBeDefined();
    expect(spawnAgentSchema).toBeDefined();
    expect(agentActionSchema).toBeDefined();
  });
});
