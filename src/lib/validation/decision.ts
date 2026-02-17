/**
 * Decision Validation Schemas
 *
 * Zod schemas for decision-related API requests.
 * These schemas define the shape and constraints for creating,
 * updating, and managing decisions.
 */

import { z } from 'zod';

// ============================================================================
// Enums (matching database types)
// ============================================================================

export const DecisionStatusEnum = z.enum([
  'proposed',
  'approved',
  'rejected',
  'overridden',
  'executed',
]);

export const DecisionCategoryEnum = z.enum([
  'action',
  'resource',
  'escalation',
  'strategy',
  'system',
]);

// ============================================================================
// Sub-schemas (reusable components)
// ============================================================================

export const optionSchema = z.object({
  description: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  estimated_outcome: z.string(),
  confidence: z.number().min(0).max(1),
});

export const riskSchema = z.object({
  description: z.string(),
  likelihood: z.enum(['low', 'medium', 'high']),
  impact: z.enum(['low', 'medium', 'high']),
  mitigation: z.string().optional(),
});

export const reasoningSchema = z.object({
  context: z.string(),
  analysis: z.string(),
  options_considered: z.array(optionSchema),
  confidence: z.number().min(0).max(1),
  risks: z.array(riskSchema),
});

// ============================================================================
// Create Decision Schema
// ============================================================================

export const createDecisionSchema = z.object({
  agent_id: z.string().uuid(),
  task_id: z.string().uuid().optional(),
  category: DecisionCategoryEnum,
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  proposed_action: z.record(z.string(), z.unknown()),
  reasoning: reasoningSchema,
  self_authorized: z.boolean().default(false),
});

export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;

// ============================================================================
// Update Decision Schema
// ============================================================================

export const updateDecisionSchema = z.object({
  status: DecisionStatusEnum.optional(),
  outcome: z.record(z.string(), z.unknown()).optional(),
  executed_action: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateDecisionInput = z.infer<typeof updateDecisionSchema>;

// ============================================================================
// Override Decision Schema
// ============================================================================

export const overrideDecisionSchema = z.object({
  reason: z.string().min(1).max(2000),
  correct_action: z.record(z.string(), z.unknown()).optional(),
});

export type OverrideDecisionInput = z.infer<typeof overrideDecisionSchema>;

// ============================================================================
// Approve Decision Schema
// ============================================================================

export const approveDecisionSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export type ApproveDecisionInput = z.infer<typeof approveDecisionSchema>;

// ============================================================================
// Reject Decision Schema
// ============================================================================

export const rejectDecisionSchema = z.object({
  reason: z.string().min(1).max(2000),
});

export type RejectDecisionInput = z.infer<typeof rejectDecisionSchema>;

// ============================================================================
// List Decisions Query Schema
// ============================================================================

export const listDecisionsQuerySchema = z.object({
  agent_id: z.string().uuid().optional(),
  status: DecisionStatusEnum.optional(),
  category: DecisionCategoryEnum.optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  confidence_min: z.coerce.number().min(0).max(1).optional(),
  search: z.string().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListDecisionsQuery = z.infer<typeof listDecisionsQuerySchema>;

// ============================================================================
// Decision Action Schemas
// ============================================================================

export const decisionActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'override', 'execute']),
  reason: z.string().optional(),
});

export type DecisionActionInput = z.infer<typeof decisionActionSchema>;

// ============================================================================
// Re-export from main validation file for consistency
// ============================================================================

export {
  createDecisionSchema as createDecisionSchemaCanonical,
  updateDecisionSchema as updateDecisionSchemaCanonical,
  listDecisionsQuerySchema as listDecisionsQuerySchemaCanonical,
  overrideDecisionSchema as overrideDecisionSchemaCanonical,
} from '@/lib/validation';
