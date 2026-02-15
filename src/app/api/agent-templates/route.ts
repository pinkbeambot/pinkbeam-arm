import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { listAgentTemplatesQuerySchema, applyTemplateSchema } from '@/lib/validation';
import { z } from 'zod';
import { escapeIlike } from '@/lib/utils';

/**
 * GET /api/agent-templates
 * List available agent templates
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

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
      const escaped = escapeIlike(search);
      dbQuery = dbQuery.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }

    // Execute query with pagination
    const { data: templates, error, count } = await dbQuery.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
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
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

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
      config: z.record(z.string(), z.unknown()),
      capabilities: z.array(z.string()).default([]),
      recommended_model: z.string().optional(),
      recommended_tools: z.array(z.string()).default([]),
    });

    const validatedData = templateSchema.parse(body);

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
        { error: 'Failed to create template' },
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
