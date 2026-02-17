import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['queued', 'in_progress', 'review', 'completed', 'failed', 'blocked', 'cancelled']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assigned_agent_id: z.string().uuid().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  order: z.number().int().optional(),
  progress_percent: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const result = taskUpdateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 });
    const updates = result.data;
    const updateData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
    if (updates.status === 'in_progress') updateData.started_at = new Date().toISOString();
    if (updates.status === 'completed') { updateData.completed_at = new Date().toISOString(); updateData.progress_percent = 100; }
    const { data, error } = await supabase.from('tasks').update(updateData).eq('id', id).select('*, assigned_agent:agents(*)').single();
    if (error) {
      console.error('Task PATCH error:', error);
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      return NextResponse.json({ error: 'Failed to update task', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Task PATCH exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const { data, error } = await supabase.from('tasks').select('*, assigned_agent:agents(*)').eq('id', id).single();
    if (error) {
      console.error('Task GET error:', error);
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      return NextResponse.json({ error: 'Failed to fetch task', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Task GET exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Task DELETE error:', error);
      return NextResponse.json({ error: 'Failed to delete task', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Task DELETE exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
