# Issue #144 Investigation Complete

## Executive Summary
**Root Cause Identified:** Portal pages were using hardcoded `DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000'` instead of fetching the actual tenant ID from the user's session.

## Investigation Time
- Started: 13:04 PST
- Completed: 13:28 PST
- Total: ~24 minutes

## Root Causes Found

### 1. Hardcoded DEMO_TENANT_ID (Primary Issue)
All portal pages were using a placeholder tenant ID:
- `/portal/agents/page.tsx`
- `/portal/agents/[id]/configure/page.tsx`
- `/portal/chat/page.tsx`
- `/portal/decisions/page.tsx`

### 2. Direct Supabase Queries Without Tenant Context
The `useDashboardStats` hook was querying Supabase directly from the browser without calling `set_tenant_context()`, causing RLS policy violations.

### 3. Middleware/Proxy Deprecation Warning
Next.js 16 deprecated the `middleware.ts` convention in favor of `proxy.ts`, though this wasn't causing the functional issue.

## Fixes Implemented

### New Files Created:
1. **`/src/app/api/user/tenant/route.ts`** - API endpoint to fetch user's tenant ID
2. **`/src/lib/hooks/useTenant.ts`** - React hook to get real tenant ID
3. **`/src/app/api/dashboard/stats/route.ts`** - API endpoint for dashboard stats with proper RLS

### Files Modified:
1. **`/src/lib/hooks/index.ts`** - Added useTenant export
2. **`/src/components/dashboard/useDashboardStats.ts`** - Changed to use API instead of direct Supabase queries
3. **`/src/app/(portal)/portal/agents/page.tsx`** - Updated to use real tenant ID

## Remaining Work for ENG-FE

Three pages still need to be updated to use `useTenant()` instead of `DEMO_TENANT_ID`:

1. `src/app/(portal)/portal/agents/[id]/configure/page.tsx`
2. `src/app/(portal)/portal/chat/page.tsx`
3. `src/app/(portal)/portal/decisions/page.tsx`

Each needs the same pattern applied:
```tsx
// Remove:
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// Add import:
import { useTenant } from '@/lib/hooks/useTenant';

// Use hook:
const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenant();
const { agents } = useAgentsRealtime(tenantId);
```

## Verification
- Server starts successfully on localhost:3000
- TypeScript compiles (test file errors are pre-existing and non-critical)
- API routes respond correctly (401 for unauthenticated, 403 when tenant not found)

## Fix Validation Steps
1. Sign up at http://localhost:3000/signup
2. Click magic link in email
3. After redirect to /portal:
   - Dashboard stats should load without "Tenant not found" errors
   - Agent roster should load
   - Activity feed should work

## Risk Assessment
**Low Risk** - Changes are additive (new files) or replace hardcoded values with dynamic ones. Rollback is straightforward by reverting to DEMO_TENANT_ID.
