/**
 * Agent Messaging Edge Function
 * Handles agent-to-agent message routing and delivery
 */

import { createAdminClient, nowISO, createLogger, RuntimeResponse, AgentMessage, sendMessage, generateUUID } from './_shared/utils.ts';

const logger = createLogger('messaging');

// Message routing types
interface RouteMessageRequest {
  tenant_id: string;
  message: Omit<AgentMessage, 'protocol_version' | 'timestamp'>;
}

interface BroadcastRequest {
  tenant_id: string;
  from_agent_id: string;
  message_type: string;
  payload: unknown;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  thread_id?: string;
}

interface DeliveryStatusRequest {
  tenant_id: string;
  message_id: string;
}

interface AckMessageRequest {
  tenant_id: string;
  message_id: string;
  agent_id: string;
}

// Message patterns
const MESSAGE_PATTERNS = {
  // Lifecycle
  'spawn.request': { requiresAuth: true, maxTTL: 60 },
  'spawn.response': { requiresAuth: false, maxTTL: 60 },
  'terminate.request': { requiresAuth: true, maxTTL: 30 },
  'status.update': { requiresAuth: false, maxTTL: 30 },
  
  // Task
  'task.assign': { requiresAuth: true, maxTTL: 300 },
  'task.accept': { requiresAuth: false, maxTTL: 60 },
  'task.reject': { requiresAuth: false, maxTTL: 60 },
  'task.progress': { requiresAuth: false, maxTTL: 60 },
  'task.complete': { requiresAuth: false, maxTTL: 300 },
  'task.fail': { requiresAuth: false, maxTTL: 300 },
  
  // Decision
  'decision.propose': { requiresAuth: false, maxTTL: 300 },
  'decision.confirm': { requiresAuth: true, maxTTL: 300 },
  'decision.override': { requiresAuth: true, maxTTL: 300 },
  
  // Escalation
  'escalate.request': { requiresAuth: false, maxTTL: 86400 },
  'escalate.response': { requiresAuth: true, maxTTL: 86400 },
  
  // Communication
  'message.direct': { requiresAuth: false, maxTTL: 86400 },
  'message.broadcast': { requiresAuth: true, maxTTL: 300 },
  
  // System
  'system.ping': { requiresAuth: false, maxTTL: 30 },
  'system.pong': { requiresAuth: false, maxTTL: 30 },
  'system.config.update': { requiresAuth: true, maxTTL: 60 },
  'system.error': { requiresAuth: false, maxTTL: 300 },
};

/**
 * Route a message to its destination
 */
async function routeMessage(
  request: RouteMessageRequest
): Promise<RuntimeResponse<{ message_id: string; routed_to: string[] }>> {
  const supabase = createAdminClient();
  const { tenant_id, message } = request;
  
  try {
    // Validate message type
    const pattern = MESSAGE_PATTERNS[message.type as keyof typeof MESSAGE_PATTERNS];
    if (!pattern) {
      return {
        success: false,
        error: {
          code: 'INVALID_MESSAGE_TYPE',
          message: `Unknown message type: ${message.type}`,
          retryable: false,
        },
      };
    }

    // Resolve recipient
    let recipientIds: string[] = [];
    
    if (typeof message.to === 'string') {
      // Special routing patterns
      switch (message.to) {
        case 'broadcast': {
          // Send to all agents in tenant
          const { data: agents } = await supabase
            .from('agents')
            .select('id')
            .eq('tenant_id', tenant_id)
            .neq('id', message.from.id);
          
          recipientIds = agents?.map(a => a.id) || [];
          break;
        }
        
        case 'parent': {
          // Send to parent agent
          const { data: agent } = await supabase
            .from('agents')
            .select('parent_id')
            .eq('id', message.from.id)
            .eq('tenant_id', tenant_id)
            .single();
          
          if (agent?.parent_id) {
            recipientIds = [agent.parent_id];
          }
          break;
        }
        
        case 'children': {
          // Send to all child agents
          const { data: children } = await supabase
            .from('agents')
            .select('id')
            .eq('parent_id', message.from.id)
            .eq('tenant_id', tenant_id);
          
          recipientIds = children?.map(c => c.id) || [];
          break;
        }
        
        default:
          return {
            success: false,
            error: {
              code: 'INVALID_RECIPIENT',
              message: `Unknown routing pattern: ${message.to}`,
              retryable: false,
            },
          };
      }
    } else {
      // Direct recipient
      recipientIds = [message.to.id];
    }

    if (recipientIds.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_RECIPIENTS',
          message: 'No recipients found for message',
          retryable: false,
        },
      };
    }

    // Store message for each recipient
    const messageId = message.id || generateUUID();
    const timestamp = nowISO();
    const expiresAt = message.ttl_seconds 
      ? new Date(Date.now() + message.ttl_seconds * 1000).toISOString()
      : null;

    // Create message records
    const messageRecords = recipientIds.map(recipientId => ({
      id: messageId,
      tenant_id: tenant_id,
      protocol_version: '1.0',
      message_type: message.type,
      from_agent_id: message.from.id,
      to_agent_id: recipientId,
      to_broadcast: typeof message.to === 'string' && message.to === 'broadcast',
      thread_id: message.thread_id,
      correlation_id: message.correlation_id,
      payload: message.payload,
      priority: message.priority,
      requires_ack: message.requires_ack,
      trace: { hops: message.trace || [message.from.id] },
      expires_at: expiresAt,
      created_at: timestamp,
    }));

    // Insert messages
    const { error: insertError } = await supabase
      .from('messages')
      .insert(messageRecords);

    if (insertError) {
      logger.error('Failed to store message', insertError);
      return {
        success: false,
        error: {
          code: 'MESSAGE_STORE_FAILED',
          message: insertError.message,
          retryable: true,
        },
      };
    }

    // Create delivery tracking records
    const deliveryRecords = recipientIds.map(recipientId => ({
      tenant_id: tenant_id,
      message_id: messageId,
      status: 'pending',
      expires_at: expiresAt,
      created_at: timestamp,
      updated_at: timestamp,
    }));

    await supabase.from('message_delivery').insert(deliveryRecords);

    logger.info('Message routed', {
      messageId,
      type: message.type,
      recipientCount: recipientIds.length,
    });

    return {
      success: true,
      data: {
        message_id: messageId,
        routed_to: recipientIds,
      },
    };

  } catch (error) {
    logger.error('Message routing failed', error);
    return {
      success: false,
      error: {
        code: 'ROUTING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

/**
 * Broadcast a message to multiple agents
 */
async function broadcastMessage(
  request: BroadcastRequest
): Promise<RuntimeResponse<{ message_id: string; recipient_count: number }>> {
  const supabase = createAdminClient();
  
  try {
    // Get all agents in tenant (except sender)
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id')
      .eq('tenant_id', request.tenant_id)
      .neq('id', request.from_agent_id)
      .neq('status', 'terminated');

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: error.message, retryable: true },
      };
    }

    const messageId = generateUUID();
    const timestamp = nowISO();

    // Create broadcast message
    if (agents && agents.length > 0) {
      const messageRecords = agents.map(agent => ({
        tenant_id: request.tenant_id,
        protocol_version: '1.0',
        message_type: request.message_type,
        from_agent_id: request.from_agent_id,
        to_agent_id: agent.id,
        to_broadcast: true,
        thread_id: request.thread_id,
        payload: request.payload,
        priority: request.priority || 'normal',
        trace: { hops: [request.from_agent_id] },
        created_at: timestamp,
      }));

      await supabase.from('messages').insert(messageRecords);
    }

    return {
      success: true,
      data: {
        message_id: messageId,
        recipient_count: agents?.length || 0,
      },
    };

  } catch (error) {
    logger.error('Broadcast failed', error);
    return {
      success: false,
      error: {
        code: 'BROADCAST_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

/**
 * Get message delivery status
 */
async function getDeliveryStatus(
  tenantId: string,
  messageId: string
): Promise<RuntimeResponse<{ message_id: string; deliveries: unknown[] }>> {
  const supabase = createAdminClient();
  
  try {
    const { data: deliveries, error } = await supabase
      .from('message_delivery')
      .select('*')
      .eq('message_id', messageId)
      .eq('tenant_id', tenantId);

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: error.message, retryable: true },
      };
    }

    return {
      success: true,
      data: {
        message_id: messageId,
        deliveries: deliveries || [],
      },
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

/**
 * Acknowledge message receipt
 */
async function acknowledgeMessage(
  request: AckMessageRequest
): Promise<RuntimeResponse> {
  const supabase = createAdminClient();
  
  try {
    const now = nowISO();
    
    // Update message
    await supabase
      .from('messages')
      .update({ 
        acked_at: now,
        processed_at: now,
      })
      .eq('id', request.message_id)
      .eq('tenant_id', request.tenant_id);

    // Update delivery record
    await supabase
      .from('message_delivery')
      .update({
        status: 'delivered',
        acked_at: now,
        acked_by_agent_id: request.agent_id,
        updated_at: now,
      })
      .eq('message_id', request.message_id)
      .eq('tenant_id', request.tenant_id);

    return {
      success: true,
      data: { acknowledged: true, at: now },
    };

  } catch (error) {
    logger.error('Acknowledge failed', error);
    return {
      success: false,
      error: {
        code: 'ACK_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

/**
 * Get pending messages for an agent
 */
async function getPendingMessages(
  tenantId: string,
  agentId: string,
  limit: number = 50
): Promise<RuntimeResponse<{ messages: unknown[] }>> {
  const supabase = createAdminClient();
  
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        message_delivery!inner(status)
      `)
      .eq('tenant_id', tenantId)
      .eq('to_agent_id', agentId)
      .eq('message_delivery.status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: error.message, retryable: true },
      };
    }

    return {
      success: true,
      data: { messages: messages || [] },
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

/**
 * Deno Edge Function Handler
 */
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // GET request - fetch pending messages
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const agentId = url.searchParams.get('agent_id');
      const tenantId = url.searchParams.get('tenant_id');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      if (!agentId || !tenantId) {
        return new Response(
          JSON.stringify({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing agent_id or tenant_id', retryable: false } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await getPendingMessages(tenantId, agentId, limit);
      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // POST request - message operations
    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body;

      let result: RuntimeResponse;

      switch (action) {
        case 'route':
          result = await routeMessage(body);
          break;
        case 'broadcast':
          result = await broadcastMessage(body);
          break;
        case 'ack':
          result = await acknowledgeMessage(body);
          break;
        case 'status':
          result = await getDeliveryStatus(body.tenant_id, body.message_id);
          break;
        default:
          return new Response(
            JSON.stringify({ success: false, error: { code: 'BAD_REQUEST', message: 'Unknown action', retryable: false } }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
      }

      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : (result.error?.code?.includes('NOT_FOUND') || result.error?.code?.includes('INVALID') ? 400 : 500),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET/POST allowed', retryable: false } }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Handler error', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
          retryable: true,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
