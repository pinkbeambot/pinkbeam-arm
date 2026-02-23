---
title: "Database Setup Guide"
type: guide
status: active
created: 2026-02-21
updated: 2026-02-21
owner: ENG-UX
tags: [database, setup, supabase, postgresql]
---

# Database Setup Guide

Complete guide for setting up and managing the Pink Beam ARM database.

---

## Table of Contents

1. [Overview](#overview)
2. [Supabase Setup](#supabase-setup)
3. [Running Migrations](#running-migrations)
4. [Database Schema](#database-schema)
5. [Row Level Security](#row-level-security)
6. [Realtime Setup](#realtime-setup)
7. [Backup & Restore](#backup--restore)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Pink Beam ARM uses **PostgreSQL 15** via **Supabase** as its primary database. Key features:

- **Multi-tenancy**: Every table has `tenant_id` for workspace isolation
- **Row Level Security (RLS)**: Enforces tenant boundaries at the database level
- **Realtime**: WebSocket-powered live updates
- **Edge Functions**: Serverless compute for agent runtime
- **Automated backups**: Point-in-time recovery

### Database Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Project                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │              PostgreSQL 15                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │    │
│  │  │  Core    │ │  Agent   │ │  Task    │        │    │
│  │  │  Tables  │ │  Runtime │ │ Pipeline │        │    │
│  │  └──────────┘ └──────────┘ └──────────┘        │    │
│  │                                               │    │
│  │  - RLS Policies    - Triggers                 │    │
│  │  - Functions       - Indexes                  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Supabase Services                   │    │
│  │  - Auth    - Realtime    - Storage              │    │
│  │  - Edge Functions    - pg_cron                  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Supabase Setup

### Option 1: Cloud Supabase (Recommended)

**Step 1: Create Project**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose organization and project name
4. Set database password (save this!)
5. Select region (closest to your users)
6. Click **Create New Project**

**Step 2: Get Connection Details**

1. Wait for project to initialize (2-3 minutes)
2. Go to **Project Settings** → **API**
3. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

**Step 3: Configure Environment**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Option 2: Local Supabase

**Prerequisites:**
- Docker Desktop installed and running
- Supabase CLI: `brew install supabase/tap/supabase`

**Setup:**

```bash
# Navigate to project
cd ~/code/arm

# Initialize Supabase (if not already done)
supabase init

# Start local Supabase
supabase start

# Get local credentials
supabase status
```

**Local Credentials:**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

**Stop Local Supabase:**

```bash
supabase stop
```

---

## Running Migrations

### Migration Files

Migrations are stored in `supabase/migrations/`:

```
supabase/migrations/
├── 001_initial_schema.sql
├── 002_rls_policies.sql
├── 003_triggers_and_functions.sql
├── 004_realtime_setup.sql
├── 005_seed_data.sql
├── 006_agent_runtime_extensions.sql
├── 007_task_pipeline_enhancements.sql
├── 008_performance_analytics_views.sql
├── 009_agent_configuration_tables.sql
└── 010_activity_feed_enhancements.sql
```

### Apply Migrations

**Option 1: Supabase CLI (Local)**

```bash
# Apply all pending migrations
supabase migration up

# Apply specific migration
supabase migration up 001

# Check status
supabase migration list
```

**Option 2: SQL Editor (Cloud)**

1. Go to Supabase Dashboard → SQL Editor
2. Click **New Query**
3. Paste contents of migration file
4. Click **Run**

**Option 3: Automated (CI/CD)**

Migrations run automatically on deploy via GitHub Actions.

### Create New Migration

```bash
# Create new migration file
supabase migration new add_user_preferences

# Edit the generated file
# supabase/migrations/011_add_user_preferences.sql
```

**Migration Template:**

```sql
-- Migration: add_user_preferences
-- Created: 2026-02-21

-- Add new table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  theme VARCHAR(20) DEFAULT 'system',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Add policy
CREATE POLICY tenant_isolation ON user_preferences
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Add index
CREATE INDEX idx_user_preferences_tenant ON user_preferences(tenant_id);
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Database Schema

### Core Tables

#### Tenants (Workspaces)

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(20) DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);
```

#### Agents

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'worker',
  status VARCHAR(20) DEFAULT 'initializing',
  status_reason TEXT,
  description TEXT,
  capabilities TEXT[] DEFAULT '{}',
  parent_id UUID REFERENCES agents(id),
  root_id UUID REFERENCES agents(id),
  depth INTEGER DEFAULT 0,
  llm_config JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  activated_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  UNIQUE(tenant_id, slug)
);
```

#### Tasks

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'queued',
  priority VARCHAR(20) DEFAULT 'normal',
  assignee_id UUID REFERENCES agents(id),
  creator_id UUID REFERENCES users(id),
  parent_task_id UUID REFERENCES tasks(id),
  progress_percent INTEGER DEFAULT 0,
  inputs JSONB DEFAULT '{}',
  outputs JSONB DEFAULT '{}',
  expected_outputs JSONB DEFAULT '{}',
  deadline_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Decisions

```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  task_id UUID REFERENCES tasks(id),
  category VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'proposed',
  title VARCHAR(500) NOT NULL,
  description TEXT,
  proposed_action JSONB NOT NULL,
  correct_action JSONB,
  reasoning JSONB NOT NULL,
  outcome JSONB,
  self_authorized BOOLEAN DEFAULT false,
  proposed_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  overridden_by UUID REFERENCES users(id),
  overridden_at TIMESTAMPTZ,
  override_reason TEXT
);
```

#### Escalations

```sql
CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  task_id UUID REFERENCES tasks(id),
  type VARCHAR(50) NOT NULL,
  urgency VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'open',
  title VARCHAR(500) NOT NULL,
  description TEXT,
  agent_analysis JSONB DEFAULT '{}',
  resolution_answer TEXT,
  resolution_resources JSONB DEFAULT '{}',
  sla_deadline_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Activities

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  actor_type VARCHAR(20) NOT NULL, -- 'user' or 'agent'
  actor_id UUID NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Messages (A2A Communication)

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  message_type VARCHAR(100) NOT NULL,
  from_agent_id UUID REFERENCES agents(id),
  to_agent_id UUID REFERENCES agents(id),
  to_broadcast BOOLEAN DEFAULT false,
  payload JSONB NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  requires_ack BOOLEAN DEFAULT false,
  acked_at TIMESTAMPTZ,
  thread_id UUID,
  correlation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   tenants   │────▶│    users    │     │   agents    │
└─────────────┘     └─────────────┘     └──────┬──────┘
       │                                       │
       │         ┌─────────────────────────────┘
       │         │        (parent-child)
       │         ▼
       │    ┌─────────────┐     ┌─────────────┐
       └───▶│    tasks    │◀────│  decisions  │
            └──────┬──────┘     └─────────────┘
                   │
            ┌──────┴──────┐     ┌─────────────┐
            │ escalations │     │  activities │
            └─────────────┘     └─────────────┘
```

---

## Row Level Security

### How RLS Works

Every table has an RLS policy that enforces tenant isolation:

```sql
-- Example: Agents table RLS
CREATE POLICY tenant_isolation ON agents
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

### Setting Tenant Context

Before querying, set the tenant context:

```sql
-- Set tenant context
SELECT set_tenant_context('550e8400-e29b-41d4-a716-446655440000');

-- Now queries are automatically filtered
SELECT * FROM agents; -- Only returns agents for this tenant
```

### Bypassing RLS

**Service Role Key** bypasses RLS (use with caution):

```typescript
// Server-side only
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This can see all data across all tenants
const { data } = await supabase.from('agents').select('*');
```

### RLS Policies Reference

| Table | Policy | Effect |
|-------|--------|--------|
| `tenants` | `tenant_isolation` | Users can only see their own tenant |
| `users` | `tenant_isolation` | Users can only see users in their tenant |
| `agents` | `tenant_isolation` | Agents isolated by tenant |
| `tasks` | `tenant_isolation` | Tasks isolated by tenant |
| `decisions` | `tenant_isolation` | Decisions isolated by tenant |
| `escalations` | `tenant_isolation` | Escalations isolated by tenant |
| `activities` | `tenant_isolation` | Activities isolated by tenant |
| `messages` | `tenant_isolation` | Messages isolated by tenant |

---

## Realtime Setup

### Enable Realtime for Tables

```sql
-- Enable realtime for a table
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

### Broadcasting Changes

Changes to these tables automatically broadcast via WebSocket:

```javascript
// Subscribe to activities
const subscription = supabase
  .channel('tenant:123')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'activities' },
    (payload) => {
      console.log('New activity:', payload.new);
    }
  )
  .subscribe();
```

### Channel Patterns

| Channel | Purpose |
|---------|---------|
| `tenant:{id}` | All tenant activity |
| `tenant:{id}:agents` | Agent changes only |
| `tenant:{id}:tasks` | Task changes only |
| `agent:{id}` | Specific agent updates |
| `task:{id}` | Specific task updates |

---

## Backup & Restore

### Automated Backups

Supabase provides automated backups:

- **Free tier**: Daily backups, 7-day retention
- **Pro tier**: Point-in-time recovery, 7-day retention
- **Enterprise**: Extended retention options

### Manual Backup

**Export Schema:**

```bash
# Using pg_dump
pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  postgresql://postgres:password@db.xxx.supabase.co:5432/postgres \
  > schema_backup.sql
```

**Export Data:**

```bash
# Using pg_dump
pg_dump \
  --data-only \
  --no-owner \
  --no-privileges \
  postgresql://postgres:password@db.xxx.supabase.co:5432/postgres \
  > data_backup.sql
```

### Restore from Backup

```bash
# Restore schema
psql \
  postgresql://postgres:password@db.xxx.supabase.co:5432/postgres \
  < schema_backup.sql

# Restore data
psql \
  postgresql://postgres:password@db.xxx.supabase.co:5432/postgres \
  < data_backup.sql
```

### Point-in-Time Recovery

Available on Pro tier and above:

1. Go to Supabase Dashboard → Database → Backups
2. Click **Restore**
3. Select date/time to restore to
4. Confirm (this creates a new project)

---

## Troubleshooting

### "relation does not exist"

**Cause:** Migration hasn't been applied

**Solution:**
```bash
# Apply migrations
supabase migration up

# Or check migration status
supabase migration list
```

### "violates row-level security policy"

**Cause:** Tenant context not set

**Solution:**
```typescript
// Set tenant context before querying
await supabase.rpc('set_tenant_context', {
  tenant_id: 'your-tenant-id'
});
```

### "connection refused"

**Cause:** Database not accessible

**Solutions:**
1. Check if Supabase project is paused (free tier)
2. Verify connection string
3. Check network/firewall settings
4. Try connecting via Supabase Dashboard SQL Editor

### Migration fails

**Check:**
1. Migration syntax errors
2. Dependencies on other migrations
3. Existing data conflicts
4. Permission issues

**Debug:**
```bash
# Run with verbose output
supabase migration up --debug

# Check specific migration
supabase migration repair 001
```

### Performance Issues

**Check slow queries:**
```sql
-- Find slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Add indexes:**
```sql
-- Check for missing indexes
SELECT schemaname, tablename, attname as column
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND tablename NOT IN (
    SELECT tablename 
    FROM pg_indexes 
    WHERE indexdef LIKE '%' || attname || '%'
  );
```

---

## Database Maintenance

### Regular Tasks

| Task | Frequency | Command/Method |
|------|-----------|----------------|
| Vacuum | Weekly | Auto-vacuum enabled |
| Analyze | Weekly | `ANALYZE;` |
| Check disk usage | Monthly | Dashboard |
| Review slow queries | Monthly | `pg_stat_statements` |
| Update statistics | Daily | Auto-enabled |

### Monitoring

**Key Metrics:**
- Connection count
- Query performance (p95, p99)
- Disk usage
- Replication lag (if using replicas)

**Alerts:**
- Connection limit approaching
- Disk space > 80%
- Replication lag > 5s

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Environment Variables](./ENVIRONMENT.md)
- [API Documentation](./API.md)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
