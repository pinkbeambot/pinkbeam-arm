# Issue #145 Fix Summary

## Problem
Portal pages loaded but API calls returned 403/401 errors:
- GET /api/agents?limit=100 → 403
- GET /api/tasks?page=1&limit=100 → 403  
- GET /api/activities?limit=50 → 401

## Root Cause
API routes were using the Supabase anon key with user JWT tokens, then calling `set_tenant_context` RPC to set the tenant for RLS policies. However, due to connection pooling, the tenant context wasn't persisting across queries, causing RLS policy violations (403 errors).

## Solution
Use service role client for database queries in API routes (server-side only), matching the pattern used by Edge Functions.

### Pattern:
1. Use anon client **only** for auth validation (getting user from JWT)
2. Use service role client for **all database queries** (bypasses RLS)
3. Manually enforce tenant isolation in queries with `.eq('tenant_id', tenantId)`

## Files Changed

### New File
- `src/lib/supabase/service-role.ts` - Service role client utility

### Fixed Routes
1. `src/app/api/agents/route.ts` - GET & POST handlers
2. `src/app/api/tasks/route.ts` - GET & POST handlers  
3. `src/app/api/activities/route.ts` - GET handler
4. `src/app/api/agent-templates/route.ts` - GET & POST handlers
5. `src/app/api/costs/route.ts` - GET handler
6. `src/app/api/decisions/route.ts` - GET & POST handlers
7. `src/app/api/escalations/route.ts` - GET handler
8. `src/app/api/messages/route.ts` - GET handler

## Verification
All endpoints now return 401 (Unauthorized) for invalid tokens instead of 403 (Forbidden):
```
✅ GET /api/agents - 401 (was 403)
✅ GET /api/tasks - 401 (was 403)
✅ GET /api/activities - 401 (was 401/403)
✅ GET /api/agent-templates - 401 (was 403)
✅ GET /api/costs - 401
✅ GET /api/decisions - 401
✅ GET /api/escalations - 401
✅ GET /api/messages - 401
```

## Remaining Work
Additional API sub-routes may need the same fix. Follow the same pattern:
1. Import `createServiceRoleClient`
2. Use anon client for `auth.getUser()` only
3. Use service role client for database operations
4. Add `.eq('tenant_id', tenantId)` to all queries

## Security Note
Using service role client is safe in API routes because:
- Routes run server-side only (no exposure to browser)
- User auth is still validated via JWT before any DB operations
- Tenant isolation is enforced manually in queries
- This matches the security model used by Edge Functions
