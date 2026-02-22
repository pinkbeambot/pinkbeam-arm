/**
 * Email Preferences API Route
 *
 * GET /api/notifications/email/preferences - Get user's email notification preferences
 * POST /api/notifications/email/preferences - Update user's email notification preferences
 * DELETE /api/notifications/email/preferences - Reset to defaults (unsubscribe all)
 *
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Valid notification types
const NOTIFICATION_TYPES = [
  'task_assigned',
  'escalation_received',
  'decision_required',
  'system_alert',
  'info',
  'success',
  'warning',
  'error',
] as const;

// Valid priorities
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

// Schema for updating preferences
const updatePreferencesSchema = z.object({
  notification_type: z.enum(NOTIFICATION_TYPES),
  channels: z.object({
    in_app: z.boolean().optional(),
    email: z.boolean().optional(),
    webhook: z.boolean().optional(),
    push: z.boolean().optional(),
  }).optional(),
  min_priority: z.enum(PRIORITIES).optional(),
  quiet_hours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string(),
  }).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const bulkUpdateSchema = z.object({
  preferences: z.array(updatePreferencesSchema),
  quiet_hours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string(),
  }).optional(),
});

/**
 * GET /api/notifications/email/preferences
 * Get user's notification preferences
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;

  try {
    // Get all preferences for the user
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('notification_type');

    if (error) {
      console.error('Error fetching preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // If no preferences exist, return defaults
    if (!preferences || preferences.length === 0) {
      const defaultPreferences = NOTIFICATION_TYPES.map((type) => ({
        notification_type: type,
        channels: {
          in_app: true,
          email: ['task_assigned', 'escalation_received', 'decision_required', 'system_alert', 'warning', 'error'].includes(type),
          webhook: false,
          push: ['escalation_received', 'decision_required', 'error'].includes(type),
        },
        min_priority: type === 'error' || type === 'escalation_received' ? 'high' : 'normal',
        quiet_hours: null,
        settings: {},
      }));

      return NextResponse.json({
        data: defaultPreferences,
        meta: {
          is_default: true,
          message: 'Using default preferences. Save to persist changes.',
        },
      });
    }

    return NextResponse.json({
      data: preferences,
      meta: {
        is_default: false,
        updated_at: preferences[0]?.updated_at,
      },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/email/preferences
 * Update user's notification preferences (bulk or single)
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;

  try {
    const body = await request.json();

    // Check if it's a bulk update or single update
    const isBulk = body.preferences !== undefined;

    if (isBulk) {
      const parsed = bulkUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { preferences, quiet_hours } = parsed.data;
      const results = [];
      const errors = [];

      for (const pref of preferences) {
        const { notification_type, ...prefData } = pref;

        // Merge quiet_hours into each preference if provided
        const dataToUpsert = {
          ...prefData,
          ...(quiet_hours && { quiet_hours }),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('notification_preferences')
          .upsert(
            {
              tenant_id: tenantId,
              user_id: userId,
              notification_type,
              ...dataToUpsert,
            },
            { onConflict: 'tenant_id,user_id,notification_type' }
          )
          .select()
          .single();

        if (error) {
          errors.push({ type: notification_type, error: error.message });
        } else {
          results.push(data);
        }
      }

      return NextResponse.json({
        data: results,
        meta: {
          updated: results.length,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } else {
      // Single preference update
      const parsed = updatePreferencesSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { notification_type, ...prefData } = parsed.data;

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            tenant_id: tenantId,
            user_id: userId,
            notification_type,
            ...prefData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,user_id,notification_type' }
        )
        .select()
        .single();

      if (error) {
        console.error('Error updating preference:', error);
        return NextResponse.json(
          { error: 'Failed to update preference' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/email/preferences
 * Reset all preferences to defaults (effectively unsubscribes from emails)
 */
export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;

  try {
    // Delete all user preferences
    const { error } = await supabase
      .from('notification_preferences')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting preferences:', error);
      return NextResponse.json(
        { error: 'Failed to reset preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences reset to defaults',
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
