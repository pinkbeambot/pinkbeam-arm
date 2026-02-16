import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const agentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  role: z.enum(['worker', 'manager', 'ceo']),
  model: z.string().default('claude-3-5-sonnet'),
  status: z.enum(['active', 'paused', 'offline']).default('active'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('agents')
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (role) query = query.eq('role', role);
    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Agents GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Agents GET exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    
    const result = agentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.format() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('agents')
      .insert(result.data)
      .select()
      .single();

    if (error) {
      console.error('Agents POST error:', error);
      return NextResponse.json(
        { error: 'Failed to create agent', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Agents POST exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
