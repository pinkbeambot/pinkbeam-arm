import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { bulkUpdateLeadsSchema } from '@/lib/validation';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getTenantId(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single();

  if (profileError || !userProfile?.tenant_id) throw new Error('Tenant not found');
  return userProfile.tenant_id;
}

/**
 * @openapi
 * /leads/bulk:
 *   patch:
 *     summary: Bulk update leads
 *     description: Update multiple leads at once (e.g., move to new stage)
 *     tags:
 *       - Leads
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lead_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               stage:
 *                 type: string
 *               agent_id:
 *                 type: string
 *               is_hot:
 *                 type: boolean
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const body = await request.json();
    const validatedData = bulkUpdateLeadsSchema.parse(body);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const tenantId = await getTenantId(supabase);
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { lead_ids, ...updates } = validatedData;

    // Add meeting_booked_at if stage is meeting_booked
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.stage === 'meeting_booked') {
      updateData.meeting_booked_at = new Date().toISOString();
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .update(updateData)
      .in('id', lead_ids)
      .eq('tenant_id', tenantId)
      .select('id, first_name, last_name, stage, score');

    if (error) {
      console.error('Error bulk updating leads:', error);
      return NextResponse.json(
        { error: 'Failed to update leads', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        updated: leads?.length || 0,
        leads,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    console.error('Unexpected error in PATCH /api/leads/bulk:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
