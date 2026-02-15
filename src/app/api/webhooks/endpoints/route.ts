/**
 * Webhook Endpoints API Route
 *
 * GET  /api/webhooks/endpoints — List tenant's webhook endpoints
 * POST /api/webhooks/endpoints — Create a new webhook endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';
import { WEBHOOK_EVENT_TYPES } from '@/types/webhook';

const createEndpointSchema = z.object({
  url: z.string().url(),
  description: z.string().max(500).optional(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES as [string, ...string[]])).min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  const { data: endpoints, error } = await supabase
    .from('webhook_endpoints')
    .select('id, tenant_id, url, description, events, is_active, metadata, consecutive_failures, disabled_at, disabled_reason, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch endpoints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({
    data: endpoints || [],
    total: endpoints?.length || 0,
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  const body = await request.json();
  const parsed = createEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Generate a signing secret
  const secret = `whsec_${randomBytes(32).toString('hex')}`;

  const { data: endpoint, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      tenant_id: tenantId,
      url: parsed.data.url,
      description: parsed.data.description || null,
      events: parsed.data.events,
      secret,
      is_active: true,
      metadata: parsed.data.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Return the secret only on creation (never shown again)
  return NextResponse.json({ data: endpoint }, { status: 201 });
}
