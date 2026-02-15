---
name: create-migration
description: Create a new Supabase migration file with proper naming, RLS policies, and tenant isolation
disable-model-invocation: true
---

# Create Supabase Migration

Create a new numbered migration file in `supabase/migrations/`.

## Steps

1. List existing migrations to determine the next number:
   ```bash
   ls supabase/migrations/ | tail -1
   ```

2. Create the migration file with the next sequential number (zero-padded to 3 digits):
   - Format: `{NNN}_{snake_case_description}.sql`
   - Example: `023_add_webhook_events.sql`

3. Include this template structure in every migration:

```sql
-- Migration: {NNN}_{description}
-- Description: {what this migration does}
-- Date: {today}

BEGIN;

-- ============================================================================
-- Schema Changes
-- ============================================================================

-- {tables, columns, indexes, etc.}

-- ============================================================================
-- RLS Policies (if new tables added)
-- ============================================================================

-- IMPORTANT: Every table MUST have tenant_id and RLS enabled
-- ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "tenant_isolation" ON {table}
--   USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- ============================================================================
-- Functions / Triggers (if needed)
-- ============================================================================

COMMIT;
```

## Rules

- Every new table MUST include a `tenant_id UUID NOT NULL REFERENCES tenants(id)` column
- Every new table MUST have RLS enabled with a tenant isolation policy
- Use `current_setting('app.current_tenant')::uuid` for RLS policies (matches existing pattern)
- Add appropriate indexes (especially on `tenant_id` and foreign keys)
- Wrap everything in BEGIN/COMMIT
- If the user provides a description argument, use it for the filename and SQL comment
