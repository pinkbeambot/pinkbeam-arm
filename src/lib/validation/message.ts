/**
 * Message Validation Schemas
 *
 * Zod schemas for agent-to-agent messaging.
 */

import { z } from 'zod';

export const messageTypeSchema = z.enum([
  'spawn.request', 'spawn.response',
  'task.assign', 'task.accept', 'task.reject', 'task.progress', 'task.complete', 'task.fail',
  'decision.propose', 'decision.confirm', 'decision.override',
  'escalate.request', 'escalate.response',
  'message.direct', 'message.broadcast',
  'system.ping', 'system.pong', 'system.config.update', 'system.error'
]);

export const messagePrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const createMessageSchema = z.object({
  message_type: messageTypeSchema,
  from_agent_id: z.string().uuid().optional(),
  to_agent_id: z.string().uuid().optional(),
  to_broadcast: z.boolean().default(false),
  thread_id: z.string().uuid().optional(),
  correlation_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
  priority: messagePrioritySchema.default('normal'),
  requires_ack: z.boolean().default(false),
  trace: z.array(z.unknown()).optional(),
  expires_at: z.string().datetime().optional(),
  protocol_version: z.string().default('1.0'),
});

export const updateMessageSchema = z.object({
  acked_at: z.string().datetime().optional(),
  processed_at: z.string().datetime().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const listMessagesQuerySchema = z.object({
  from_agent_id: z.string().uuid().optional(),
  to_agent_id: z.string().uuid().optional(),
  message_type: messageTypeSchema.optional(),
  thread_id: z.string().uuid().optional(),
  unread_only: z.enum(['true', 'false']).transform((val) => val === 'true').default(false),
  priority: messagePrioritySchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type MessageType = z.infer<typeof messageTypeSchema>;
export type MessagePriority = z.infer<typeof messagePrioritySchema>;
