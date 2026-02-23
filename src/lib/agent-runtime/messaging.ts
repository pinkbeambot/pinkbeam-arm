/**
 * A2A (Agent-to-Agent) Messaging Service
 * 
 * Handles message routing between agents
 * 
 * @module src/lib/agent-runtime/messaging
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Message, MessagePriority } from '@/types';

const generateUUID = () => crypto.randomUUID();

export type A2AMessageType = 
  | 'task_assignment'
  | 'status_update'
  | 'decision_request'
  | 'escalation'
  | 'message.direct'
  | 'message.broadcast'
  | 'system.ping'
  | 'system.error';

export interface SendMessageInput {
  fromAgentId: string;
  toAgentId?: string | null;
  toRouting?: 'parent' | 'children' | 'broadcast';
  messageType: A2AMessageType;
  payload: Record<string, unknown>;
  priority?: MessagePriority;
  threadId?: string;
  correlationId?: string;
  requiresAck?: boolean;
  ttlSeconds?: number | null;
}

export interface SendMessageResult {
  success: boolean;
  message?: Message;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  recipientCount?: number;
}

export interface MessagingConfig {
  defaultPriority: MessagePriority;
  maxMessageSize: number;
  enableRealtime: boolean;
}

export const DEFAULT_MESSAGING_CONFIG: MessagingConfig = {
  defaultPriority: 'normal',
  maxMessageSize: 1024 * 1024, // 1MB
  enableRealtime: true,
};

export class A2AMessagingService {
  private config: MessagingConfig;

  constructor(config?: Partial<MessagingConfig>) {
    this.config = { ...DEFAULT_MESSAGING_CONFIG, ...config };
  }

  async sendMessage(
    supabase: SupabaseClient,
    tenantId: string,
    input: SendMessageInput
  ): Promise<SendMessageResult> {
    try {
      // Validate sender
      const { data: sender, error: senderError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', input.fromAgentId)
        .eq('tenant_id', tenantId)
        .single();

      if (senderError || !sender) {
        return {
          success: false,
          error: {
            code: 'INVALID_SENDER',
            message: 'Sender agent not found',
            retryable: false,
          },
        };
      }

      // Resolve recipient
      let recipientId: string | null = null;
      let isBroadcast = false;
      let recipientCount = 1;

      if (input.toRouting === 'parent') {
        if (!sender.parent_id) {
          return {
            success: false,
            error: {
              code: 'NO_PARENT',
              message: 'Sender has no parent agent',
              retryable: false,
            },
          };
        }
        recipientId = sender.parent_id;
      } else if (input.toRouting === 'broadcast') {
        // Only CEO and system agents can broadcast
        if (sender.role !== 'ceo' && sender.role !== 'system') {
          return {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Only CEO and system agents can broadcast',
              retryable: false,
            },
          };
        }
        isBroadcast = true;
      } else if (input.toAgentId) {
        recipientId = input.toAgentId;
      } else {
        return {
          success: false,
          error: {
            code: 'NO_RECIPIENT',
            message: 'No recipient specified',
            retryable: false,
          },
        };
      }

      // Validate message size
      const payloadSize = JSON.stringify(input.payload).length;
      if (payloadSize > this.config.maxMessageSize) {
        return {
          success: false,
          error: {
            code: 'MESSAGE_TOO_LARGE',
            message: `Message payload exceeds maximum size`,
            retryable: false,
          },
        };
      }

      // Create message
      const messageId = generateUUID();
      const now = new Date().toISOString();
      const threadId = input.threadId || messageId;

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          tenant_id: tenantId,
          protocol_version: '1.0',
          message_type: input.messageType,
          from_agent_id: input.fromAgentId,
          to_agent_id: recipientId,
          to_broadcast: isBroadcast,
          thread_id: threadId,
          correlation_id: input.correlationId || null,
          payload: input.payload,
          priority: input.priority || this.config.defaultPriority,
          requires_ack: input.requiresAck || false,
          trace: { hops: [input.fromAgentId] },
          expires_at: input.ttlSeconds 
            ? new Date(Date.now() + input.ttlSeconds * 1000).toISOString()
            : null,
          created_at: now,
        })
        .select('*')
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'MESSAGE_CREATE_FAILED',
            message: error.message,
            retryable: true,
          },
        };
      }

      return {
        success: true,
        message: message as Message,
        recipientCount: isBroadcast ? recipientCount : 1,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  async markAsProcessed(
    supabase: SupabaseClient,
    tenantId: string,
    messageId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          processed_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('tenant_id', tenantId);

      return !error;
    } catch {
      return false;
    }
  }

  async acknowledgeMessage(
    supabase: SupabaseClient,
    tenantId: string,
    messageId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          acked_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('tenant_id', tenantId);

      return !error;
    } catch {
      return false;
    }
  }

  getConfig(): MessagingConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<MessagingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

let globalMessagingService: A2AMessagingService | null = null;

export function getMessagingService(config?: Partial<MessagingConfig>): A2AMessagingService {
  if (!globalMessagingService) {
    globalMessagingService = new A2AMessagingService(config);
  }
  return globalMessagingService;
}

export function resetMessagingService(): void {
  globalMessagingService = null;
}

export default A2AMessagingService;
