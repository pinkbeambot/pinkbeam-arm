/**
 * Decisions API Unit Tests
 *
 * Tests for decision validation schemas and helper functions.
 */

import { describe, it, expect } from 'vitest';
import {
  createDecisionSchema,
  updateDecisionSchema,
  listDecisionsQuerySchema,
  approveDecisionSchema,
  rejectDecisionSchema,
  overrideDecisionSchema,
  DecisionStatusEnum,
  DecisionCategoryEnum,
} from '@/lib/validation/decision';

// ============================================================================
// Create Decision Schema Tests
// ============================================================================

describe('createDecisionSchema', () => {
  const validDecision = {
    agent_id: '550e8400-e29b-41d4-a716-446655440000',
    category: 'action',
    title: 'Test Decision',
    description: 'A test decision',
    proposed_action: { action: 'deploy', target: 'production' },
    reasoning: {
      context: 'Need to deploy the new feature',
      analysis: 'The feature has been tested and is ready',
      options_considered: [
        {
          description: 'Deploy to production',
          pros: ['Users get the feature', 'Revenue increase'],
          cons: ['Risk of bugs'],
          estimated_outcome: 'Increased user engagement',
          confidence: 0.85,
        },
      ],
      confidence: 0.85,
      risks: [
        {
          description: 'Potential bugs in production',
          likelihood: 'low',
          impact: 'high',
          mitigation: 'Have rollback plan ready',
        },
      ],
    },
    self_authorized: false,
  };

  it('should validate a valid decision creation', () => {
    const result = createDecisionSchema.safeParse(validDecision);
    expect(result.success).toBe(true);
  });

  it('should require agent_id', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      agent_id: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('should validate agent_id is UUID', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      agent_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should validate category enum', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      category: 'invalid_category',
    });
    expect(result.success).toBe(false);
  });

  it('should accept all valid categories', () => {
    const categories = ['action', 'resource', 'escalation', 'strategy', 'system'];
    categories.forEach((category) => {
      const result = createDecisionSchema.safeParse({
        ...validDecision,
        category,
      });
      expect(result.success).toBe(true);
    });
  });

  it('should require title', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('should validate title length', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      title: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('should make task_id optional', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      task_id: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('should validate task_id is UUID when provided', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      task_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should require proposed_action', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      proposed_action: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('should require reasoning', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      reasoning: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('should validate reasoning structure', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      reasoning: {
        context: 'Test',
        // Missing required fields
      },
    });
    expect(result.success).toBe(false);
  });

  it('should validate confidence is between 0 and 1', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      reasoning: {
        ...validDecision.reasoning,
        confidence: 1.5,
      },
    });
    expect(result.success).toBe(false);
  });

  it('should default self_authorized to false', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      self_authorized: undefined,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.self_authorized).toBe(false);
    }
  });
});

// ============================================================================
// Update Decision Schema Tests
// ============================================================================

describe('updateDecisionSchema', () => {
  it('should validate partial updates', () => {
    const result = updateDecisionSchema.safeParse({
      status: 'approved',
    });
    expect(result.success).toBe(true);
  });

  it('should validate status updates', () => {
    const validStatuses = ['proposed', 'approved', 'rejected', 'overridden', 'executed'];
    validStatuses.forEach((status) => {
      const result = updateDecisionSchema.safeParse({ status });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid status', () => {
    const result = updateDecisionSchema.safeParse({
      status: 'invalid_status',
    });
    expect(result.success).toBe(false);
  });

  it('should validate outcome as object', () => {
    const result = updateDecisionSchema.safeParse({
      outcome: { result: 'success', details: 'All good' },
    });
    expect(result.success).toBe(true);
  });

  it('should validate executed_action as object', () => {
    const result = updateDecisionSchema.safeParse({
      executed_action: { action: 'deployed', timestamp: new Date().toISOString() },
    });
    expect(result.success).toBe(true);
  });

  it('should allow empty update (no fields)', () => {
    const result = updateDecisionSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Approve Decision Schema Tests
// ============================================================================

describe('approveDecisionSchema', () => {
  it('should validate empty body (notes optional)', () => {
    const result = approveDecisionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate with notes', () => {
    const result = approveDecisionSchema.safeParse({
      notes: 'Looks good to me',
    });
    expect(result.success).toBe(true);
  });

  it('should reject notes exceeding max length', () => {
    const result = approveDecisionSchema.safeParse({
      notes: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Reject Decision Schema Tests
// ============================================================================

describe('rejectDecisionSchema', () => {
  it('should require reason', () => {
    const result = rejectDecisionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should validate with reason', () => {
    const result = rejectDecisionSchema.safeParse({
      reason: 'This decision is too risky',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty reason', () => {
    const result = rejectDecisionSchema.safeParse({
      reason: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject reason exceeding max length', () => {
    const result = rejectDecisionSchema.safeParse({
      reason: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Override Decision Schema Tests
// ============================================================================

describe('overrideDecisionSchema', () => {
  it('should require reason', () => {
    const result = overrideDecisionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should validate with reason only', () => {
    const result = overrideDecisionSchema.safeParse({
      reason: 'The agent made an incorrect assessment',
    });
    expect(result.success).toBe(true);
  });

  it('should validate with reason and correct_action', () => {
    const result = overrideDecisionSchema.safeParse({
      reason: 'The agent made an incorrect assessment',
      correct_action: { action: 'rollback', target: 'staging' },
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty reason', () => {
    const result = overrideDecisionSchema.safeParse({
      reason: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject reason exceeding max length', () => {
    const result = overrideDecisionSchema.safeParse({
      reason: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// List Decisions Query Schema Tests
// ============================================================================

describe('listDecisionsQuerySchema', () => {
  it('should validate empty query', () => {
    const result = listDecisionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should validate status filter', () => {
    const result = listDecisionsQuerySchema.safeParse({
      status: 'approved',
    });
    expect(result.success).toBe(true);
  });

  it('should validate category filter', () => {
    const result = listDecisionsQuerySchema.safeParse({
      category: 'strategy',
    });
    expect(result.success).toBe(true);
  });

  it('should validate agent_id filter', () => {
    const result = listDecisionsQuerySchema.safeParse({
      agent_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should validate date range filters', () => {
    const result = listDecisionsQuerySchema.safeParse({
      date_from: '2024-01-01T00:00:00Z',
      date_to: '2024-12-31T23:59:59Z',
    });
    expect(result.success).toBe(true);
  });

  it('should validate confidence_min filter', () => {
    const result = listDecisionsQuerySchema.safeParse({
      confidence_min: '0.8',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confidence_min).toBe(0.8);
    }
  });

  it('should reject confidence_min outside range', () => {
    const result = listDecisionsQuerySchema.safeParse({
      confidence_min: '1.5',
    });
    expect(result.success).toBe(false);
  });

  it('should validate search parameter', () => {
    const result = listDecisionsQuerySchema.safeParse({
      search: 'deploy production',
    });
    expect(result.success).toBe(true);
  });

  it('should validate pagination', () => {
    const result = listDecisionsQuerySchema.safeParse({
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
    const result = listDecisionsQuerySchema.safeParse({
      page: '0',
    });
    expect(result.success).toBe(false);
  });

  it('should reject limit over 100', () => {
    const result = listDecisionsQuerySchema.safeParse({
      limit: '101',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Enum Tests
// ============================================================================

describe('DecisionStatusEnum', () => {
  it('should contain all valid statuses', () => {
    const validStatuses = ['proposed', 'approved', 'rejected', 'overridden', 'executed'];
    validStatuses.forEach((status) => {
      expect(DecisionStatusEnum.safeParse(status).success).toBe(true);
    });
  });

  it('should reject invalid status', () => {
    expect(DecisionStatusEnum.safeParse('invalid').success).toBe(false);
  });
});

describe('DecisionCategoryEnum', () => {
  it('should contain all valid categories', () => {
    const validCategories = ['action', 'resource', 'escalation', 'strategy', 'system'];
    validCategories.forEach((category) => {
      expect(DecisionCategoryEnum.safeParse(category).success).toBe(true);
    });
  });

  it('should reject invalid category', () => {
    expect(DecisionCategoryEnum.safeParse('invalid').success).toBe(false);
  });
});

// ============================================================================
// Decision Workflow State Machine Tests
// ============================================================================

describe('Decision Workflow State Transitions', () => {
  const validTransitions: Record<string, string[]> = {
    proposed: ['approved', 'rejected', 'overridden'],
    approved: ['executed', 'overridden'],
    rejected: ['overridden'], // Can override a rejection
    overridden: [], // Terminal state
    executed: ['overridden'], // Can override even after execution
  };

  it('should define valid state transitions', () => {
    // Verify the expected transitions are logical
    expect(validTransitions.proposed).toContain('approved');
    expect(validTransitions.proposed).toContain('rejected');
    expect(validTransitions.proposed).toContain('overridden');
    expect(validTransitions.approved).toContain('executed');
  });

  it('should treat overridden as terminal for most purposes', () => {
    expect(validTransitions.overridden).toHaveLength(0);
  });
});
