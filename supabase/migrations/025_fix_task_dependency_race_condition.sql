-- Migration 025: Fix race condition in task dependency auto-unblock trigger
-- Fixes GitHub Issue #77
--
-- Problems:
-- 1. Two triggers fire on task completion: check_task_dependencies (003)
--    and manage_task_dependencies (007), causing duplicate unblock attempts
-- 2. Neither trigger uses row-level locking, so concurrent completions
--    can read stale state and produce inconsistent results
-- 3. The NOT EXISTS check in the original triggers is susceptible to
--    time-of-check / time-of-use (TOCTOU) races
--
-- Fix:
-- 1. Drop the legacy trigger from migration 003 (superseded by 007)
-- 2. Replace manage_task_dependencies() with a version that uses
--    explicit row-level locking (FOR UPDATE) and an advisory lock
--    to serialize concurrent unblock attempts for the same dependent task
-- 3. Add a status transition guard (only unblock tasks still 'blocked')
-- 4. Log unblock events to the activities table for auditability

-- ============================================================================
-- 1. Drop the duplicate legacy trigger from migration 003
-- ============================================================================
DROP TRIGGER IF EXISTS task_dependency_check ON tasks;
DROP FUNCTION IF EXISTS check_task_dependencies();

-- ============================================================================
-- 2. Drop the existing triggers from migration 007 before replacing
-- ============================================================================
DROP TRIGGER IF EXISTS task_status_dependency_check ON tasks;
DROP TRIGGER IF EXISTS task_dependency_management ON task_dependencies;

-- ============================================================================
-- 3. Replacement function: manage_task_dependencies()
--    Uses FOR UPDATE row locking and an advisory lock per dependent task
--    to prevent concurrent triggers from racing on the same task.
-- ============================================================================
CREATE OR REPLACE FUNCTION manage_task_dependencies()
RETURNS TRIGGER AS $$
DECLARE
    dep_record RECORD;
    all_blockers_done BOOLEAN;
BEGIN
    -- ----------------------------------------------------------------
    -- CASE 1: A task was just completed → check if dependents can unblock
    -- ----------------------------------------------------------------
    IF TG_TABLE_NAME = 'tasks'
       AND TG_OP = 'UPDATE'
       AND NEW.status = 'completed'
       AND OLD.status != 'completed'
    THEN
        -- Find all tasks that depend on the just-completed task via 'blocks'.
        -- Lock each candidate row (FOR UPDATE) to serialize concurrent triggers.
        FOR dep_record IN
            SELECT DISTINCT t.id, t.status, t.tenant_id, t.title
            FROM task_dependencies td
            JOIN tasks t ON t.id = td.task_id
            WHERE td.depends_on_task_id = NEW.id
              AND td.dependency_type = 'blocks'
              AND t.status = 'blocked'
            FOR UPDATE OF t  -- row-level lock on the dependent task
        LOOP
            -- Take an advisory lock keyed on the dependent task's UUID.
            -- This serializes even across different completing-task triggers
            -- that target the same dependent.
            PERFORM pg_advisory_xact_lock(
                ('x' || left(replace(dep_record.id::text, '-', ''), 16))::bit(64)::bigint
            );

            -- Re-check after acquiring lock: is the task still blocked?
            -- (Another trigger may have already unblocked it.)
            IF (SELECT status FROM tasks WHERE id = dep_record.id) != 'blocked' THEN
                CONTINUE;  -- already unblocked by another trigger, skip
            END IF;

            -- Verify ALL blocking dependencies are now completed
            SELECT NOT EXISTS (
                SELECT 1
                FROM task_dependencies td2
                JOIN tasks t2 ON t2.id = td2.depends_on_task_id
                WHERE td2.task_id = dep_record.id
                  AND td2.dependency_type = 'blocks'
                  AND t2.status != 'completed'
            ) INTO all_blockers_done;

            IF all_blockers_done THEN
                -- Unblock the task
                UPDATE tasks
                SET status = 'queued',
                    updated_at = NOW()
                WHERE id = dep_record.id
                  AND status = 'blocked';  -- final guard

                -- Log the automatic unblock as an activity
                INSERT INTO activities (
                    tenant_id,
                    entity_type,
                    entity_id,
                    action,
                    description,
                    metadata
                ) VALUES (
                    dep_record.tenant_id,
                    'task',
                    dep_record.id,
                    'status_change',
                    format('Task "%s" automatically unblocked (all dependencies completed)', dep_record.title),
                    jsonb_build_object(
                        'old_status', 'blocked',
                        'new_status', 'queued',
                        'unblocked_by_task_id', NEW.id,
                        'automatic', true
                    )
                );
            END IF;
        END LOOP;
    END IF;

    -- ----------------------------------------------------------------
    -- CASE 2: A new blocking dependency was inserted → auto-block task
    -- ----------------------------------------------------------------
    IF TG_TABLE_NAME = 'task_dependencies'
       AND TG_OP = 'INSERT'
       AND NEW.dependency_type = 'blocks'
    THEN
        -- Lock the dependent task row to prevent race with concurrent unblock
        PERFORM pg_advisory_xact_lock(
            ('x' || left(replace(NEW.task_id::text, '-', ''), 16))::bit(64)::bigint
        );

        -- Only block if the dependency is actually incomplete
        UPDATE tasks
        SET status = 'blocked',
            updated_at = NOW()
        WHERE id = NEW.task_id
          AND status = 'queued'
          AND EXISTS (
              SELECT 1 FROM tasks t
              WHERE t.id = NEW.depends_on_task_id
                AND t.status != 'completed'
          );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Re-create triggers with proper naming and conditions
-- ============================================================================

-- Fires when a task completes → unblock dependents
CREATE TRIGGER task_status_dependency_check
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION manage_task_dependencies();

-- Fires when a new dependency is added → auto-block if needed
CREATE TRIGGER task_dependency_management
    AFTER INSERT ON task_dependencies
    FOR EACH ROW
    WHEN (NEW.dependency_type = 'blocks')
    EXECUTE FUNCTION manage_task_dependencies();

-- ============================================================================
-- 5. Add index to speed up the dependency check subqueries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_task_deps_blocks_lookup
    ON task_dependencies (depends_on_task_id, dependency_type)
    WHERE dependency_type = 'blocks';

CREATE INDEX IF NOT EXISTS idx_task_deps_task_blocks
    ON task_dependencies (task_id, dependency_type)
    WHERE dependency_type = 'blocks';
