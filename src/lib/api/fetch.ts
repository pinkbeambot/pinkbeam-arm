/**
 * Client-side API Fetch Utility
 *
 * Provides `apiFetch()` — a drop-in replacement for `fetch()` that
 * automatically handles:
 *
 * 1. **Authentication** — attaches `Authorization: Bearer <token>` from
 *    the current Supabase session.
 * 2. **CSRF protection** — reads the `csrf_token` cookie and echoes it
 *    back as the `x-csrf-token` header for state-changing requests.
 * 3. **JSON content type** — sets `Content-Type: application/json` when
 *    a `body` is provided (unless overridden).
 *
 * Usage:
 * ```ts
 * import { apiFetch } from '@/lib/api/fetch';
 *
 * const data = await apiFetch('/api/tasks', {
 *   method: 'POST',
 *   body: JSON.stringify({ title: 'New task' }),
 * });
 * ```
 */

import { createBrowserClient } from '@supabase/ssr';

// ── Cookie reader ───────────────────────────────────────────────────────────

/**
 * Read a cookie value by name from `document.cookie`.
 */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

// ── Supabase client singleton ───────────────────────────────────────────────

let _supabase: ReturnType<typeof createBrowserClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

// ── apiFetch ────────────────────────────────────────────────────────────────

export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  /** Additional headers (merged with auth + CSRF headers). */
  headers?: Record<string, string>;
  /** Skip authentication (for public endpoints). Default: false. */
  skipAuth?: boolean;
  /** Timeout in milliseconds. Default: 15000 (15s). */
  timeout?: number;
}

/**
 * Fetch wrapper that automatically includes auth and CSRF headers.
 *
 * @param path  — Relative API path, e.g. `/api/tasks`
 * @param opts  — Standard fetch options plus `skipAuth` and `timeout`
 * @returns       The fetch `Response` object.
 * @throws        If the user is not authenticated (when `skipAuth` is false).
 */
export async function apiFetch(
  path: string,
  opts: ApiFetchOptions = {}
): Promise<Response> {
  const {
    skipAuth = false,
    timeout = 15_000,
    headers: extraHeaders = {},
    ...fetchOpts
  } = opts;

  const headers: Record<string, string> = { ...extraHeaders };

  // ── Auth ──────────────────────────────────────────────────────────────
  if (!skipAuth) {
    const supabase = getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // ── CSRF token ────────────────────────────────────────────────────────
  const csrfToken = getCookie('csrf_token');
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  // ── Content-Type default ──────────────────────────────────────────────
  if (fetchOpts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // ── Timeout ───────────────────────────────────────────────────────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(path, {
      ...fetchOpts,
      headers,
      signal: fetchOpts.signal || controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
