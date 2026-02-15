-- Migration 024: JSONB column schema validation
-- Fixes GitHub Issue #81
--
-- Adds CHECK constraints to ensure JSONB columns on the agents table
-- have the expected structure and value types. This prevents bad data
-- from being inserted via direct SQL, Edge Functions, or application bugs.

-- ============================================================================
-- 1. Validation helper: check that a JSONB value at a key is a number
-- ============================================================================
CREATE OR REPLACE FUNCTION is_jsonb_numeric(val JSONB, key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN val ? key AND jsonb_typeof(val -> key) = 'number';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 2. Validation helper: check that a JSONB value at a key is a string
-- ============================================================================
CREATE OR REPLACE FUNCTION is_jsonb_string(val JSONB, key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN val ? key AND jsonb_typeof(val -> key) = 'string';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. agents.llm_config validation
--    Must be an object. When non-empty, requires 'provider' (string) and
--    'model' (string). Optional numeric fields: temperature, max_tokens.
-- ============================================================================
ALTER TABLE agents ADD CONSTRAINT chk_agents_llm_config CHECK (
  jsonb_typeof(llm_config) = 'object'
  AND (
    -- Allow empty object (default will fill in)
    llm_config = '{}'::jsonb
    OR (
      -- When populated, require provider and model as strings
      is_jsonb_string(llm_config, 'provider')
      AND is_jsonb_string(llm_config, 'model')
      -- If temperature is present, must be a number
      AND (NOT llm_config ? 'temperature' OR is_jsonb_numeric(llm_config, 'temperature'))
      -- If max_tokens is present, must be a number
      AND (NOT llm_config ? 'max_tokens' OR is_jsonb_numeric(llm_config, 'max_tokens'))
    )
  )
);

-- ============================================================================
-- 4. agents.limits validation
--    Must be an object. All known fields must be numeric when present.
-- ============================================================================
ALTER TABLE agents ADD CONSTRAINT chk_agents_limits CHECK (
  jsonb_typeof(limits) = 'object'
  AND (NOT limits ? 'max_sub_agents' OR is_jsonb_numeric(limits, 'max_sub_agents'))
  AND (NOT limits ? 'escalation_threshold' OR is_jsonb_numeric(limits, 'escalation_threshold'))
  AND (NOT limits ? 'timeout_seconds' OR is_jsonb_numeric(limits, 'timeout_seconds'))
  AND (NOT limits ? 'max_tokens_per_task' OR is_jsonb_numeric(limits, 'max_tokens_per_task'))
  AND (NOT limits ? 'max_cost_per_task_usd' OR is_jsonb_numeric(limits, 'max_cost_per_task_usd'))
  AND (NOT limits ? 'max_concurrent_tasks' OR is_jsonb_numeric(limits, 'max_concurrent_tasks'))
);

-- ============================================================================
-- 5. agents.stats validation
--    Must be an object. All known metric fields must be numeric when present.
-- ============================================================================
ALTER TABLE agents ADD CONSTRAINT chk_agents_stats CHECK (
  jsonb_typeof(stats) = 'object'
  AND (NOT stats ? 'tasks_completed' OR is_jsonb_numeric(stats, 'tasks_completed'))
  AND (NOT stats ? 'tasks_failed' OR is_jsonb_numeric(stats, 'tasks_failed'))
  AND (NOT stats ? 'escalations_raised' OR is_jsonb_numeric(stats, 'escalations_raised'))
  AND (NOT stats ? 'avg_task_duration_seconds' OR is_jsonb_numeric(stats, 'avg_task_duration_seconds'))
  AND (NOT stats ? 'total_cost_usd' OR is_jsonb_numeric(stats, 'total_cost_usd'))
);

-- ============================================================================
-- 6. agents.config validation
--    Must be a valid JSON object (no arrays, strings, etc. at top level).
-- ============================================================================
ALTER TABLE agents ADD CONSTRAINT chk_agents_config CHECK (
  jsonb_typeof(config) = 'object'
);

-- ============================================================================
-- 7. Validation trigger for value ranges on JSONB numeric fields
--    CHECK constraints handle structure; this trigger validates business rules.
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_agent_jsonb_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate llm_config ranges
  IF NEW.llm_config IS NOT NULL AND NEW.llm_config != '{}'::jsonb THEN
    IF NEW.llm_config ? 'temperature' THEN
      IF (NEW.llm_config ->> 'temperature')::numeric < 0
         OR (NEW.llm_config ->> 'temperature')::numeric > 2 THEN
        RAISE EXCEPTION 'llm_config.temperature must be between 0 and 2, got %',
          NEW.llm_config ->> 'temperature';
      END IF;
    END IF;

    IF NEW.llm_config ? 'max_tokens' THEN
      IF (NEW.llm_config ->> 'max_tokens')::integer < 1 THEN
        RAISE EXCEPTION 'llm_config.max_tokens must be a positive integer, got %',
          NEW.llm_config ->> 'max_tokens';
      END IF;
    END IF;
  END IF;

  -- Validate limits ranges
  IF NEW.limits IS NOT NULL THEN
    IF NEW.limits ? 'max_sub_agents' THEN
      IF (NEW.limits ->> 'max_sub_agents')::integer < 0 THEN
        RAISE EXCEPTION 'limits.max_sub_agents must be non-negative, got %',
          NEW.limits ->> 'max_sub_agents';
      END IF;
    END IF;

    IF NEW.limits ? 'escalation_threshold' THEN
      IF (NEW.limits ->> 'escalation_threshold')::numeric < 0
         OR (NEW.limits ->> 'escalation_threshold')::numeric > 1 THEN
        RAISE EXCEPTION 'limits.escalation_threshold must be between 0 and 1, got %',
          NEW.limits ->> 'escalation_threshold';
      END IF;
    END IF;

    IF NEW.limits ? 'timeout_seconds' THEN
      IF (NEW.limits ->> 'timeout_seconds')::integer < 1 THEN
        RAISE EXCEPTION 'limits.timeout_seconds must be a positive integer, got %',
          NEW.limits ->> 'timeout_seconds';
      END IF;
    END IF;

    IF NEW.limits ? 'max_cost_per_task_usd' THEN
      IF (NEW.limits ->> 'max_cost_per_task_usd')::numeric < 0 THEN
        RAISE EXCEPTION 'limits.max_cost_per_task_usd must be non-negative, got %',
          NEW.limits ->> 'max_cost_per_task_usd';
      END IF;
    END IF;
  END IF;

  -- Validate stats ranges (all metrics should be non-negative)
  IF NEW.stats IS NOT NULL THEN
    IF NEW.stats ? 'tasks_completed' AND (NEW.stats ->> 'tasks_completed')::integer < 0 THEN
      RAISE EXCEPTION 'stats.tasks_completed must be non-negative';
    END IF;
    IF NEW.stats ? 'tasks_failed' AND (NEW.stats ->> 'tasks_failed')::integer < 0 THEN
      RAISE EXCEPTION 'stats.tasks_failed must be non-negative';
    END IF;
    IF NEW.stats ? 'total_cost_usd' AND (NEW.stats ->> 'total_cost_usd')::numeric < 0 THEN
      RAISE EXCEPTION 'stats.total_cost_usd must be non-negative';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_agent_jsonb_values_trigger
  BEFORE INSERT OR UPDATE OF llm_config, limits, stats ON agents
  FOR EACH ROW
  EXECUTE FUNCTION validate_agent_jsonb_values();
