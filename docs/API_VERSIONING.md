---
title: "API Versioning Strategy"
type: reference
status: active
created: 2026-02-15
updated: 2026-02-15
owner: CTO
tags: [api, versioning, reference, backend]
aliases: ["API Versioning", "Versioning Strategy"]
---

# API Versioning Strategy

## Current Version

**v1** — All API endpoints are available under `/api/v1/`.

## URL Structure

```
/api/v1/{resource}
```

Examples:
- `GET /api/v1/agents`
- `POST /api/v1/tasks`
- `GET /api/v1/analytics/overview?days=30`

## Implementation

API versioning uses **Next.js rewrites** rather than physical file moves. Route files remain at `src/app/api/{resource}/route.ts` and requests to `/api/v1/{resource}` are rewritten to `/api/{resource}` at the framework level.

### How It Works

1. **Next.js rewrites** (`next.config.ts`): `/api/v1/:path*` → `/api/:path*`
2. **Middleware** (`src/middleware.ts`): Normalizes versioned paths for route matching, adds `X-API-Version` header
3. **Client utility** (`src/lib/api/versioning.ts`): `versionedPath()` auto-prefixes `/api/` paths with `/api/v1/`
4. **apiFetch** (`src/lib/api/fetch.ts`): Automatically applies `versionedPath()` to all requests

### Versioning Config

The versioning configuration lives in `src/lib/api/versioning.ts`:

```typescript
import { API_VERSION, API_BASE, versionedPath } from '@/lib/api/versioning';

API_VERSION  // 'v1'
API_BASE     // '/api/v1'
versionedPath('/api/tasks')  // '/api/v1/tasks'
versionedPath('/api/auth/login')  // '/api/auth/login' (non-versioned)
```

## Non-Versioned Routes

The following routes are **not versioned** because they serve external integrations, webhooks, or framework-specific purposes:

| Route Pattern | Reason |
|--------------|--------|
| `/api/auth/*` | Supabase Auth callbacks and OAuth flows |
| `/api/billing/webhook` | Stripe webhook endpoint (configured externally) |
| `/api/docs/*` | OpenAPI/Swagger documentation |
| `/api/health` | Infrastructure health checks |

These routes do not receive the `X-API-Version` or `X-Deprecated` headers.

## Response Headers

| Header | Value | When |
|--------|-------|------|
| `X-API-Version` | `v1` | All versioned API responses |
| `X-Deprecated` | `true` | Unversioned API paths (e.g., `/api/agents` instead of `/api/v1/agents`) |

## Backwards Compatibility

Unversioned paths (`/api/agents`, `/api/tasks`, etc.) continue to work. They hit the route files directly without going through the rewrite. However, they return an `X-Deprecated` header to signal that clients should migrate to versioned paths.

**Timeline**: Unversioned paths will be supported for the foreseeable future but may be removed in a future major release. New integrations should always use `/api/v1/`.

## Adding a v2 (Future)

When breaking changes are needed:

1. Create physical route files under `src/app/api/v2/{resource}/route.ts`
2. Add a new rewrite rule (or use the physical routes directly)
3. Update `API_VERSION` default for new clients
4. Maintain v1 routes for the deprecation period
5. Add `X-Sunset` header to v1 responses with the deprecation date

### Breaking Change Policy

A **breaking change** is any of:
- Removing an endpoint or field
- Changing a field's type or format
- Changing error response structure
- Changing authentication requirements
- Changing pagination behavior

**Non-breaking changes** (safe to add without a new version):
- Adding new endpoints
- Adding new optional fields to responses
- Adding new optional query parameters
- Adding new error codes (while preserving existing ones)

## Related Documentation

- [[API]] — Full REST API reference
- [[ARCHITECTURE]] — System architecture
- [[AUTH_IMPLEMENTATION]] — Authentication middleware details
