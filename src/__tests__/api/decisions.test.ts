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

  it('should validate category enum', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      category: 'invalid_category',
    });
    expect(result.success).toBe(false);
  });

  it('should require title', () => {
    const result = createDecisionSchema.safeParse({
      ...validDecision,
      title: '',
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
});

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
});

describe('overrideDecisionSchema', () => {
  it('should require reason', () => {
    const result = overrideDecisionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should validate with reason', () => {
    const result = overrideDecisionSchema.safeParse({
      reason: 'The agent made an incorrect assessment',
    });
    expect(result.success).toBe(true);
  });
});

describe('listDecisionsQuerySchema', () => {
  it('should validate empty query', () => {
    const result = listDecisionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });
});
