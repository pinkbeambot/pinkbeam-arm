import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

const VALID_STEPS = ['created_agent', 'assigned_task', 'viewed_activity'] as const;
type OnboardingStepKey = (typeof VALID_STEPS)[number];

/**
 * @openapi
 * /onboarding:
 *   patch:
 *     summary: Update onboarding step completion
 *     description: Marks an individual onboarding step as complete for the tenant
 *     tags:
 *       - Onboarding
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - step
 *             properties:
 *               step:
 *                 type: string
 *                 enum: [created_agent, assigned_task, viewed_activity]
 *     responses:
 *       200:
 *         description: Step updated successfully
 *       400:
 *         description: Invalid step name
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    const { step } = body;

    if (!step || !VALID_STEPS.includes(step as OnboardingStepKey)) {
      return NextResponse.json(
        { error: 'Invalid step. Must be one of: ' + VALID_STEPS.join(', ') },
        { status: 400 }
      );
    }

    // Fetch current onboarding steps
    const { data: tenant, error: fetchError } = await auth.supabase
      .from('tenants')
      .select('onboarding_steps')
      .eq('id', auth.tenantId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch tenant onboarding steps:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch onboarding state' },
        { status: 500 }
      );
    }

    const currentSteps = (tenant?.onboarding_steps as Record<string, boolean>) || {
      created_agent: false,
      assigned_task: false,
      viewed_activity: false,
    };

    // Already completed, no-op
    if (currentSteps[step] === true) {
      return NextResponse.json({ onboarding_steps: currentSteps });
    }

    const updatedSteps = { ...currentSteps, [step]: true };

    const { error: updateError } = await auth.supabase
      .from('tenants')
      .update({ onboarding_steps: updatedSteps })
      .eq('id', auth.tenantId);

    if (updateError) {
      console.error('Failed to update onboarding step:', updateError);
      return NextResponse.json(
        { error: 'Failed to update onboarding step' },
        { status: 500 }
      );
    }

    // Auto-complete onboarding when all steps are done
    const allComplete = VALID_STEPS.every((s) => (updatedSteps as Record<string, boolean>)[s] === true);
    if (allComplete) {
      await auth.supabase
        .from('tenants')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', auth.tenantId);
    }

    return NextResponse.json({ onboarding_steps: updatedSteps });
  } catch (error) {
    console.error('Error in PATCH /api/onboarding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
