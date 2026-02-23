-- Migration: 029_onboarding_step_tracking
-- Description: Add granular onboarding step tracking to tenants table

-- Add onboarding_steps JSONB column for tracking individual step completion
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS onboarding_steps JSONB NOT NULL DEFAULT '{
  "created_agent": false,
  "assigned_task": false,
  "viewed_activity": false
}'::jsonb;

COMMENT ON COLUMN tenants.onboarding_steps IS 'Tracks individual onboarding step completion: created_agent, assigned_task, viewed_activity';

-- Create index for querying tenants with incomplete onboarding steps
CREATE INDEX IF NOT EXISTS idx_tenants_onboarding_steps
ON tenants USING gin(onboarding_steps);
