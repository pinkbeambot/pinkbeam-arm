/**
 * Test Setup
 * 
 * Shared test configuration and utilities
 */

import { vi } from 'vitest';

// Mock environment variables
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Global test utilities
export function createMockSupabaseClient() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  };
}

// Test data factories
export function createMockAgent(overrides = {}) {
  return {
    id: 'agent-123',
    tenant_id: 'tenant-123',
    name: 'Test Agent',
    role: 'worker',
    status: 'idle',
    capabilities: ['decide', 'escalate'],
    depth: 0,
    parent_id: null,
    root_id: 'agent-123',
    ...overrides,
  };
}

export function createMockTask(overrides = {}) {
  return {
    id: 'task-123',
    tenant_id: 'tenant-123',
    title: 'Test Task',
    description: 'A test task',
    status: 'queued',
    priority: 'normal',
    assignee_id: 'agent-123',
    progress_percent: 0,
    ...overrides,
  };
}

export function createMockMessage(overrides = {}) {
  return {
    id: 'msg-123',
    tenant_id: 'tenant-123',
    protocol_version: '1.0',
    message_type: 'message.direct',
    from_agent_id: 'agent-1',
    to_agent_id: 'agent-2',
    payload: { content: 'Hello' },
    priority: 'normal',
    ...overrides,
  };
}
