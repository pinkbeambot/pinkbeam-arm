-- Migration: 038_decisions_soft_delete
-- Description: Add deleted_at column to decisions table for soft delete support

-- Add deleted_at column for soft delete
ALTER TABLE decisions ADD COLUMN deleted_at TIMESTAMPTZ;

-- Add index for filtering non-deleted decisions
CREATE INDEX idx_decisions_deleted_at ON decisions(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- Update existing queries to filter out soft-deleted records
-- Note: Application queries should add: .is('deleted_at', null)

COMMENT ON COLUMN decisions.deleted_at IS 'Soft delete timestamp - null if not deleted';
