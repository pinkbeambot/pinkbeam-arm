-- Migration: Add performance indexes for common query patterns
-- Issue: #79
-- Created: 2026-02-14

-- Index for tasks assigned to specific users/agents
CREATE INDEX IF NOT EXISTS idx_tasks_assigner ON tasks(assigner_id);

-- Index for activities by agent with time-based sorting (activity feed queries)
CREATE INDEX IF NOT EXISTS idx_activities_agent_time ON activities(agent_id, created_at DESC);

-- Index for decisions filtered by agent and status (decision queue queries)
CREATE INDEX IF NOT EXISTS idx_decisions_agent_status ON decisions(agent_id, status);

-- Partial index for unresolved escalations (active escalations dashboard)
CREATE INDEX IF NOT EXISTS idx_escalations_unresolved ON escalations(resolved_at) WHERE resolved_at IS NULL;

-- Index for messages by thread with time-based sorting (chat/conversation queries)
CREATE INDEX IF NOT EXISTS idx_messages_thread_time ON messages(thread_id, created_at DESC);
