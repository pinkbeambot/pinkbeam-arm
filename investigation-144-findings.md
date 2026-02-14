# Issue #144 - Root Cause Analysis

## Problem
Portal completely broken with "Tenant not found" errors on all 6 pages:
- /portal (dashboard)
- /portal/agents
- /portal/activity
- /portal/decisions
- /portal/metrics
- /portal/performance

## Root Causes Identified

### 1. Hardcoded DEMO_TENANT_ID in All Portal Pages
All portal pages use a hardcoded dummy tenant ID:
```tsx
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';
```

**Affected files:**
- src/app/(portal)/portal/agents/page.tsx
- src/app/(portal)/portal/agents/[id]/configure/page.tsx
- src/app/(portal)/portal/chat/page.tsx
- src/app/(portal)/portal/decisions/page.tsx

### 2. Direct Supabase Queries Without Tenant Context
The `useDashboardStats` hook queries Supabase directly from the browser:
```tsx
const supabase = createClient();
const { count: activeAgentsCount, error: agentsError } = await supabase
  .from('agents')
  .select('*', { count: 'exact', head: true })
```

**Problem:** RLS policies require `app.current_tenant` to be set via `set_tenant_context()`, but the browser client never calls this function. This causes all direct queries to fail with RLS violations.

### 3. API Routes vs Direct Queries Mismatch
- API routes (`/api/agents`, `/api/activities`, etc.) properly set tenant context
- But hooks like `useDashboardStats` bypass the API and query directly
- Other hooks like `useAgentsRealtime` use API routes correctly

## Fix Required

### Immediate Fix (Frontend)
1. Create a `useTenant()` hook that fetches the real tenant_id from `/api/user/tenant`
2. Update all portal pages to use real tenant ID instead of DEMO_TENANT_ID
3. Fix `useDashboardStats` to use API routes instead of direct Supabase queries

### API Endpoint Needed
Create `/api/user/tenant` endpoint that:
- Extracts user from JWT
- Returns user's tenant_id from users table
- Sets tenant context for RLS

## Files to Modify

1. **Create:** src/lib/hooks/useTenant.ts - New hook to get actual tenant
2. **Create:** src/app/api/user/tenant/route.ts - API endpoint for tenant lookup
3. **Modify:** src/app/(portal)/portal/agents/page.tsx - Use real tenant
4. **Modify:** src/app/(portal)/portal/agents/[id]/configure/page.tsx - Use real tenant
5. **Modify:** src/app/(portal)/portal/chat/page.tsx - Use real tenant
6. **Modify:** src/app/(portal)/portal/decisions/page.tsx - Use real tenant
7. **Modify:** src/components/dashboard/useDashboardStats.ts - Use API instead of direct queries
8. **Create:** src/app/api/dashboard/stats/route.ts - New API endpoint for dashboard stats

## Severity
**P0 - Critical** - All portal functionality is broken for all users

## Assignee
ENG-FE (Frontend Engineer) - Primary fix required in frontend
ENG-BE (Backend Engineer) - Support with API endpoints if needed

## ETA
2-3 hours for complete fix
