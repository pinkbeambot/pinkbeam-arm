import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    const guard = requirePermission(userRole, 'team:manage');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // Verify the target member belongs to the same tenant
    const { data: member, error: memberError } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', memberId)
      .eq('tenant_id', tenantId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot change an owner's role
    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change the owner\'s role' }, { status: 403 });
    }

    // Update the member's role
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: validatedData.role })
      .eq('id', memberId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error updating member role:', updateError);
      return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
    }

    return NextResponse.json({ data: { id: memberId, role: validatedData.role } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error in PATCH /api/team/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    const guard = requirePermission(userRole, 'team:manage');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // Verify the target member belongs to the same tenant
    const { data: member, error: memberError } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', memberId)
      .eq('tenant_id', tenantId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove an owner
    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the workspace owner' }, { status: 403 });
    }

    // Remove the member by setting status to inactive
    const { error: updateError } = await supabase
      .from('users')
      .update({ status: 'inactive' })
      .eq('id', memberId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error removing member:', updateError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/team/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
