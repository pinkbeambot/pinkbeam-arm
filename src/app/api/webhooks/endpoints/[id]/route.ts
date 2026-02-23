/**
 * Single Webhook Endpoint API Route
 *
 * GET    /api/webhooks/endpoints/:id — Get endpoint details
 * PATCH  /api/webhooks/endpoints/:id — Update endpoint
 * DELETE /api/webhooks/endpoints/:id — Delete endpoint
 * POST   /api/webhooks/endpoints/:id?action=rotate-secret — Rotate signing secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';
import { WEBHOOK_EVENT_TYPES } from '@/types/webhook';

const updateEndpointSchema = z.object({
  url: z.string().url().optional(),
  description: z.string().max(500).optional(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES as [string, ...string[]])).min(1).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  const { data: endpoint, error } = await supabase
    .from('webhook_endpoints')
    .select('id, tenant_id, url, description, events, is_active, metadata, consecutive_failures, disabled_at, disabled_reason, created_at, updated_at')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  return NextResponse.json({ data: endpoint });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  const body = await request.json();
  const parsed = updateEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // If re-enabling, reset failure tracking
  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.is_active === true) {
    updates.consecutive_failures = 0;
    updates.disabled_at = null;
    updates.disabled_reason = null;
  }

  const { data: endpoint, error } = await supabase
    .from('webhook_endpoints')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('id, tenant_id, url, description, events, is_active, metadata, consecutive_failures, disabled_at, disabled_reason, created_at, updated_at')
    .single();

  if (error || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  return NextResponse.json({ data: endpoint });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Failed to delete endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;
  const action = request.nextUrl.searchParams.get('action');

  if (action === 'rotate-secret') {
    const newSecret = `whsec_${randomBytes(32).toString('hex')}`;

    const { data: endpoint, error } = await supabase
      .from('webhook_endpoints')
      .update({ secret: newSecret })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !endpoint) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    // Return secret only on rotation
    return NextResponse.json({ data: endpoint });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
