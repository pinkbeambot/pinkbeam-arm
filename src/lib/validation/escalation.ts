/**
 * Escalation Validation Schemas
 *
 * Zod schemas for escalation-related validation.
 */

import { z } from 'zod';

export const createEscalationSchema = z.object({
  agent_id: z.string().uuid(),
  task_id: z.string().uuid().optional(),
  type: z.enum(['clarification', 'approval', 'error', 'edge_case', 'policy_violation']),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  situation_context: z.record(z.string(), z.unknown()).optional(),
  question: z.object({
    title: z.string().optional(),
    details: z.string().optional(),
    options: z.array(z.string()).optional(),
  }).optional(),
  agent_analysis: z.object({
    what_i_know: z.string().optional(),
    what_i_dont_know: z.string().optional(),
    what_i_tried: z.array(z.string()).optional(),
    suggested_resolution: z.string().optional(),
  }).optional(),
});

export const updateEscalationSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
  situation_context: z.record(z.string(), z.unknown()).optional(),
  question: z.object({
    title: z.string().optional(),
    details: z.string().optional(),
    options: z.array(z.string()).optional(),
  }).optional(),
  agent_analysis: z.object({
    what_i_know: z.string().optional(),
    what_i_dont_know: z.string().optional(),
    what_i_tried: z.array(z.string()).optional(),
    suggested_resolution: z.string().optional(),
  }).optional(),
});

export const resolveEscalationSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  resolution_type: z.string().optional(),
  resolution_answer: z.string().min(1),
  resolution_resources: z.record(z.string(), z.unknown()).optional(),
  learning_notes: z.string().optional(),
});

export const listEscalationsQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  type: z.enum(['clarification', 'approval', 'error', 'edge_case', 'policy_violation']).optional(),
  agent_id: z.string().uuid().optional(),
  search: z.string().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
