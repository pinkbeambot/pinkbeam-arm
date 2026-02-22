# Database Migration Runbook

**Project:** Pink Beam ARM  
**Purpose:** Zero-downtime database migration strategies and procedures  
**Last Updated:** 2026-02-21  

---

## Table of Contents

1. [Migration Philosophy](#migration-philosophy)
2. [Migration Types](#migration-types)
3. [Zero-Downtime Migration Patterns](#zero-downtime-migration-patterns)
4. [Pre-Migration Checklist](#pre-migration-checklist)
5. [Migration Execution](#migration-execution)
6. [Rollback Procedures](#rollback-procedures)
7. [Testing Migrations](#testing-migrations)
8. [Common Patterns](#common-patterns)

---

## Migration Philosophy

### Core Principles

1. **Backward Compatibility:** Every migration must be backward compatible with the previous app version
2. **Idempotency:** Migrations should be safe to run multiple times
3. **Small Batches:** Large changes should be broken into smaller, incremental migrations
4. **Test in Staging:** All migrations must pass in staging before production
5. **Document Rollbacks:** Every migration must have a documented rollback strategy

### Migration Naming Convention

```
<timestamp>_<description>.sql

Examples:
20260221120000_add_agent_status_index.sql
20260221121500_create_analytics_views.sql
20260221123000_add_tenant_billing_fields.sql
```

---

## Migration Types

### Safe Migrations (Always Allowed)

- Creating new tables
- Adding columns (with defaults or nullable)
- Creating indexes (CONCURRENTLY)
- Adding constraints (NOT NULL with default)
- Creating views/materialized views
- Granting permissions
- Creating triggers/functions

### Risky Migrations (Require Review)

- Adding foreign keys (can lock tables)
- Adding unique constraints (requires table scan)
- Adding NOT NULL without default
- Renaming columns/tables
- Changing column types
- Adding indexes on large tables (>1M rows)

### Dangerous Migrations (Require Explicit Approval)

- Dropping tables/columns
- Removing indexes
- Truncating data
- Deleting rows
- Modifying constraints (removing)

---

## Zero-Downtime Migration Patterns

### Pattern 1: Adding a Column

**Scenario:** Add a new column to an existing table

```sql
-- Migration: 20260221120000_add_agent_priority.sql
-- Step 1: Add column as nullable (safe, no table lock)
ALTER TABLE agents ADD COLUMN priority task_priority DEFAULT 'normal';

-- Step 2: Backfill existing rows (optional, in batches)
-- Do this in application code or a separate migration
UPDATE agents SET priority = 'normal' WHERE priority IS NULL;

-- Step 3: Make NOT NULL (after backfill complete)
-- Do this in a follow-up deployment
-- ALTER TABLE agents ALTER COLUMN priority SET NOT NULL;
```

**Rollback:**
```sql
-- Revert: 20260221120000_revert_add_agent_priority.sql
ALTER TABLE agents DROP COLUMN IF EXISTS priority;
```

### Pattern 2: Renaming a Column

**Scenario:** Rename a column without downtime

```sql
-- Phase 1 Migration: Add new column
-- 20260221120000_add_agent_display_name.sql
ALTER TABLE agents ADD COLUMN display_name TEXT;

-- Create trigger to sync old -> new
CREATE OR REPLACE FUNCTION sync_agent_display_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.display_name = NEW.name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_display_name
    BEFORE INSERT OR UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION sync_agent_display_name();

-- Backfill existing data
UPDATE agents SET display_name = name WHERE display_name IS NULL;
```

```sql
-- Phase 2 (next deployment): Update app to use display_name
-- App code changes to use new column
```

```sql
-- Phase 3 Migration: Remove old column
-- 20260221121500_remove_agent_name.sql
-- After app no longer uses 'name' column:
DROP TRIGGER IF EXISTS trigger_sync_display_name ON agents;
DROP FUNCTION IF EXISTS sync_agent_display_name();
ALTER TABLE agents DROP COLUMN name;
```

### Pattern 3: Adding an Index

**Scenario:** Add index to large table without locking

```sql
-- Migration: 20260221120000_add_agents_tenant_status_index.sql
-- Use CONCURRENTLY to avoid table lock
CREATE INDEX CONCURRENTLY idx_agents_tenant_status 
ON agents(tenant_id, status) 
WHERE status IN ('active', 'idle');
```

**Important:** CONCURRENTLY cannot run inside a transaction block.

**Rollback:**
```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_agents_tenant_status;
```

### Pattern 4: Adding a Foreign Key

**Scenario:** Add foreign key relationship

```sql
-- Migration: 20260221120000_add_task_agent_fk.sql
-- Step 1: Add column (nullable)
ALTER TABLE tasks ADD COLUMN assignee_id UUID REFERENCES agents(id);

-- Step 2: Create index for FK (concurrently)
CREATE INDEX CONCURRENTLY idx_tasks_assignee ON tasks(assignee_id);

-- Step 3: Validate FK after data is clean (in separate migration)
-- ALTER TABLE tasks VALIDATE CONSTRAINT tasks_assignee_id_fkey;
```

### Pattern 5: Large Table Changes

**Scenario:** Modify a table with >1M rows

```sql
-- For very large tables, use batch processing
-- Migration: 20260221120000_backfill_agent_metadata.sql

-- Instead of one big UPDATE, use batches:
DO $$
DECLARE
    batch_size INT := 1000;
    last_id UUID := '00000000-0000-0000-0000-000000000000';
    rows_updated INT;
BEGIN
    LOOP
        UPDATE agents 
        SET metadata = COALESCE(metadata, '{}'::jsonb)
        WHERE id > last_id
        ORDER BY id
        LIMIT batch_size;
        
        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        EXIT WHEN rows_updated = 0;
        
        -- Get last processed ID
        SELECT id INTO last_id 
        FROM agents 
        WHERE metadata IS NOT NULL
        ORDER BY id DESC 
        LIMIT 1;
        
        -- Brief pause to reduce load
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;
```

---

## Pre-Migration Checklist

### Before Any Migration

- [ ] Migration tested in local environment
- [ ] Migration tested in staging environment
- [ ] Rollback script prepared and tested
- [ ] Backup completed (automatic, but verify)
- [ ] Migration review approved (for risky/dangerous migrations)
- [ ] Deployment window scheduled (if needed)
- [ ] Monitoring dashboards open
- [ ] Rollback plan documented

### Migration Review Requirements

For **Risky** migrations, require 1 reviewer approval.  
For **Dangerous** migrations, require CTO approval.

Review checklist:
- [ ] Migration is backward compatible
- [ ] No table locks on hot tables during peak hours
- [ ] Index creation uses CONCURRENTLY
- [ ] Large updates use batching
- [ ] Rollback script provided
- [ ] RLS policies updated if needed
- [ ] tenant_id included in new tables/indexes

---

## Migration Execution

### Automated Deployment

Migrations deploy automatically on merge to `main`:

```bash
# This runs automatically via GitHub Actions
supabase link --project-ref $SUPABASE_PROJECT_REF
supabase db push
```

### Manual Execution (Emergency/Testing)

```bash
# 1. Connect to production (be careful!)
supabase link --project-ref <PROD_REF>

# 2. Dry run (shows what will happen)
supabase db push --dry-run

# 3. Execute migration
supabase db push

# 4. Verify migration applied
supabase migration list
```

### Migration Verification

After deployment, verify:

```sql
-- Check migration status
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;

-- Verify schema changes
\d agents  -- or describe table

-- Check for errors in logs
-- See Supabase Dashboard → Logs → Postgres
```

---

## Rollback Procedures

### Automatic Rollback (Migration Failed)

If a migration fails during deployment, Supabase will roll back automatically. The app will continue running on the previous version.

### Manual Rollback (Data Issues)

If migration succeeded but causes issues:

#### Option 1: Revert Migration (if possible)

```bash
# Create revert migration
echo "-- Revert: $(date +%Y%m%d%H%M%S)_revert_<migration_name>.sql"

# Add revert logic to new migration file
# Then deploy:
supabase db push
```

#### Option 2: Point-in-Time Recovery (PITR)

For critical data corruption:

```bash
# This causes downtime! Use only in emergencies.

# 1. Enable maintenance mode (if possible)
# 2. Go to Supabase Dashboard → Database → Backups
# 3. Select Point in Time Recovery
# 4. Choose timestamp BEFORE the migration
# 5. Confirm recovery
```

### Emergency Rollback Script

```bash
#!/bin/bash
# scripts/emergency-rollback.sh

set -e

echo "🚨 EMERGENCY DATABASE ROLLBACK 🚨"
echo "This will restore the database to a previous state."
echo "Downtime is expected (5-10 minutes)."
read -p "Are you sure? Type 'ROLLBACK' to continue: " confirm

if [ "$confirm" != "ROLLBACK" ]; then
    echo "Cancelled."
    exit 1
fi

# Get target timestamp
echo "Available restore points:"
supabase backups list

read -p "Enter restore timestamp (YYYY-MM-DD HH:MM:SS): " timestamp

# Execute PITR
echo "Initiating point-in-time recovery..."
supabase backups restore --target "$timestamp"

echo "✅ Rollback complete. Verify application functionality."
```

---

## Testing Migrations

### Local Testing

```bash
# Reset local database
supabase db reset

# Apply all migrations
supabase db push

# Run tests
npm run test
npm run test:e2e
```

### Staging Testing

```bash
# Link to staging project
supabase link --project-ref <STAGING_REF>

# Apply migrations
supabase db push

# Run full test suite against staging
npm run test:e2e:staging
```

### Migration Performance Testing

For large migrations, test timing:

```sql
-- Test migration timing
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
-- Your migration SQL here
;
```

### CI Migration Validation

The CI pipeline automatically validates migrations:

```yaml
# .github/workflows/supabase-migration-check.yml
# Runs on every PR with migration changes
- Validates SQL syntax
- Checks for destructive operations
- Verifies RLS policies
- Checks tenant_id presence
```

---

## Common Patterns

### Creating a New Table

```sql
-- Migration: 20260221120000_create_agent_skills.sql

CREATE TABLE agent_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    proficiency INTEGER NOT NULL CHECK (proficiency BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY tenant_isolation_agent_skills ON agent_skills
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at_agent_skills
    BEFORE UPDATE ON agent_skills
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Create trigger for activity logging
CREATE TRIGGER log_activity_agent_skills
    AFTER INSERT OR UPDATE OR DELETE ON agent_skills
    FOR EACH ROW
    EXECUTE FUNCTION log_activity();

-- Create indexes
CREATE INDEX idx_agent_skills_tenant ON agent_skills(tenant_id);
CREATE INDEX idx_agent_skills_agent ON agent_skills(agent_id);
```

### Adding an Enum Value

```sql
-- Migration: 20260221120000_add_task_status_archived.sql

-- Add new enum value (safe operation)
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'archived';
```

### Creating a Materialized View

```sql
-- Migration: 20260221120000_create_agent_performance_view.sql

CREATE MATERIALIZED VIEW agent_performance_summary AS
SELECT 
    tenant_id,
    agent_id,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_completion_time
FROM tasks
GROUP BY tenant_id, agent_id;

-- Create index on materialized view
CREATE INDEX idx_agent_performance_tenant ON agent_performance_summary(tenant_id);

-- Refresh strategy: Manual or scheduled via cron
-- CREATE OR REPLACE FUNCTION refresh_agent_performance()
-- RETURNS void AS $$
-- BEGIN
--     REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_summary;
-- END;
-- $$ LANGUAGE plpgsql;
```

---

## Appendix

### Migration Template

```sql
-- Migration: YYYYMMDDHHMMSS_description.sql
-- Author: <name>
-- Ticket: <issue-number>
-- Description: <brief description>

-- Safety check: Ensure idempotency
DO $$
BEGIN
    -- Check if migration already applied
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'table_name' 
               AND column_name = 'new_column') THEN
        RAISE NOTICE 'Column already exists, skipping';
        RETURN;
    END IF;
    
    -- Apply migration
    ALTER TABLE table_name ADD COLUMN new_column TYPE;
END $$;

-- Add indexes (concurrently if possible)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_name ON table_name(column);

-- Verify
-- SELECT * FROM information_schema.columns WHERE table_name = 'table_name';
```

### Related Documentation

- [Supabase Migration Docs](https://supabase.com/docs/guides/cli/managing-environments)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/sql-altertable.html)
- `docs/PRODUCTION-DEPLOYMENT-RUNBOOK.md` - Overall deployment process

### Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-21 | 1.0 | Initial migration runbook |
