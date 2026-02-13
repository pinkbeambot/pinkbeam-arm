-- Migration: 005_seed_data
-- Description: Initial seed data for ARM platform

-- ============================================================================
-- DEFAULT TENANT (for development/testing)
-- ============================================================================

INSERT INTO tenants (id, name, slug, plan, config)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'ARM Development',
    'arm-dev',
    'business',
    '{
        "features": {
            "nested_spawning": true,
            "advanced_analytics": true,
            "custom_models": true
        }
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEFAULT USER (to be linked with auth)
-- ============================================================================

INSERT INTO users (id, tenant_id, email, name, role, status)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'founder@arm.local',
    'Founder',
    'owner',
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SYSTEM AGENTS (infrastructure agents)
-- ============================================================================

-- Root orchestrator agent
INSERT INTO agents (
    id, tenant_id, name, slug, role, status, 
    capabilities, config, depth
) VALUES (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'System Orchestrator',
    'system-orchestrator',
    'system',
    'idle',
    ARRAY['spawn', 'delegate', 'decide', 'escalate', 'access_external', 'modify_config'],
    '{
        "system_agent": true,
        "auto_recovery": true
    }'::jsonb,
    0
)
ON CONFLICT (id) DO NOTHING;

-- Task dispatcher agent
INSERT INTO agents (
    id, tenant_id, name, slug, role, status, parent_id, root_id,
    capabilities, config, depth
) VALUES (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Task Dispatcher',
    'task-dispatcher',
    'system',
    'idle',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000010',
    ARRAY['delegate', 'decide', 'access_external'],
    '{
        "system_agent": true,
        "dispatch_rules": []
    }'::jsonb,
    1
)
ON CONFLICT (id) DO NOTHING;

-- Analytics collector agent
INSERT INTO agents (
    id, tenant_id, name, slug, role, status, parent_id, root_id,
    capabilities, config, depth
) VALUES (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'Analytics Collector',
    'analytics-collector',
    'system',
    'idle',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000010',
    ARRAY['access_external', 'decide'],
    '{
        "system_agent": true,
        "collection_interval": 300
    }'::jsonb,
    1
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EXAMPLE WORKER AGENTS (for template/reference)
-- ============================================================================

-- Marketing Manager
INSERT INTO agents (
    id, tenant_id, name, slug, role, status, parent_id, root_id,
    capabilities, config, depth, llm_config
) VALUES (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000001',
    'Marketing Manager',
    'marketing-manager',
    'manager',
    'idle',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000010',
    ARRAY['spawn', 'delegate', 'decide', 'escalate'],
    '{
        "domain": "marketing",
        "specialties": ["strategy", "campaigns", "content"]
    }'::jsonb,
    1,
    '{
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022"
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Content Writer (child of Marketing Manager)
INSERT INTO agents (
    id, tenant_id, name, slug, role, status, parent_id, root_id,
    capabilities, config, depth, llm_config
) VALUES (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'Content Writer',
    'content-writer',
    'specialist',
    'idle',
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000010',
    ARRAY['decide', 'escalate'],
    '{
        "domain": "content",
        "specialties": ["blog", "social", "email"],
        "tone": "professional"
    }'::jsonb,
    2,
    '{
        "provider": "anthropic",
        "model": "claude-3-haiku-20240307"
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Sales Development Rep
INSERT INTO agents (
    id, tenant_id, name, slug, role, status, parent_id, root_id,
    capabilities, config, depth, llm_config
) VALUES (
    '00000000-0000-0000-0000-000000000200',
    '00000000-0000-0000-0000-000000000001',
    'Sales Development Rep',
    'sdr-bot',
    'worker',
    'idle',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000010',
    ARRAY['decide', 'escalate', 'access_external'],
    '{
        "domain": "sales",
        "specialties": ["outreach", "qualification", "scheduling"]
    }'::jsonb,
    1,
    '{
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022"
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EXAMPLE TASKS (for testing)
-- ============================================================================

INSERT INTO tasks (
    id, tenant_id, title, description, type, 
    assignee_id, status, priority,
    inputs, expected_outputs
) VALUES (
    '00000000-0000-0000-0000-000000001000',
    '00000000-0000-0000-0000-000000000001',
    'Launch Q1 Marketing Campaign',
    'Create and execute a comprehensive marketing campaign for Q1 product launch',
    'campaign',
    '00000000-0000-0000-0000-000000000100',
    'queued',
    'high',
    '{
        "product": "ARM Platform",
        "timeline": "Q1 2024",
        "budget": 50000
    }'::jsonb,
    '{
        "deliverables": ["blog posts", "social content", "email sequence", "landing page"]
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (
    id, tenant_id, title, description, type, 
    assignee_id, status, priority, parent_task_id, depth,
    inputs, expected_outputs
) VALUES (
    '00000000-0000-0000-0000-000000001001',
    '00000000-0000-0000-0000-000000000001',
    'Write Product Announcement Blog Post',
    'Create an engaging blog post announcing the ARM platform launch',
    'content',
    '00000000-0000-0000-0000-000000000101',
    'queued',
    'normal',
    '00000000-0000-0000-0000-000000001000',
    1,
    '{
        "topic": "ARM platform launch",
        "tone": "exciting but professional",
        "target_audience": "AI-native solopreneurs"
    }'::jsonb,
    '{
        "word_count": 800,
        "format": "markdown",
        "seo_keywords": ["AI agents", "agent management", "ARM"]
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EXAMPLE ESCALATION (for testing)
-- ============================================================================

INSERT INTO escalations (
    id, tenant_id, agent_id, task_id, type, urgency, status,
    title, description, question, agent_analysis, sla_deadline_at
) VALUES (
    '00000000-0000-0000-0000-000000002000',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000001001',
    'clarification',
    'normal',
    'open',
    'Blog post tone clarification needed',
    'Need to confirm the appropriate tone for the product announcement',
    '{
        "title": "What tone should we use?",
        "details": "Should the blog post be more technical/detailed or high-level/visionary?",
        "options": ["Technical deep-dive", "Visionary announcement", "Balanced approach"]
    }'::jsonb,
    '{
        "what_i_know": "The product targets AI-native solopreneurs who are technical but business-focused",
        "what_i_dont_know": "Whether they prefer technical details or business benefits emphasis",
        "what_i_tried": ["Reviewed competitor blogs", "Analyzed target audience profiles"],
        "suggested_resolution": "Visionary announcement with technical appendix"
    }'::jsonb,
    NOW() + INTERVAL '24 hours'
)
ON CONFLICT (id) DO NOTHING;
