-- Migration 023: Prevent circular agent hierarchy
-- Fixes GitHub Issue #80
--
-- Adds:
-- 1. CHECK constraint preventing self-referencing (id != parent_id)
-- 2. CHECK constraint enforcing max depth of 10 levels
-- 3. Trigger function validating no circular parent chains on INSERT/UPDATE
-- 4. Trigger function enforcing root_id consistency

-- ============================================================================
-- 1. Self-reference constraint: agent cannot be its own parent
-- ============================================================================
ALTER TABLE agents
  ADD CONSTRAINT agents_no_self_parent CHECK (id != parent_id);

-- ============================================================================
-- 2. Max depth constraint: prevent excessively deep hierarchies
-- ============================================================================
ALTER TABLE agents
  ADD CONSTRAINT agents_max_depth CHECK (depth <= 10);

-- ============================================================================
-- 3. Circular hierarchy prevention trigger
--    Walks up the parent chain from the proposed parent to ensure the new
--    agent's id doesn't appear as an ancestor (which would create a cycle).
--    Also validates that the parent exists within the same tenant.
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_agent_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID;
  visited_count INTEGER := 0;
  max_traversal INTEGER := 15; -- safety limit to prevent runaway traversal
BEGIN
  -- Skip validation if no parent is set
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent self-referencing
  IF NEW.id IS NOT NULL AND NEW.id = NEW.parent_id THEN
    RAISE EXCEPTION 'Agent cannot be its own parent (id: %)', NEW.id;
  END IF;

  -- Verify parent exists and belongs to the same tenant
  IF NOT EXISTS (
    SELECT 1 FROM agents WHERE id = NEW.parent_id AND tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Parent agent % does not exist or belongs to a different tenant', NEW.parent_id;
  END IF;

  -- Walk up the parent chain from proposed parent to detect cycles
  current_id := NEW.parent_id;
  WHILE current_id IS NOT NULL AND visited_count < max_traversal LOOP
    -- If we find the agent's own id in the ancestor chain, it's a cycle
    IF NEW.id IS NOT NULL AND current_id = NEW.id THEN
      RAISE EXCEPTION 'Circular hierarchy detected: agent % would create a cycle through ancestor %',
        NEW.id, current_id;
    END IF;

    SELECT parent_id INTO current_id
    FROM agents
    WHERE id = current_id;

    visited_count := visited_count + 1;
  END LOOP;

  -- If we exceeded the traversal limit, the chain is too deep or already broken
  IF visited_count >= max_traversal THEN
    RAISE EXCEPTION 'Agent hierarchy chain exceeds maximum traversal depth of %. Possible existing cycle or excessively deep hierarchy.',
      max_traversal;
  END IF;

  -- Validate depth matches actual position in hierarchy
  DECLARE
    expected_depth INTEGER;
  BEGIN
    SELECT depth + 1 INTO expected_depth
    FROM agents
    WHERE id = NEW.parent_id;

    IF expected_depth IS NOT NULL AND NEW.depth != expected_depth THEN
      -- Auto-correct depth instead of failing, to be resilient
      NEW.depth := expected_depth;
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fire BEFORE INSERT or UPDATE of parent_id to block invalid hierarchies
CREATE TRIGGER validate_agent_hierarchy_trigger
  BEFORE INSERT OR UPDATE OF parent_id ON agents
  FOR EACH ROW
  EXECUTE FUNCTION validate_agent_hierarchy();

-- ============================================================================
-- 4. Root ID consistency trigger
--    Ensures root_id always reflects the actual root of the parent chain.
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_agent_root_consistency()
RETURNS TRIGGER AS $$
DECLARE
  computed_root_id UUID;
  current_id UUID;
  visited_count INTEGER := 0;
  max_traversal INTEGER := 15;
BEGIN
  -- If no parent, this agent IS the root
  IF NEW.parent_id IS NULL THEN
    NEW.root_id := NULL; -- Root agents have NULL root_id (they are the root)
    NEW.depth := 0;
    RETURN NEW;
  END IF;

  -- Walk up the parent chain to find the true root
  current_id := NEW.parent_id;
  computed_root_id := NEW.parent_id;

  WHILE current_id IS NOT NULL AND visited_count < max_traversal LOOP
    computed_root_id := current_id;

    SELECT parent_id INTO current_id
    FROM agents
    WHERE id = current_id;

    visited_count := visited_count + 1;
  END LOOP;

  -- Set the correct root_id
  NEW.root_id := computed_root_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_agent_root_consistency_trigger
  BEFORE INSERT OR UPDATE OF parent_id ON agents
  FOR EACH ROW
  EXECUTE FUNCTION enforce_agent_root_consistency();

-- ============================================================================
-- 5. Add cycle detection safety to get_agent_descendants()
--    Replace the existing function with a version that has a depth limit
--    to prevent runaway recursion even if data somehow becomes corrupted.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_agent_descendants(p_agent_id UUID)
RETURNS TABLE(id UUID, name VARCHAR, depth INTEGER, path UUID[]) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE descendants AS (
        SELECT a.id, a.name, 0 as depth, ARRAY[a.id] as path
        FROM agents a
        WHERE a.id = p_agent_id

        UNION ALL

        SELECT a.id, a.name, d.depth + 1, d.path || a.id
        FROM agents a
        JOIN descendants d ON a.parent_id = d.id
        WHERE d.depth < 15                    -- hard limit on recursion depth
          AND NOT (a.id = ANY(d.path))        -- cycle detection via path tracking
    )
    SELECT * FROM descendants;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Verify no existing circular hierarchies in the data
--    This query will raise a notice if any issues are found.
-- ============================================================================
DO $$
DECLARE
  bad_self_ref INTEGER;
  bad_depth INTEGER;
BEGIN
  -- Check for self-referencing agents
  SELECT COUNT(*) INTO bad_self_ref
  FROM agents WHERE id = parent_id;

  IF bad_self_ref > 0 THEN
    RAISE WARNING 'Found % agents with self-referencing parent_id. Fixing...', bad_self_ref;
    UPDATE agents SET parent_id = NULL, depth = 0 WHERE id = parent_id;
  END IF;

  -- Check for agents exceeding max depth
  SELECT COUNT(*) INTO bad_depth
  FROM agents WHERE depth > 10;

  IF bad_depth > 0 THEN
    RAISE WARNING 'Found % agents exceeding max depth of 10. Manual review recommended.', bad_depth;
  END IF;
END $$;
