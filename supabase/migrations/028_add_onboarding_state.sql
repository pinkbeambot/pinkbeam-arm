-- Migration: 028_add_onboarding_state
-- Description: Add onboarding_completed flag to tenants table

-- Add onboarding_completed column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Add onboarding_completed_at timestamp for analytics
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_tenants_onboarding_completed 
ON tenants(onboarding_completed) 
WHERE onboarding_completed = FALSE;

COMMENT ON COLUMN tenants.onboarding_completed IS 'Whether the tenant has completed the onboarding flow';
COMMENT ON COLUMN tenants.onboarding_completed_at IS 'Timestamp when onboarding was completed';

-- Update trigger to set completed_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.onboarding_completed = TRUE AND OLD.onboarding_completed = FALSE THEN
        NEW.onboarding_completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_onboarding_completed_at ON tenants;
CREATE TRIGGER set_onboarding_completed_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    WHEN (NEW.onboarding_completed IS DISTINCT FROM OLD.onboarding_completed)
    EXECUTE FUNCTION update_onboarding_completed_at();
