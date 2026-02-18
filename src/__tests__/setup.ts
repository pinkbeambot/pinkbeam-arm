/**
 * Test Setup
 *
 * Shared test configuration and utilities
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Mock environment variables
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

/**
 * Create a real Supabase client for integration tests
 * Uses service role key for database operations
 */
export function createTestClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || 'http://localhost:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Clean up test data for a specific tenant
 * Removes all test records in the correct order to avoid FK constraints
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  tenantId: string
): Promise<void> {
  // Delete in order to respect foreign key constraints
  const tables = [
    'activities',
    'messages',
    'decisions',
    'escalations',
    'tasks',
    'agents',
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.warn(`Failed to clean up ${table}:`, error.message);
    }
  }
}

/**
 * Create a test tenant
 */
export async function createTestTenant(
  supabase: SupabaseClient,
  overrides: Partial<{
    id: string;
    name: string;
    slug: string;
  }> = {}
) {
  const tenantData = {
    id: overrides.id || `test-tenant-${Date.now()}`,
    name: overrides.name || 'Test Tenant',
    slug: overrides.slug || `test-tenant-${Date.now()}`,
  };

  const { data, error } = await supabase
    .from('tenants')
    .insert(tenantData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test user for a tenant
 */
export async function createTestUser(
  supabase: SupabaseClient,
  tenantId: string,
  overrides: Partial<{
    email: string;
    role: string;
  }> = {}
) {
  const email = overrides.email || `test-${Date.now()}@example.com`;
  
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
  });

  if (authError) throw authError;

  // Create user record
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      tenant_id: tenantId,
      email,
      role: overrides.role || 'admin',
    })
    .select()
    .single();

  if (userError) throw userError;

  return { auth: authData.user, profile: userData };
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

export function createMockActivity(overrides = {}) {
  return {
    id: 'act-123',
    tenant_id: 'tenant-123',
    type: 'task.created',
    category: 'task',
    title: 'Test Activity',
    description: 'A test activity',
    actor_type: 'agent',
    actor_id: 'agent-123',
    agent_id: 'agent-123',
    target_type: 'task',
    target_id: 'task-123',
    metadata: {},
    ...overrides,
  };
}

/**
 * Wait for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or times out
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000 } = options;
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }
  
  throw lastError;
}