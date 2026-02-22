/**
 * Real-time Activity Subscription API
 * 
 * GET /api/activities/subscribe
 * 
 * Establishes a Server-Sent Events (SSE) connection for real-time activity updates
 * using Supabase Realtime. This endpoint supports:
 * - Live activity feed updates
 * - Filtered subscriptions by entity_type and agent_id
 * - Automatic reconnection with Last-Event-ID
 * - Heartbeat/ping messages for connection health
 * 
 * Usage:
 * const eventSource = new EventSource('/api/activities/subscribe?entity_type=tasks');
 * eventSource.onmessage = (event) => {
 *   const activity = JSON.parse(event.data);
 *   // Update UI with new activity
 * };
 * 
 * For WebSocket connections (client-side direct Supabase Realtime):
 * - Use the Supabase client directly with channel 'tenant:{tenant_id}:activities'
 * - This SSE endpoint is provided for simpler integrations and legacy clients
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listActivitiesQuerySchema } from '@/lib/validation';
import { NextRequest } from 'next/server';

// SSE heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Connection timeout (5 minutes)
const CONNECTION_TIMEOUT = 5 * 60 * 1000;

/**
 * Validates subscription parameters
 */
function validateSubscriptionParams(searchParams: URLSearchParams) {
  const params: Record<string, string | undefined> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Only validate filter params that are provided
  const result = listActivitiesQuerySchema.partial().safeParse(params);
  return result;
}

/**
 * GET /api/activities/subscribe
 * 
 * Establishes Server-Sent Events connection for real-time activity updates.
 * 
 * Query Parameters:
 * - entity_type: Filter by entity type ('all', 'tasks', 'decisions', 'escalations', 'agents', 'system')
 * - agent_id: Filter by specific agent
 * - action_type: Filter by specific action type
 * 
 * Headers:
 * - Last-Event-ID: Resume from specific sequence number (for reconnection)
 * 
 * Events:
 * - activity: New activity record (data: Activity)
 * - heartbeat: Keep-alive ping (data: { timestamp: string })
 * - error: Error occurred (data: { error: string, code: string })
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    // Get tenant context from user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        'data: ' + JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }) + '\n\n',
        { 
          status: 401,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          }
        }
      );
    }

    // Get user's tenant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.tenant_id) {
      return new Response(
        'data: ' + JSON.stringify({ error: 'Tenant not found', code: 'TENANT_NOT_FOUND' }) + '\n\n',
        { 
          status: 403,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          }
        }
      );
    }

    const tenantId = userData.tenant_id;

    // Validate subscription parameters
    const validationResult = validateSubscriptionParams(searchParams);
    if (!validationResult.success) {
      return new Response(
        'data: ' + JSON.stringify({ 
          error: 'Invalid subscription parameters', 
          code: 'VALIDATION_FAILED',
          details: validationResult.error.format()
        }) + '\n\n',
        { 
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          }
        }
      );
    }

    const filters = validationResult.data;
    
    // Get Last-Event-ID for reconnection support
    const lastEventId = request.headers.get('Last-Event-ID');
    const resumeFromSequence = lastEventId ? parseInt(lastEventId, 10) : null;

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const connectEvent = {
          event: 'connected',
          data: JSON.stringify({
            tenant_id: tenantId,
            timestamp: new Date().toISOString(),
            resume_from: resumeFromSequence,
            filters: {
              entity_type: filters.entity_type,
              agent_id: filters.agent_id,
              action_type: filters.action_type,
            },
          }),
        };
        controller.enqueue(`event: connected\ndata: ${connectEvent.data}\n\n`);

        // Set up Supabase Realtime subscription
        const channelName = `tenant:${tenantId}:activities`;
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'activities',
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload) => {
              const activity = payload.new;
              
              // Apply client-side filters
              if (filters.entity_type && filters.entity_type !== 'all') {
                const expectedCategory = filters.entity_type.replace(/s$/, '');
                if (activity.category !== expectedCategory) {
                  return;
                }
              }

              if (filters.agent_id) {
                if (activity.agent_id !== filters.agent_id && activity.actor_id !== filters.agent_id) {
                  return;
                }
              }

              if (filters.action_type && activity.type !== filters.action_type) {
                return;
              }

              // Send activity event with sequence_number as id
              const eventId = activity.sequence_number?.toString() || activity.id;
              controller.enqueue(
                `id: ${eventId}\nevent: activity\ndata: ${JSON.stringify(activity)}\n\n`
              );
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              controller.enqueue(
                `event: subscribed\ndata: ${JSON.stringify({ channel: channelName, status })}\n\n`
              );
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              controller.enqueue(
                `event: error\ndata: ${JSON.stringify({ error: 'Subscription closed', status })}\n\n`
              );
            }
          });

        // Send missed events if reconnecting
        if (resumeFromSequence && !isNaN(resumeFromSequence)) {
          supabase
            .from('activities')
            .select('*')
            .eq('tenant_id', tenantId)
            .gt('sequence_number', resumeFromSequence)
            .order('sequence_number', { ascending: true })
            .then(({ data, error }) => {
              if (!error && data) {
                data.forEach((activity) => {
                  const eventId = activity.sequence_number?.toString() || activity.id;
                  controller.enqueue(
                    `id: ${eventId}\nevent: activity\ndata: ${JSON.stringify(activity)}\n\n`
                  );
                });
              }
            });
        }

        // Set up heartbeat interval
        const heartbeatInterval = setInterval(() => {
          controller.enqueue(
            `event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`
          );
        }, HEARTBEAT_INTERVAL);

        // Set up connection timeout
        const timeoutId = setTimeout(() => {
          clearInterval(heartbeatInterval);
          channel.unsubscribe();
          controller.enqueue(
            `event: timeout\ndata: ${JSON.stringify({ message: 'Connection timeout' })}\n\n`
          );
          controller.close();
        }, CONNECTION_TIMEOUT);

        // Clean up on abort
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          clearTimeout(timeoutId);
          channel.unsubscribe();
          controller.close();
        });
      },

      cancel() {
        // Cleanup is handled by abort listener
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (err) {
    console.error('Activities subscribe error:', err);
    return new Response(
      'data: ' + JSON.stringify({ 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR' 
      }) + '\n\n',
      { 
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      }
    );
  }
}

/**
 * WebSocket upgrade handler for direct WebSocket connections
 * Note: This is provided as an alternative to SSE for clients that prefer WebSockets
 * Most clients should use the Supabase client directly for WebSocket connections
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Last-Event-ID',
    },
  });
}
