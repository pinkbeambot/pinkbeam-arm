import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { createMessageSchema, listMessagesQuerySchema } from '@/lib/validation';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * @openapi
 * /messages:
 *   get:
 *     summary: List messages
 *     description: List messages with filtering support for inter-agent communication
 *     tags:
 *       - Messages
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from_agent_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by sender agent ID
 *       - in: query
 *         name: to_agent_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by recipient agent ID
 *       - in: query
 *         name: message_type
 *         schema:
 *           type: string
 *           enum: [spawn.request, spawn.response, task.assign, task.accept, task.reject, task.progress, task.complete, task.fail, decision.propose, decision.confirm, decision.override, escalate.request, escalate.response, message.direct, message.broadcast, system.ping, system.pong, system.config.update, system.error]
 *         description: Filter by message type
 *       - in: query
 *         name: thread_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by thread ID
 *       - in: query
 *         name: unread_only
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Show only unread messages requiring acknowledgment
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *         description: Filter by message priority
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Create Supabase client with user's token
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user to extract tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      from_agent_id: searchParams.get('from_agent_id') || undefined,
      to_agent_id: searchParams.get('to_agent_id') || undefined,
      message_type: searchParams.get('message_type') || searchParams.get('type') || undefined,
      thread_id: searchParams.get('thread_id') || undefined,
      unread_only: searchParams.get('unread_only') || 'false',
      priority: searchParams.get('priority') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate query parameters
    const validatedQuery = listMessagesQuerySchema.parse(queryParams);
    const { page, limit } = validatedQuery;
    const offset = (page - 1) * limit;

    // Build the query
    let dbQuery = supabase
      .from('messages')
      .select(
        `
        *,
        from_agent:from_agent_id(id, name, avatar_url, role, status),
        to_agent:to_agent_id(id, name, avatar_url, role, status)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (validatedQuery.from_agent_id) {
      dbQuery = dbQuery.eq('from_agent_id', validatedQuery.from_agent_id);
    }
    if (validatedQuery.to_agent_id) {
      dbQuery = dbQuery.eq('to_agent_id', validatedQuery.to_agent_id);
    }
    if (validatedQuery.message_type) {
      dbQuery = dbQuery.eq('message_type', validatedQuery.message_type);
    }
    if (validatedQuery.thread_id) {
      dbQuery = dbQuery.eq('thread_id', validatedQuery.thread_id);
    }
    if (validatedQuery.priority) {
      dbQuery = dbQuery.eq('priority', validatedQuery.priority);
    }
    if (validatedQuery.unread_only) {
      dbQuery = dbQuery.eq('requires_ack', true).is('acked_at', null);
    }

    // Execute query
    const { data: messages, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
        { status: 500 }
      );
    }

    // Format response
    const formattedMessages = messages?.map((message) => ({
      ...message,
      from_agent: message.from_agent || undefined,
      to_agent: message.to_agent || undefined,
    }));

    return NextResponse.json({
      data: formattedMessages,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in GET /api/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /messages:
 *   post:
 *     summary: Send a new message
 *     description: Send a message between agents or broadcast to all agents. Supports threaded conversations and acknowledgment tracking.
 *     tags:
 *       - Messages
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMessageInput'
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error or invalid agent/thread
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createMessageSchema.parse(body);

    // Create Supabase client with user's token
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user to extract tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Validate from_agent exists and belongs to tenant (if provided)
    if (validatedData.from_agent_id) {
      const { data: fromAgent, error: fromAgentError } = await supabase
        .from('agents')
        .select('id')
        .eq('id', validatedData.from_agent_id)
        .eq('tenant_id', tenantId)
        .single();

      if (fromAgentError || !fromAgent) {
        return NextResponse.json(
          { error: 'Sender agent not found or does not belong to tenant' },
          { status: 400 }
        );
      }
    }

    // Validate to_agent exists and belongs to tenant (if provided and not broadcast)
    if (validatedData.to_agent_id && !validatedData.to_broadcast) {
      const { data: toAgent, error: toAgentError } = await supabase
        .from('agents')
        .select('id')
        .eq('id', validatedData.to_agent_id)
        .eq('tenant_id', tenantId)
        .single();

      if (toAgentError || !toAgent) {
        return NextResponse.json(
          { error: 'Recipient agent not found or does not belong to tenant' },
          { status: 400 }
        );
      }
    }

    // Validate thread exists if provided
    if (validatedData.thread_id) {
      const { data: threadMessage, error: threadError } = await supabase
        .from('messages')
        .select('id')
        .eq('id', validatedData.thread_id)
        .eq('tenant_id', tenantId)
        .single();

      if (threadError || !threadMessage) {
        return NextResponse.json(
          { error: 'Thread message not found or does not belong to tenant' },
          { status: 400 }
        );
      }
    }

    // Create the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        ...validatedData,
        tenant_id: tenantId,
        protocol_version: validatedData.protocol_version || '1.0',
      })
      .select(
        `
        *,
        from_agent:from_agent_id(id, name, avatar_url, role, status),
        to_agent:to_agent_id(id, name, avatar_url, role, status)
      `
      )
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return NextResponse.json(
        { error: 'Failed to create message', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
