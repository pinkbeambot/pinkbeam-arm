import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { listAgentTemplatesQuerySchema, applyTemplateSchema } from '@/lib/validation';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Helper to create Supabase client with auth
 */
async function createAuthClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];

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

  return supabase;
}

/**
 * Helper to get tenant ID from user
 */
async function getTenantId(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single();

  if (profileError || !userProfile?.tenant_id) {
    return null;
  }

  return { tenantId: userProfile.tenant_id, user };
}

/**
 * GET /api/agent-templates
 * List available agent templates
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantResult = await getTenantId(supabase);
    if (!tenantResult) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    const { tenantId } = tenantResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate query parameters
    const validatedQuery = listAgentTemplatesQuerySchema.parse(queryParams);
    const { category, search, page, limit } = validatedQuery;
    const offset = (page - 1) * limit;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Build query
    let dbQuery = supabase
      .from('agent_templates')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .or(`is_system.eq.true,tenant_id.eq.${tenantId}`)
      .order('is_system', { ascending: false }) // System templates first
      .order('usage_count', { ascending: false })
      .order('name');

    // Apply filters
    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    if (search) {
      dbQuery = dbQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Execute query with pagination
    const { data: templates, error, count } = await dbQuery.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates', details: error.message },
        { status: 500 }
      );
    }

    // Get unique categories for filtering
    const { data: categories } = await supabase
      .from('agent_templates')
      .select('category')
      .eq('is_active', true)
      .or(`is_system.eq.true,tenant_id.eq.${tenantId}`)
      .neq('category', '');

    const uniqueCategories = [...new Set(categories?.map(c => c.category) || [])];

    // Format templates (don't expose full config in list view for brevity)
    const formattedTemplates = templates?.map((template) => ({
      id: template.id,
      name: template.name,
      slug: template.slug,
      description: template.description,
      category: template.category,
      icon: template.icon,
      color: template.color,
      capabilities: template.capabilities,
      recommended_model: template.recommended_model,
      recommended_tools: template.recommended_tools,
      is_system: template.is_system,
      usage_count: template.usage_count,
      created_at: template.created_at,
      // Include config preview for basic info and instructions
      config_preview: {
        basic_info: template.config?.basic_info,
        instructions: template.config?.instructions
          ? {
              system_prompt_preview: template.config.instructions.system_prompt?.slice(0, 200) + '...',
            }
          : undefined,
      },
    }));

    return NextResponse.json({
      data: formattedTemplates,
      meta: {
        categories: uniqueCategories,
      },
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
    console.error('Unexpected error in GET /api/agent-templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-templates
 * Create a new custom template (for future use)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantResult = await getTenantId(supabase);
    if (!tenantResult) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    const { tenantId, user } = tenantResult;

    // Parse request body
    const body = await request.json();
    
    // Validate template data
    const templateSchema = z.object({
      name: z.string().min(1).max(255),
      slug: z.string().min(1).max(100),
      description: z.string().max(1000).optional(),
      category: z.string().max(100).default('custom'),
      icon: z.string().max(100).optional(),
      color: z.string().max(50).default('#6366F1'),
      config: z.record(z.unknown()),
      capabilities: z.array(z.string()).default([]),
      recommended_model: z.string().optional(),
      recommended_tools: z.array(z.string()).default([]),
    });

    const validatedData = templateSchema.parse(body);

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Check if slug already exists for this tenant
    const { data: existing } = await supabase
      .from('agent_templates')
      .select('id')
      .eq('slug', validatedData.slug)
      .or(`is_system.eq.true,tenant_id.eq.${tenantId}`)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Template with this slug already exists' },
        { status: 409 }
      );
    }

    // Create template
    const { data: template, error } = await supabase
      .from('agent_templates')
      .insert({
        tenant_id: tenantId,
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        category: validatedData.category,
        icon: validatedData.icon,
        color: validatedData.color,
        config: validatedData.config,
        capabilities: validatedData.capabilities,
        recommended_model: validatedData.recommended_model,
        recommended_tools: validatedData.recommended_tools,
        is_system: false,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: template, message: 'Template created successfully' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/agent-templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
