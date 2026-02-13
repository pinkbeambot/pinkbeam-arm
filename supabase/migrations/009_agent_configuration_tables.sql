-- Migration: 009_agent_configuration_tables
-- Description: Agent configuration versioning, templates, and config management

-- ============================================================================
-- AGENT CONFIGS (Current configuration for each agent)
-- ============================================================================

CREATE TABLE agent_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Configuration (stored as JSONB for flexibility)
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Structure:
    -- {
    --   "basic_info": { "name", "role", "avatar_url", "description" },
    --   "instructions": { "system_prompt", "success_criteria", "examples": [] },
    --   "tools": { "enabled": [], "config": {} },
    --   "permissions": { "data_access": {}, "external_apis": [] },
    --   "escalation": { "triggers": {}, "thresholds": {} },
    --   "advanced": { "model", "temperature", "max_tokens", "timeout_seconds" }
    -- }
    
    -- Version tracking
    version_id UUID, -- References agent_config_versions
    version_number INTEGER NOT NULL DEFAULT 1,
    
    -- Validation state
    is_valid BOOLEAN DEFAULT true,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    
    -- Testing
    last_tested_at TIMESTAMPTZ,
    last_test_result JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, agent_id)
);

CREATE INDEX idx_agent_configs_tenant ON agent_configs(tenant_id);
CREATE INDEX idx_agent_configs_agent ON agent_configs(agent_id);
CREATE INDEX idx_agent_configs_version ON agent_configs(version_id);

COMMENT ON TABLE agent_configs IS 'Current configuration for each agent';

-- ============================================================================
-- AGENT CONFIG VERSIONS (Version history)
-- ============================================================================

CREATE TABLE agent_config_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Version info
    version_number INTEGER NOT NULL,
    name VARCHAR(255), -- e.g., "Initial setup", "Added email tool"
    description TEXT,
    
    -- The configuration snapshot
    config JSONB NOT NULL,
    
    -- Change metadata
    change_type VARCHAR(50) NOT NULL DEFAULT 'manual' 
        CHECK (change_type IN ('manual', 'auto_save', 'restore', 'template_import', 'clone')),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_summary JSONB DEFAULT '{}'::jsonb, -- structured diff
    
    -- Validation state at time of save
    is_valid BOOLEAN DEFAULT true,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, agent_id, version_number)
);

CREATE INDEX idx_agent_config_versions_tenant ON agent_config_versions(tenant_id);
CREATE INDEX idx_agent_config_versions_agent ON agent_config_versions(agent_id);
CREATE INDEX idx_agent_config_versions_created ON agent_config_versions(tenant_id, created_at DESC);

COMMENT ON TABLE agent_config_versions IS 'Version history for agent configurations';

-- ============================================================================
-- AGENT TEMPLATES (Reusable configuration templates)
-- ============================================================================

CREATE TABLE agent_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID, -- NULL for system-wide templates
    
    -- Template info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    
    -- Visual
    icon VARCHAR(100),
    color VARCHAR(50) DEFAULT '#6366F1',
    
    -- The template configuration
    config JSONB NOT NULL,
    -- Same structure as agent_configs.config
    
    -- Capabilities this template provides
    capabilities TEXT[] DEFAULT '{}',
    
    -- Recommended settings
    recommended_model VARCHAR(100),
    recommended_tools TEXT[] DEFAULT '{}',
    
    -- Metadata
    is_system BOOLEAN DEFAULT false, -- Built-in template
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_agent_templates_tenant ON agent_templates(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_agent_templates_category ON agent_templates(category);
CREATE INDEX idx_agent_templates_system ON agent_templates(is_system) WHERE is_system = true;

COMMENT ON TABLE agent_templates IS 'Reusable agent configuration templates';

-- ============================================================================
-- CONFIG TEST RESULTS (Track config test runs)
-- ============================================================================

CREATE TABLE config_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    config_version_id UUID REFERENCES agent_config_versions(id) ON DELETE SET NULL,
    
    -- Test input/output
    test_input TEXT NOT NULL,
    test_output TEXT,
    
    -- Result
    success BOOLEAN NOT NULL DEFAULT false,
    response_time_ms INTEGER,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,4),
    
    -- Error info (if failed)
    error_message TEXT,
    error_details JSONB,
    
    -- LLM response metadata
    model_used VARCHAR(100),
    raw_response JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_config_test_results_tenant ON config_test_results(tenant_id);
CREATE INDEX idx_config_test_results_agent ON config_test_results(agent_id);
CREATE INDEX idx_config_test_results_created ON config_test_results(created_at DESC);

COMMENT ON TABLE config_test_results IS 'History of configuration test runs';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_test_results ENABLE ROW LEVEL SECURITY;

-- agent_configs policies
CREATE POLICY agent_configs_tenant_isolation ON agent_configs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- agent_config_versions policies
CREATE POLICY agent_config_versions_tenant_isolation ON agent_config_versions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- agent_templates policies (system templates visible to all, tenant templates isolated)
CREATE POLICY agent_templates_tenant_isolation ON agent_templates
    FOR ALL
    USING (
        is_system = true 
        OR tenant_id = current_setting('app.current_tenant')::UUID
    );

-- config_test_results policies
CREATE POLICY config_test_results_tenant_isolation ON config_test_results
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Auto-increment version number function
CREATE OR REPLACE FUNCTION get_next_config_version(p_agent_id UUID, p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM agent_config_versions
    WHERE agent_id = p_agent_id AND tenant_id = p_tenant_id;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Function to create a version when config is updated
CREATE OR REPLACE FUNCTION create_config_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
    change_summary JSONB;
BEGIN
    -- Calculate next version number
    next_version := get_next_config_version(NEW.agent_id, NEW.tenant_id);
    
    -- Generate change summary (simple diff)
    IF OLD.config IS NOT NULL THEN
        change_summary := jsonb_build_object(
            'previous_version', OLD.version_number,
            'changed_fields', (
                SELECT jsonb_agg(key)
                FROM jsonb_each(NEW.config)
                WHERE OLD.config->key IS DISTINCT FROM NEW.config->key
            )
        );
    ELSE
        change_summary := jsonb_build_object('is_initial', true);
    END IF;
    
    -- Insert version record
    INSERT INTO agent_config_versions (
        tenant_id,
        agent_id,
        version_number,
        config,
        change_type,
        change_summary,
        is_valid,
        validation_errors
    ) VALUES (
        NEW.tenant_id,
        NEW.agent_id,
        next_version,
        NEW.config,
        COALESCE(NEW.config->>'_change_type', 'manual'),
        change_summary,
        NEW.is_valid,
        NEW.validation_errors
    )
    RETURNING id INTO NEW.version_id;
    
    -- Update version number on config
    NEW.version_number := next_version;
    
    -- Clear temporary change type
    NEW.config := NEW.config - '_change_type';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for config versioning (only on INSERT or when config changes)
CREATE TRIGGER agent_config_version_trigger
    BEFORE INSERT OR UPDATE OF config ON agent_configs
    FOR EACH ROW
    EXECUTE FUNCTION create_config_version();

-- Updated at trigger
CREATE TRIGGER update_agent_configs_updated_at BEFORE UPDATE ON agent_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_templates_updated_at BEFORE UPDATE ON agent_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE agent_templates
    SET usage_count = usage_count + 1
    WHERE id = NEW.config->>'template_id';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA (System Templates)
-- ============================================================================

INSERT INTO agent_templates (
    name,
    slug,
    description,
    category,
    icon,
    color,
    config,
    capabilities,
    recommended_model,
    recommended_tools,
    is_system,
    is_active
) VALUES 
-- SDR Agent Template
(
    'Sales Development Rep',
    'sdr-agent',
    'Qualifies leads, handles outbound outreach, and schedules meetings',
    'sales',
    'Users',
    '#10B981',
    '{
        "basic_info": {
            "role": "Sales Development Representative",
            "description": "Qualifies inbound leads and handles outbound prospecting"
        },
        "instructions": {
            "system_prompt": "You are a Sales Development Representative. Your job is to qualify leads, research prospects, and book meetings. Be professional, concise, and persistent but respectful. Always personalize your outreach based on prospect research.",
            "success_criteria": "Lead qualified, meeting booked, or clear disqualification reason documented"
        },
        "tools": {
            "enabled": ["email", "calendar", "crm", "linkedin"],
            "config": {
                "email": { "can_send": true, "templates_allowed": true },
                "calendar": { "can_view": true, "can_schedule": true }
            }
        },
        "escalation": {
            "triggers": {
                "high_value_deal": { "deal_size_usd": 10000 },
                "competitive_situation": true,
                "technical_questions": true
            },
            "thresholds": { "confidence": 0.7 }
        },
        "advanced": {
            "temperature": 0.7,
            "max_tokens": 2000
        }
    }'::jsonb,
    ARRAY['access_external', 'escalate', 'decide'],
    'claude-3-5-sonnet-20241022',
    ARRAY['email', 'calendar', 'crm', 'linkedin'],
    true,
    true
),
-- Content Writer Agent Template
(
    'Content Writer',
    'content-writer',
    'Creates blog posts, social media content, and marketing copy',
    'marketing',
    'FileText',
    '#6366F1',
    '{
        "basic_info": {
            "role": "Content Writer",
            "description": "Creates engaging content for blogs, social media, and marketing materials"
        },
        "instructions": {
            "system_prompt": "You are a skilled Content Writer. Create engaging, SEO-optimized content that resonates with the target audience. Follow brand voice guidelines and always proofread your work. Research topics thoroughly before writing.",
            "success_criteria": "Content is engaging, on-brand, SEO-optimized, and error-free"
        },
        "tools": {
            "enabled": ["web_search", "grammar_check", "seo_analyzer"],
            "config": {
                "web_search": { "max_results": 10 },
                "seo_analyzer": { "target_score": 80 }
            }
        },
        "escalation": {
            "triggers": {
                                "sensitive_topic": true,
                                "legal_review_needed": true
            },
            "thresholds": { "confidence": 0.75 }
        },
        "advanced": {
            "temperature": 0.8,
            "max_tokens": 4000
        }
    }'::jsonb,
    ARRAY['access_external', 'decide'],
    'claude-3-5-sonnet-20241022',
    ARRAY['web_search', 'grammar_check', 'seo_analyzer'],
    true,
    true
),
-- Customer Support Agent Template
(
    'Customer Support Agent',
    'support-agent',
    'Handles customer inquiries, troubleshooting, and ticket resolution',
    'support',
    'HeadphonesIcon',
    '#F59E0B',
    '{
        "basic_info": {
            "role": "Customer Support Specialist",
            "description": "Provides helpful, empathetic support to customers"
        },
        "instructions": {
            "system_prompt": "You are a Customer Support Specialist. Be empathetic, clear, and solution-oriented. Always acknowledge the customer''s frustration, explain steps clearly, and follow up to ensure resolution. Escalate complex technical issues or angry customers to a human.",
            "success_criteria": "Customer issue resolved, satisfaction confirmed, ticket closed"
        },
        "tools": {
            "enabled": ["kb_search", "ticket_system", "email", "refund_processor"],
            "config": {
                "kb_search": { "max_results": 5 },
                "refund_processor": { "max_amount_usd": 100, "requires_approval_above": 100 }
            }
        },
        "escalation": {
            "triggers": {
                                "refund_above_threshold": { "amount_usd": 100 },
                                "angry_customer": true,
                                "technical_escalation": true,
                                "legal_compliance": true
            },
            "thresholds": { "confidence": 0.8 }
        },
        "advanced": {
            "temperature": 0.6,
            "max_tokens": 2000
        }
    }'::jsonb,
    ARRAY['access_external', 'escalate', 'decide'],
    'claude-3-5-sonnet-20241022',
    ARRAY['kb_search', 'ticket_system', 'email'],
    true,
    true
),
-- Research Analyst Agent Template
(
    'Research Analyst',
    'research-analyst',
    'Conducts market research, competitive analysis, and data gathering',
    'research',
    'Search',
    '#8B5CF6',
    '{
        "basic_info": {
            "role": "Research Analyst",
            "description": "Gathers and synthesizes information from multiple sources"
        },
        "instructions": {
            "system_prompt": "You are a Research Analyst. Be thorough, objective, and cite your sources. Synthesize complex information into clear insights. Always verify facts from multiple sources and note confidence levels.",
            "success_criteria": "Comprehensive research delivered with sources, clear insights, and confidence ratings"
        },
        "tools": {
            "enabled": ["web_search", "news_api", "financial_data", "document_parser"],
            "config": {
                "web_search": { "max_results": 20 },
                "news_api": { "days_back": 30 }
            }
        },
        "escalation": {
            "triggers": {
                                "conflicting_sources": true,
                                "paywall_access_needed": true
            },
            "thresholds": { "confidence": 0.7 }
        },
        "advanced": {
            "temperature": 0.3,
            "max_tokens": 4000
        }
    }'::jsonb,
    ARRAY['access_external', 'decide'],
    'claude-3-5-sonnet-20241022',
    ARRAY['web_search', 'news_api', 'document_parser'],
    true,
    true
),
-- Social Media Manager Agent Template
(
    'Social Media Manager',
    'social-media-manager',
    'Manages social accounts, schedules posts, and engages with audience',
    'marketing',
    'Share2',
    '#EC4899',
    '{
        "basic_info": {
            "role": "Social Media Manager",
            "description": "Creates and schedules social content, engages with community"
        },
        "instructions": {
            "system_prompt": "You are a Social Media Manager. Create engaging, on-brand content tailored to each platform. Monitor trends and engage authentically with the community. Always check scheduled posts for timing and relevance before publishing.",
            "success_criteria": "Content posted on schedule, engagement rates maintained, community responded to promptly"
        },
        "tools": {
            "enabled": ["social_api", "image_generator", "scheduler", "analytics"],
            "config": {
                "social_api": { "platforms": ["twitter", "linkedin", "instagram"] },
                                "scheduler": { "requires_approval": false }
            }
        },
        "escalation": {
            "triggers": {
                                "negative_sentiment_spike": true,
                                "pr_crisis": true,
                                "controversial_content": true
            },
            "thresholds": { "confidence": 0.75 }
        },
        "advanced": {
            "temperature": 0.8,
            "max_tokens": 1500
        }
    }'::jsonb,
    ARRAY['access_external', 'escalate', 'decide'],
    'claude-3-5-sonnet-20241022',
    ARRAY['social_api', 'scheduler', 'analytics'],
    true,
    true
),
-- General Worker Agent Template
(
    'General Worker',
    'general-worker',
    'Versatile agent for general tasks and operations',
    'general',
    'Bot',
    '#6B7280',
    '{
        "basic_info": {
            "role": "General Worker",
            "description": "Handles a variety of general tasks and operations"
        },
        "instructions": {
            "system_prompt": "You are a versatile general worker agent. Approach each task methodically, ask clarifying questions when needed, and deliver quality work. Escalate when tasks are outside your capabilities or require human judgment.",
            "success_criteria": "Task completed as specified, quality verified, ready for next assignment"
        },
        "tools": {
            "enabled": ["web_search", "calculator", "document_editor"],
            "config": {}
        },
        "escalation": {
            "triggers": {
                                "ambiguous_requirements": true,
                                "high_stakes": true
            },
            "thresholds": { "confidence": 0.7 }
        },
        "advanced": {
            "temperature": 0.7,
            "max_tokens": 2000
        }
    }'::jsonb,
    ARRAY['decide', 'escalate'],
    'claude-3-5-sonnet-20241022',
    ARRAY['web_search', 'calculator'],
    true,
    true
);

-- Grant access to authenticated users
GRANT SELECT ON agent_templates TO authenticated;
GRANT ALL ON agent_configs TO authenticated;
GRANT ALL ON agent_config_versions TO authenticated;
GRANT ALL ON config_test_results TO authenticated;
