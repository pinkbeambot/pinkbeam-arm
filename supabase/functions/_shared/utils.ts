/**
 * Shared utilities for agent runtime edge functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Re-export schemas and types
export * from './schemas.ts';

// Re-export types explicitly for edge functions
export type {
  SpawnRequest,
  LifecycleRequest,
  TaskExecuteRequest,
  TaskCreateRequest,
  TaskClaimRequest,
  TaskStartRequest,
  TaskCompleteRequest,
  TaskFailRequest,
  SendMessageRequest,
  DecisionProposal,
  EscalationRequest,
  AgentIdentity,
  AgentMessage,
  ProtocolError,
  RuntimeResponse,
} from './schemas.ts';

// Environment variables
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
export const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
export const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

// Create Supabase admin client
export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Agent identity type
export interface AgentIdentity {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  root_id: string;
  depth: number;
  role: string;
  capabilities: string[];
}

// Message type
export interface AgentMessage {
  id: string;
  protocol_version: string;
  timestamp: string;
  from: AgentIdentity;
  to: AgentIdentity | string;
  thread_id: string;
  type: string;
  payload: unknown;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  ttl_seconds: number | null;
  requires_ack: boolean;
  correlation_id: string;
  trace: string[];
}

// Protocol error
export interface ProtocolError {
  code: string;
  message: string;
  retryable: boolean;
  retry_after_seconds?: number;
}

// Standard response wrapper
export interface RuntimeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ProtocolError;
}

// Logger
export function createLogger(context: string) {
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.log(JSON.stringify({ level: 'info', context, message, ...meta }));
    },
    error: (message: string, error: unknown, meta?: Record<string, unknown>) => {
      console.error(JSON.stringify({ 
        level: 'error', 
        context, 
        message, 
        error: error instanceof Error ? error.message : String(error),
        ...meta 
      }));
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      if (Deno.env.get('DEBUG')) {
        console.log(JSON.stringify({ level: 'debug', context, message, ...meta }));
      }
    },
  };
}

// UUID generator
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Get current ISO timestamp
export function nowISO(): string {
  return new Date().toISOString();
}

// Validate agent has capability
export async function validateCapability(
  supabase: ReturnType<typeof createAdminClient>,
  agentId: string,
  capability: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('agents')
    .select('capabilities')
    .eq('id', agentId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.capabilities.includes(capability);
}

// Log activity
export async function logActivity(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  type: string,
  category: string,
  actorType: string,
  actorId: string,
  title: string,
  description?: string,
  metadata?: Record<string, unknown>,
  agentId?: string,
  taskId?: string
): Promise<void> {
  await supabase.from('activities').insert({
    tenant_id: tenantId,
    type,
    category,
    actor_type: actorType,
    actor_id: actorId,
    title,
    description,
    metadata: metadata || {},
    agent_id: agentId,
    task_id: taskId,
  });
}

// Send message to agent
export async function sendMessage(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  message: Omit<AgentMessage, 'protocol_version' | 'timestamp'>
): Promise<RuntimeResponse<{ messageId: string }>> {
  try {
    const { error } = await supabase.from('messages').insert({
      tenant_id: tenantId,
      protocol_version: '1.0',
      message_type: message.type,
      from_agent_id: message.from.id,
      to_agent_id: typeof message.to === 'object' ? message.to.id : null,
      to_broadcast: typeof message.to === 'string' && message.to === 'broadcast',
      thread_id: message.thread_id,
      correlation_id: message.correlation_id,
      payload: message.payload,
      priority: message.priority,
      requires_ack: message.requires_ack,
      trace: { hops: message.trace },
      expires_at: message.ttl_seconds 
        ? new Date(Date.now() + message.ttl_seconds * 1000).toISOString()
        : null,
    });

    if (error) {
      return {
        success: false,
        error: {
          code: 'MESSAGE_SEND_FAILED',
          message: error.message,
          retryable: true,
        },
      };
    }

    return {
      success: true,
      data: { messageId: message.id },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'MESSAGE_SEND_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

// Update agent status
export async function updateAgentStatus(
  supabase: ReturnType<typeof createAdminClient>,
  agentId: string,
  status: string,
  reason?: string
): Promise<RuntimeResponse> {
  try {
    const { error } = await supabase
      .from('agents')
      .update({ 
        status, 
        status_reason: reason,
        updated_at: nowISO(),
      })
      .eq('id', agentId);

    if (error) {
      return {
        success: false,
        error: {
          code: 'STATUS_UPDATE_FAILED',
          message: error.message,
          retryable: true,
        },
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'STATUS_UPDATE_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

// Default agent configuration by role
export function getDefaultAgentConfig(role: string): Record<string, unknown> {
  const configs: Record<string, Record<string, unknown>> = {
    ceo: {
      capabilities: ['spawn', 'delegate', 'decide', 'escalate', 'access_external', 'modify_config'],
      max_sub_agents: 10,
      escalation_threshold: 0.9,
    },
    manager: {
      capabilities: ['spawn', 'delegate', 'decide', 'escalate', 'access_external'],
      max_sub_agents: 5,
      escalation_threshold: 0.7,
    },
    worker: {
      capabilities: ['decide', 'escalate'],
      max_sub_agents: 0,
      escalation_threshold: 0.5,
    },
    specialist: {
      capabilities: ['decide', 'escalate', 'access_external'],
      max_sub_agents: 2,
      escalation_threshold: 0.6,
    },
    system: {
      capabilities: ['spawn', 'delegate', 'decide', 'escalate', 'access_external', 'modify_config'],
      max_sub_agents: 100,
      escalation_threshold: 1.0,
    },
  };

  return configs[role] || configs.worker;
}
