/**
 * Agent Runtime Core Integration Tests
 * 
 * @module src/__tests__/integration/agent-runtime
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Agent, AgentRole } from '@/types';

import {
  AgentSpawner,
  getAgentSpawner,
  resetAgentSpawner,
  AgentLifecycleManager,
  getLifecycleManager,
  resetLifecycleManager,
  AgentLLMRouter,
  getAgentLLMRouter,
  resetAgentLLMRouter,
  A2AMessagingService,
  getMessagingService,
  resetMessagingService,
} from '@/lib/agent-runtime';

// Mock Supabase
const createMockSupabase = () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  return {
    from: vi.fn().mockReturnValue(mockChain),
    realtime: {},
  } as unknown as SupabaseClient;
};

const createMockAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'agent-123',
  tenant_id: 'tenant-456',
  parent_id: null,
  root_id: 'agent-123',
  depth: 0,
  name: 'Test Agent',
  role: 'manager' as AgentRole,
  status: 'idle',
  capabilities: ['spawn', 'delegate', 'decide', 'escalate'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('Agent Runtime Core', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    resetAgentSpawner();
    resetLifecycleManager();
    resetAgentLLMRouter();
    resetMessagingService();
    mockSupabase = createMockSupabase();
    vi.clearAllMocks();
  });

  describe('AgentSpawner', () => {
    it('should spawn a child agent successfully', async () => {
      const parentAgent = createMockAgent({
        id: 'parent-123',
        capabilities: ['spawn'],
      });

      const mockChain = mockSupabase.from('agents') as unknown as {
        select: ReturnType<typeof vi.fn>;
        insert: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
      };

      mockChain.single
        .mockResolvedValueOnce({ data: parentAgent, error: null })
        .mockResolvedValueOnce({
          data: {
            id: 'child-456',
            name: 'Child Agent',
            role: 'worker',
            status: 'initializing',
            tenant_id: 'tenant-456',
            parent_id: 'parent-123',
            root_id: 'parent-123',
            depth: 1,
          },
          error: null,
        });

      const spawner = getAgentSpawner();
      const result = await spawner.spawnAgent(mockSupabase, 'parent-123', {
        name: 'Child Agent',
        role: 'worker',
      });

      expect(result.success).toBe(true);
      expect(result.agent?.depth).toBe(1);
    });

    it('should reject spawn without capability', async () => {
      const parentAgent = createMockAgent({
        id: 'parent-123',
        capabilities: ['decide'],
      });

      const mockChain = mockSupabase.from('agents') as unknown as {
        select: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
      };

      mockChain.single.mockResolvedValueOnce({ data: parentAgent, error: null });

      const spawner = getAgentSpawner();
      const result = await spawner.spawnAgent(mockSupabase, 'parent-123', {
        name: 'Child Agent',
        role: 'worker',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SPAWN_CAPABILITY_REQUIRED');
    });

    it('should enforce depth limit', async () => {
      const parentAgent = createMockAgent({
        id: 'parent-123',
        depth: 5,
        capabilities: ['spawn'],
      });

      const mockChain = mockSupabase.from('agents') as unknown as {
        select: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
      };

      mockChain.single.mockResolvedValueOnce({ data: parentAgent, error: null });

      const spawner = getAgentSpawner();
      const result = await spawner.spawnAgent(mockSupabase, 'parent-123', {
        name: 'Child Agent',
        role: 'worker',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MAX_DEPTH_EXCEEDED');
    });
  });

  describe('AgentLifecycleManager', () => {
    it('should transition from idle to active', async () => {
      const agent = createMockAgent({ status: 'idle' });

      const mockChain = mockSupabase.from('agents') as unknown as {
        select: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
      };

      mockChain.single
        .mockResolvedValueOnce({ data: agent, error: null })
        .mockResolvedValueOnce({ data: { ...agent, status: 'active' }, error: null });

      const manager = getLifecycleManager();
      const result = await manager.transition(mockSupabase, {
        agentId: 'agent-123',
        newState: 'active',
        triggeredBy: { type: 'agent', id: 'agent-123' },
      });

      expect(result.success).toBe(true);
      expect(result.previousState).toBe('idle');
      expect(result.newState).toBe('active');
    });

    it('should reject invalid transitions', async () => {
      const agent = createMockAgent({ status: 'terminated' });

      const mockChain = mockSupabase.from('agents') as unknown as {
        select: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
      };

      mockChain.single.mockResolvedValueOnce({ data: agent, error: null });

      const manager = getLifecycleManager();
      const result = await manager.transition(mockSupabase, {
        agentId: 'agent-123',
        newState: 'active',
        triggeredBy: { type: 'agent', id: 'agent-123' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TRANSITION');
    });

    it('should require reason for certain transitions', async () => {
      const agent = createMockAgent({ status: 'active' });

      const mockChain = mockSupabase.from('agents') as unknown as {
        select: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
      };

      mockChain.single.mockResolvedValueOnce({ data: agent, error: null });

      const manager = getLifecycleManager();
      const result = await manager.transition(mockSupabase, {
        agentId: 'agent-123',
        newState: 'error',
        triggeredBy: { type: 'agent', id: 'agent-123' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REASON_REQUIRED');
    });
  });

  describe('A2AMessagingService', () => {
    it('should send message successfully', async () => {
      const sender = createMockAgent({ id: 'sender-123' });

      const mockChain = mockSupabase.from('agents') as unknown as {
        select: ReturnType<typeof vi.fn>;
        insert: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
      };

      mockChain.single
        .mockResolvedValueOnce({ data: sender, error: null })
        .mockResolvedValueOnce({
          data: {
            id: 'msg-456',
            from_agent_id: 'sender-123',
            to_agent_id: 'recipient-789',
            message_type: 'message.direct',
          },
          error: null,
        });

      const service = getMessagingService();
      const result = await service.sendMessage(mockSupabase, 'tenant-456', {
        fromAgentId: 'sender-123',
        toAgentId: 'recipient-789',
        messageType: 'message.direct',
        payload: { content: 'Hello' },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should reject message from invalid sender', async () => {
      const mockChain = mockSupabase.from('agents') as unknown as {
        select: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
      };

      mockChain.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const service = getMessagingService();
      const result = await service.sendMessage(mockSupabase, 'tenant-456', {
        fromAgentId: 'invalid-sender',
        toAgentId: 'recipient-789',
        messageType: 'message.direct',
        payload: { content: 'Hello' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SENDER');
    });
  });

  describe('Module Integration', () => {
    it('all modules should work together', () => {
      const spawner = getAgentSpawner();
      const lifecycle = getLifecycleManager();
      const messaging = getMessagingService();
      const llmRouter = getAgentLLMRouter();

      expect(spawner).toBeDefined();
      expect(lifecycle).toBeDefined();
      expect(messaging).toBeDefined();
      expect(llmRouter).toBeDefined();
    });

    it('should use singleton pattern', () => {
      const spawner1 = getAgentSpawner();
      const spawner2 = getAgentSpawner();
      expect(spawner1).toBe(spawner2);

      resetAgentSpawner();
      const spawner3 = getAgentSpawner();
      expect(spawner1).not.toBe(spawner3);
    });
  });
});
