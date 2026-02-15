/**
 * Email Unsubscribe API Route
 *
 * GET /api/notifications/unsubscribe?token=xxx - Unsubscribe from email notifications
 *
 * Token is a base64url-encoded JSON with { tenantId, userId, ts }.
 * Disables email channel for all notification types for that user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Token is valid for 90 days
const TOKEN_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

interface UnsubscribeToken {
  tenantId: string;
  userId: string;
  ts: number;
}

function parseToken(token: string): UnsubscribeToken | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8');
    const parsed = JSON.parse(json);
    if (!parsed.tenantId || !parsed.userId || !parsed.ts) return null;
    return parsed as UnsubscribeToken;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(renderUnsubscribePage('Missing token.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const parsed = parseToken(token);
  if (!parsed) {
    return new NextResponse(renderUnsubscribePage('Invalid token.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Check token age
  if (Date.now() - parsed.ts > TOKEN_MAX_AGE_MS) {
    return new NextResponse(renderUnsubscribePage('This unsubscribe link has expired. Please log in to manage your notification preferences.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const supabase = createServiceRoleClient();

  // Get existing preferences
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('id, notification_type, channels')
    .eq('tenant_id', parsed.tenantId)
    .eq('user_id', parsed.userId);

  if (preferences && preferences.length > 0) {
    // Update each preference to disable email
    for (const pref of preferences) {
      const channels = (pref.channels as Record<string, boolean>) || {};
      channels.email = false;

      await supabase
        .from('notification_preferences')
        .update({
          channels,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pref.id)
        .eq('tenant_id', parsed.tenantId);
    }
  } else {
    // No preferences exist yet — create them with email disabled
    const notificationTypes = [
      'task_assigned',
      'escalation_received',
      'decision_required',
      'system_alert',
    ];

    const newPrefs = notificationTypes.map((type) => ({
      tenant_id: parsed.tenantId,
      user_id: parsed.userId,
      notification_type: type,
      channels: { in_app: true, email: false, webhook: false, push: false },
      min_priority: 'low',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    await supabase
      .from('notification_preferences')
      .insert(newPrefs);
  }

  return new NextResponse(
    renderUnsubscribePage('You have been unsubscribed from email notifications.', true),
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }
  );
}

function renderUnsubscribePage(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe — Pink Beam</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; background: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: white; border-radius: 12px; padding: 48px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { background: linear-gradient(to right, #ec4899, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 24px; font-weight: 600; margin-bottom: 24px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    .message { color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
    .link { color: #ec4899; text-decoration: none; font-weight: 500; }
    .link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Pink Beam</div>
    <div class="icon">${success ? '&#10003;' : '&#10007;'}</div>
    <p class="message">${message}</p>
    <p><a class="link" href="${APP_URL}/portal/settings/notifications">Manage notification preferences</a></p>
  </div>
</body>
</html>`;
}
