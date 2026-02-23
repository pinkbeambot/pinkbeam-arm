---
name: Database Migration
about: Create a new database migration
labels: database
---

## Migration Name
<!-- e.g., add_user_preferences -->

## Purpose
<!-- What does this migration do? -->

## Schema Changes
```sql
-- SQL to execute
CREATE TABLE ...
ALTER TABLE ...
CREATE INDEX ...
```

## Rollback (if needed)
```sql
-- How to undo this migration
```

## Acceptance Criteria
- [ ] Migration file in `supabase/migrations/`
- [ ] Uses `IF NOT EXISTS` where applicable
- [ ] RLS policies added if new table
- [ ] Indexes for performance
- [ ] Dry-run tested: `supabase db push --dry-run`
- [ ] Applied to staging

## Related
<!-- Issue numbers -->
