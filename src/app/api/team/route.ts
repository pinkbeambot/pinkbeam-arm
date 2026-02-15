import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

/**
 * @openapi
 * /team:
 *   get:
 *     summary: List team members
 *     description: Returns all members of the current tenant with their roles
 *     tags:
 *       - Team
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of team members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user_id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       name:
 *                         type: string
 *                       role:
 *                         type: string
 *                         enum: [owner, admin, member, viewer]
 *                       status:
 *                         type: string
 *                       last_active_at:
 *                         type: string
 *                       created_at:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Fetch team members using the database function
    const { data: members, error } = await supabase
      .rpc('get_tenant_members', { p_tenant_id: tenantId });

    if (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error('Unexpected error in GET /api/team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /team:
 *   post:
 *     summary: Invite a new team member
 *     description: Creates an invitation for a new team member (owner/admin only)
 *     tags:
 *       - Team
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [admin, member, viewer]
 *                 default: member
 *     responses:
 *       201:
 *         description: Invitation created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires team:invite permission
 *       409:
 *         description: User already in team or invitation pending
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = inviteMemberSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    // RBAC: Check if user can invite team members
    const guard = requirePermission(userRole, 'team:invite');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // Check if user already exists in tenant
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', validatedData.email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 409 }
      );
    }

    // Check for pending invitation
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('email', validatedData.email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json(
        { error: 'Invitation already pending for this email' },
        { status: 409 }
      );
    }

    // Get current user ID
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', auth.userId)
      .single();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 500 }
      );
    }

    // Create invitation with token
    const token = crypto.randomUUID();
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        tenant_id: tenantId,
        email: validatedData.email,
        role: validatedData.role,
        invited_by: currentUser.id,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // TODO: Send invitation email
    // await sendInvitationEmail(validatedData.email, token, invitation.id);

    return NextResponse.json(
      { 
        data: invitation,
        message: `Invitation sent to ${validatedData.email}` 
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
