/**
 * POST /api/meta-agent/process
 * Process a CEO message through VALIS
 * Issue: #17 - Meta-Agent Natural Language Interface
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { processCommand, extractIntent } from '@/lib/meta-agent/intent-processor';
import type { ProcessMessageRequest, MetaAgentSessionContext } from '@/types/meta-agent';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Demo tenant/user IDs for development
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const processMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  session_id: z.string().uuid().optional(),
  context: z.object({}).passthrough().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, id')
      .eq('auth_id', user.id)
      .single();

    // Use demo IDs if no profile (for development)
    const tenantId = userProfile?.tenant_id || DEMO_TENANT_ID;
    const userId = userProfile?.id || DEMO_USER_ID;

    if (profileError && !process.env.NODE_ENV?.includes('development')) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    // Set tenant context
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Parse and validate request
    const body = await request.json();
    const validatedData = processMessageSchema.parse(body);

    // Get or create session
    let sessionId = validatedData.session_id;
    if (!sessionId) {
      const { data: newSessionId, error: sessionError } = await supabase.rpc(
        'get_or_create_meta_agent_session',
        {
          p_tenant_id: tenantId,
          p_user_id: userId,
          p_title: `VALIS Session ${new Date().toLocaleString()}`,
        }
      );
      
      if (sessionError) {
        console.error('Error creating session:', sessionError);
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        );
      }
      
      sessionId = newSessionId;
    }

    // Get session context
    const { data: session, error: sessionError } = await supabase
      .from('meta_agent_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Extract intent first for logging
    const { intent, confidence, entities } = extractIntent(validatedData.message);

    // Create command record
    const { data: command, error: commandError } = await supabase
      .from('meta_agent_commands')
      .insert({
        tenant_id: tenantId,
        session_id: sessionId,
        user_id: userId,
        raw_message: validatedData.message,
        intent,
        intent_confidence: confidence,
        extracted_entities: entities,
        status: 'processing',
        response_message: 'Processing...',
        response_metadata: {
          processing_stage: 'started',
        },
      })
      .select()
      .single();

    if (commandError) {
      console.error('Error creating command:', commandError);
      return NextResponse.json(
        { error: 'Failed to create command record' },
        { status: 500 }
      );
    }

    // Build session context
    const sessionContext: MetaAgentSessionContext = session.context || {};

    // Process the command
    const context = {
      tenant_id: tenantId,
      user_id: userId,
      session_id: sessionId!,
      command_id: command.id,
      supabase,
    };

    const result = await processCommand(validatedData.message, sessionContext, context);

    // Update command with results
    const processingTime = Date.now() - startTime;
    
    const { data: updatedCommand, error: updateError } = await supabase
      .from('meta_agent_commands')
      .update({
        status: result.success ? 'completed' : 'failed',
        action_type: result.result ? 'executed' : undefined,
        result: result.result ? { data: result.result } : undefined,
        result_summary: result.result_summary,
        error_message: result.error || undefined,
        error_details: result.error ? { message: result.error } : undefined,
        response_message: result.response_message,
        response_metadata: {
          ...result.metadata,
          suggested_followups: result.suggested_followups,
          processing_stage: 'completed',
        },
        processing_time_ms: processingTime,
        processed_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', command.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating command:', updateError);
    }

    // Update session context
    const updatedContext: MetaAgentSessionContext = {
      ...sessionContext,
      last_intent: intent,
      referenced_agents: entities.agent_names,
      conversation_state: 'idle',
    };

    await supabase
      .from('meta_agent_sessions')
      .update({
        context: updatedContext,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // Return response
    return NextResponse.json({
      command: updatedCommand || command,
      session: {
        ...session,
        context: updatedContext,
      },
      suggested_actions: result.suggested_followups?.map((text, index) => ({
        label: text,
        action: 'send_message',
        params: { message: text },
      })),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error processing meta-agent message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
