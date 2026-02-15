/**
 * API Versioning Configuration
 *
 * Centralizes version constants and path helpers for the API versioning strategy.
 * See docs/API_VERSIONING.md for the full versioning policy.
 */

export const API_VERSION = 'v1';
export const API_BASE = `/api/${API_VERSION}`;

/** Route prefixes that bypass versioning (auth, external webhooks, docs, health). */
export const NON_VERSIONED_PREFIXES = [
  '/api/auth',
  '/api/billing/webhook',
  '/api/docs',
  '/api/health',
];

/** Check if a pathname should NOT be versioned. */
export function isNonVersionedRoute(pathname: string): boolean {
  return NON_VERSIONED_PREFIXES.some(p => pathname.startsWith(p));
}

/**
 * Convert an API path to its versioned form.
 *
 * - `/api/tasks` → `/api/v1/tasks`
 * - `/api/v1/tasks` → `/api/v1/tasks` (no change)
 * - `/api/auth/initialize` → `/api/auth/initialize` (non-versioned)
 */
export function versionedPath(path: string): string {
  if (!path.startsWith('/api/')) return path;
  if (path.startsWith(`/api/${API_VERSION}/`)) return path;
  if (isNonVersionedRoute(path)) return path;
  return path.replace('/api/', `/api/${API_VERSION}/`);
}
