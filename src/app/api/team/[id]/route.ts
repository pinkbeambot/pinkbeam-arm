import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

/**
 * @openapi
 * /team/{id}:
 *   patch:
 *     summary: Update team member role
 *     description: Update a team member's role (owner only)
 *     tags:
 *       - Team
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [owner, admin, member, viewer]
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires owner role
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    // RBAC: Only owners can update member roles
    const guard = requirePermission(userRole, 'team:manage');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // Use database function to update role (enforces owner-only constraint)
    const { data: success, error } = await supabase
      .rpc('update_user_role', {
        p_user_id: id,
        p_new_role: validatedData.role,
        p_tenant_id: tenantId,
      });

    if (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update role' },
        { status: 400 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Role updated successfully',
      data: { user_id: id, role: validatedData.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in PATCH /api/team/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /team/{id}:
 *   delete:
 *     summary: Remove team member
 *     description: Remove a team member from the tenant (owner only)
 *     tags:
 *       - Team
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires owner role
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    // RBAC: Only owners can remove team members
    const guard = requirePermission(userRole, 'team:manage');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // Use database function to remove member (enforces owner-only constraint)
    const { data: success, error } = await supabase
      .rpc('remove_tenant_member', {
        p_user_id: id,
        p_tenant_id: tenantId,
      });

    if (error) {
      console.error('Error removing team member:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to remove member' },
        { status: 400 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/team/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
