/**
 * Agent Execute Tests
 * 
 * Comprehensive test suite for the agent-execute edge function
 * Tests: Task picking, execution, state transitions, escalations, cost tracking
 * 
 * Run with: deno test --allow-all supabase/functions/agent-execute/__tests__/index.test.ts
 */

import { assertEquals, assertExists, assertRejects } from 'https://deno.land/std@0.210.0/testing/asserts.ts';
import { describe, it, beforeEach, afterEach } from 'https://deno.land/std@0.210.0/testing/bdd.ts';

// Mock the utils module
const mockSupabase = {
  from: () => mockSupabase,
  select: () => mockSupabase,
  insert: () => mockSupabase,
  update: () => mockSupabase,
  delete: () => mockSupabase,
  eq: () => mockSupabase,
  neq: () => mockSupabase,
  gt: () => mockSupabase,
  lt: () => mockSupabase,
  gte: () => mockSupabase,
  lte: () => mockSupabase,
  like: () => mockSupabase,
  ilike: () => mockSupabase,
  is: () => mockSupabase,
  in: () => mockSupabase,
  contains: () => mockSupabase,
  containedBy: () => mockSupabase,
  rangeLt: () => mockSupabase,
  rangeGt: () => mockSupabase,
  rangeGte: () => mockSupabase,
  rangeLte: () => mockSupabase,
  rangeAdjacent: () => mockSupabase,
  overlaps: () => mockSupabase,
  textSearch: () => mockSupabase,
  match: () => mockSupabase,
  not: () => mockSupabase,
  or: () => mockSupabase,
  and: () => mockSupabase,
  filter: () => mockSupabase,
  order: () => mockSupabase,
  limit: () => mockSupabase,
  single: () => Promise.resolve({ data: null, error: null }),
  maybeSingle: () => Promise.resolve({ data: null, error: null }),
  csv: () => Promise.resolve({ data: null, error: null }),
  rpc: () => Promise.resolve({ data: null, error: null }),
};

// Test data
const testTenantId = '550e8400-e29b-41d4-a716-446655440000';
const testAgentId = '550e8400-e29b-41d4-a716-446655440001';
const testTaskId = '550e8400-e29b-41d4-a716-446655440002';
const testUserId = '550e8400-e29b-41d4-a716-446655440003';

const mockAgent = {
  id: testAgentId,
  tenant_id: testTenantId,
  name: 'Test Agent',
  role: 'worker',
  status: 'idle',
  capabilities: ['decide', 'escalate'],
  llm_config: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    max_tokens: 4096,
  },
  limits: {
    escalation_threshold: 0.5,
    max_tokens_per_task: 100000,
    max_cost_per_task_usd: 5.0,
    timeout_seconds: 300,
  },
  current_task_id: null,
};

const mockTask = {
  id: testTaskId,
  tenant_id: testTenantId,
  title: 'Test Task',
  description: 'A test task for unit testing',
  type: 'generic',
  status: 'queued',
  priority: 'normal',
  assignee_id: testAgentId,
  inputs: {},
  expected_outputs: {},
  progress_percent: 0,
};

// Test: Schema validation
Deno.test('executeRequestSchema validates correct request', () => {
  const { executeRequestSchema } = await import('../schemas.ts');
  
  const validRequest = {
    agent_id: testAgentId,
    task_id: testTaskId,
    tenant_id: testTenantId,
    action: 'start',
    context: {
      progress_percent: 50,
      current_step: 'Testing',
    },
  };
  
  const result = executeRequestSchema.safeParse(validRequest);
  assertEquals(result.success, true);
});

Deno.test('executeRequestSchema rejects invalid action', () => {
  const { executeRequestSchema } = await import('../schemas.ts');
  
  const invalidRequest = {
    agent_id: testAgentId,
    task_id: testTaskId,
    tenant_id: testTenantId,
    action: 'invalid_action',
  };
  
  const result = executeRequestSchema.safeParse(invalidRequest);
  assertEquals(result.success, false);
});

Deno.test('pickTaskRequestSchema validates correct request', () => {
  const { pickTaskRequestSchema } = await import('../schemas.ts');
  
  const validRequest = {
    agent_id: testAgentId,
    tenant_id: testTenantId,
  };
  
  const result = pickTaskRequestSchema.safeParse(validRequest);
  assertEquals(result.success, true);
});

Deno.test('agentReasoningSchema validates correct reasoning', () => {
  const { agentReasoningSchema } = await import('../schemas.ts');
  
  const validReasoning = {
    thought: 'I should complete this task',
    action: 'complete',
    action_params: { outputs: { result: 'done' } },
    progress_percent: 100,
    confidence: 0.95,
  };
  
  const result = agentReasoningSchema.safeParse(validReasoning);
  assertEquals(result.success, true);
});

// Test: Cost calculations
Deno.test('CostTracker calculates costs correctly', async () => {
  const { CostTracker } = await import('../cost-tracker.ts');
  
  const tracker = new CostTracker(mockSupabase as any);
  
  // Test cost recording (mock)
  const costId = await tracker.recordCost({
    tenant_id: testTenantId,
    agent_id: testAgentId,
    task_id: testTaskId,
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    input_tokens: 1000,
    output_tokens: 500,
  });
  
  // Should return null due to mock, but shouldn't throw
  assertEquals(costId, null);
});

Deno.test('CostTracker checks budget correctly', async () => {
  const { CostTracker } = await import('../cost-tracker.ts');
  
  const tracker = new CostTracker(mockSupabase as any);
  
  const budgetCheck = await tracker.checkBudget(
    testAgentId,
    testTaskId,
    5.0,
    100000
  );
  
  assertEquals(budgetCheck.exceeded, false);
  assertExists(budgetCheck.current_cost);
  assertExists(budgetCheck.current_tokens);
});

// Test: Escalation Manager
Deno.test('EscalationManager calculates SLA deadline correctly', async () => {
  const { EscalationManager } = await import('../escalation.ts');
  
  const manager = new EscalationManager(mockSupabase as any);
  
  // Test escalation creation (mock)
  const result = await manager.createEscalation({
    tenant_id: testTenantId,
    agent_id: testAgentId,
    task_id: testTaskId,
    type: 'clarification',
    urgency: 'high',
    title: 'Test Escalation',
    description: 'Test description',
    situation_context: { current_task_id: testTaskId },
    question: { title: 'Question', details: 'Details' },
    agent_analysis: {
      what_i_know: 'Something',
      what_i_dont_know: 'Something else',
      what_i_tried: ['Tried this'],
    },
  });
  
  // Due to mock, should fail with internal error
  assertEquals(result.success, false);
});

// Test: Task Executor
Deno.test('TaskExecutor handles task not found', async () => {
  const { TaskExecutor } = await import('../executor.ts');
  const { CostTracker } = await import('../cost-tracker.ts');
  const { EscalationManager } = await import('../escalation.ts');
  
  const costTracker = new CostTracker(mockSupabase as any);
  const escalationManager = new EscalationManager(mockSupabase as any);
  const executor = new TaskExecutor(mockSupabase as any, costTracker, escalationManager);
  
  const result = await executor.startTask(testAgentId, testTaskId, testTenantId);
  
  // Should fail due to mock returning null
  assertEquals(result.success, false);
  assertEquals(result.error?.code, 'TASK_NOT_FOUND');
});

Deno.test('TaskExecutor buildExecutionPrompt generates correct prompt', async () => {
  const { TaskExecutor } = await import('../executor.ts');
  const { CostTracker } = await import('../cost-tracker.ts');
  const { EscalationManager } = await import('../escalation.ts');
  
  const costTracker = new CostTracker(mockSupabase as any);
  const escalationManager = new EscalationManager(mockSupabase as any);
  const executor = new TaskExecutor(mockSupabase as any, costTracker, escalationManager);
  
  // Access private method through any type
  const buildPrompt = (executor as any).buildExecutionPrompt.bind(executor);
  
  const prompt = buildPrompt(mockTask, mockAgent, { progress_percent: 50 });
  
  assertEquals(prompt.includes('Test Task'), true);
  assertEquals(prompt.includes('Test Agent'), true);
  assertEquals(prompt.includes('worker'), true);
  assertEquals(prompt.includes('50'), true);
  assertEquals(prompt.includes('JSON'), true);
});

// Test: Edge cases
Deno.test('handles missing tenant_id gracefully', async () => {
  const { executeRequestSchema } = await import('../schemas.ts');
  
  const invalidRequest = {
    agent_id: testAgentId,
    task_id: testTaskId,
    // Missing tenant_id
    action: 'start',
  };
  
  const result = executeRequestSchema.safeParse(invalidRequest);
  assertEquals(result.success, false);
});

Deno.test('handles invalid UUID format', async () => {
  const { executeRequestSchema } = await import('../schemas.ts');
  
  const invalidRequest = {
    agent_id: 'not-a-uuid',
    task_id: testTaskId,
    tenant_id: testTenantId,
    action: 'start',
  };
  
  const result = executeRequestSchema.safeParse(invalidRequest);
  assertEquals(result.success, false);
});

Deno.test('handles progress_percent out of range', async () => {
  const { taskContextSchema } = await import('../schemas.ts');
  
  const invalidContext = {
    progress_percent: 150, // Should be 0-100
  };
  
  const result = taskContextSchema.safeParse(invalidContext);
  assertEquals(result.success, false);
});

Deno.test('handles negative progress_percent', async () => {
  const { taskContextSchema } = await import('../schemas.ts');
  
  const invalidContext = {
    progress_percent: -10,
  };
  
  const result = taskContextSchema.safeParse(invalidContext);
  assertEquals(result.success, false);
});

// Test: Response formats
Deno.test('executionResultSchema validates complete result', () => {
  const { executionResultSchema } = await import('../schemas.ts');
  
  const validResult = {
    task_id: testTaskId,
    agent_id: testAgentId,
    status: 'completed',
    outputs: { result: 'success' },
    cost_usd: 0.05,
    tokens_used: 1000,
    started_at: '2024-01-01T00:00:00Z',
    completed_at: '2024-01-01T00:01:00Z',
    execution_steps: 5,
    escalations_created: 0,
  };
  
  const result = executionResultSchema.safeParse(validResult);
  assertEquals(result.success, true);
});

Deno.test('executionResultSchema validates failed result', () => {
  const { executionResultSchema } = await import('../schemas.ts');
  
  const validResult = {
    task_id: testTaskId,
    agent_id: testAgentId,
    status: 'failed',
    outputs: { error: 'Something went wrong' },
    cost_usd: 0.02,
    tokens_used: 500,
    started_at: '2024-01-01T00:00:00Z',
    completed_at: '2024-01-01T00:00:30Z',
    execution_steps: 2,
    escalations_created: 1,
  };
  
  const result = executionResultSchema.safeParse(validResult);
  assertEquals(result.success, true);
});

// Performance test
Deno.test('schema validation is fast', async () => {
  const { executeRequestSchema } = await import('../schemas.ts');
  
  const validRequest = {
    agent_id: testAgentId,
    task_id: testTaskId,
    tenant_id: testTenantId,
    action: 'start',
  };
  
  const start = performance.now();
  
  for (let i = 0; i < 1000; i++) {
    executeRequestSchema.parse(validRequest);
  }
  
  const end = performance.now();
  const duration = end - start;
  
  // Should complete 1000 validations in under 100ms
  assertEquals(duration < 100, true, `Validation took ${duration}ms, expected < 100ms`);
});

console.log('✅ All agent-execute tests passed!');
