import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const { data: members, error } = await supabase
      .rpc('get_tenant_members', { p_tenant_id: tenantId });

    if (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error('Unexpected error in GET /api/team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = inviteMemberSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    const guard = requirePermission(userRole, 'team:invite');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', validatedData.email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 409 });
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', auth.userId)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 500 });
    }

    const token = crypto.randomUUID();
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        tenant_id: tenantId,
        email: validatedData.email,
        role: validatedData.role,
        invited_by: currentUser.id,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    return NextResponse.json({ data: invitation, message: `Invitation sent to ${validatedData.email}` }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error in POST /api/team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
