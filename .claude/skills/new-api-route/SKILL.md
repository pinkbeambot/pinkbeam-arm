---
name: new-api-route
description: Scaffold a new authenticated API route with tenant isolation, Zod validation, and OpenAPI docs
disable-model-invocation: true
---

# Scaffold API Route

Create a new API route following the project's established patterns.

## Arguments

The user should provide a resource name (e.g., "webhooks", "notifications").

## Steps

1. Create the route file at `src/app/api/{resource}/route.ts`

2. Use this template:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

// Validation schemas
const createSchema = z.object({
  // Define fields here
});

/**
 * @openapi
 * /{resource}:
 *   get:
 *     summary: List {resource}
 *     tags:
 *       - {Resource}
 *     security:
 *       - BearerAuth: []
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  const { data, error } = await supabase
    .from('{table}')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * @openapi
 * /{resource}:
 *   post:
 *     summary: Create {resource}
 *     tags:
 *       - {Resource}
 *     security:
 *       - BearerAuth: []
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('{table}')
    .insert({ ...parsed.data, tenant_id: tenantId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
```

## Rules

- ALWAYS use `authenticateRequest()` from `@/lib/api/auth` — never roll custom auth
- ALWAYS filter by `tenant_id` in every query
- ALWAYS validate request bodies with Zod
- Include `@openapi` JSDoc comments for Swagger docs
- Use `createServiceRoleClient()` via the auth context (bypasses RLS, but you must filter by tenant_id explicitly)
- Return proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- For single-item routes, create `src/app/api/{resource}/[id]/route.ts`
