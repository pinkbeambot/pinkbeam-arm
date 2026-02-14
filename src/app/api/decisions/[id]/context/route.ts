import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/decisions/:id/context
 * Get decision context and alternatives
 * Returns the full reasoning context including options considered, risks, and analysis
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Fetch decision with focus on context and reasoning
    const { data: decision, error } = await supabase
      .from('decisions')
      .select(
        `
        id,
        title,
        description,
        category,
        status,
        proposed_action,
        executed_action,
        reasoning,
        proposed_at,
        decided_at,
        executed_at,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status, description),
        outcome,
        self_authorized,
        overridden_by,
        override_reason,
        overridden_at
      `
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
      }
      console.error('Error fetching decision context:', error);
      return NextResponse.json(
        { error: 'Failed to fetch decision context', details: error.message },
        { status: 500 }
      );
    }

    // Extract reasoning components
    const reasoning = decision.reasoning || {};
    
    // Format the context response
    const contextResponse = {
      decision: {
        id: decision.id,
        title: decision.title,
        description: decision.description,
        category: decision.category,
        status: decision.status,
        proposed_at: decision.proposed_at,
        decided_at: decision.decided_at,
        executed_at: decision.executed_at,
        agent: decision.agent || undefined,
        task: decision.task || undefined,
      },
      context: {
        situation: reasoning.context || '',
        analysis: reasoning.analysis || '',
        confidence: reasoning.confidence ?? null,
      },
      alternatives: reasoning.options_considered || [],
      selected_action: {
        proposed: decision.proposed_action,
        executed: decision.executed_action || null,
        self_authorized: decision.self_authorized,
      },
      risks: reasoning.risks || [],
      outcome: decision.outcome || null,
      override: decision.overridden_by ? {
        reason: decision.override_reason,
        overridden_at: decision.overridden_at,
      } : null,
    };

    return NextResponse.json({
      data: contextResponse,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/decisions/:id/context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
