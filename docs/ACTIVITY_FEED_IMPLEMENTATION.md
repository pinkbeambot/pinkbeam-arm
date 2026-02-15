---
title: "Activity Feed Implementation"
type: implementation
status: active
created: 2026-02-13
updated: 2026-02-15
owner: ENG-BE
tags: [implementation, realtime, backend, database]
aliases: ["Activity Feed", "Event System"]
---

# Activity Feed Backend - Implementation Notes

## Overview
This document describes the implementation of the Activity Feed backend for Pink Beam ARM platform.

## Architecture Decisions

### 1. Database Triggers vs Application Logging
**Decision:** Use PostgreSQL triggers for activity logging.

**Rationale:**
- Ensures all state changes are captured regardless of API entry point
- Maintains audit trail integrity even with direct database access
- Reduces application code complexity
- Atomic with the transaction - no orphaned activities

**Trade-offs:**
- Slightly more database load
- Less flexibility for complex business logic in activity metadata

### 2. Cursor-Based Pagination
**Decision:** Use cursor-based pagination with `sequence_number` instead of offset pagination.

**Rationale:**
- Prevents missing/duplicate items during high-activity periods
- Better performance for large datasets
- Supports infinite scroll UI pattern effectively

**Implementation:**
- Uses the existing `sequence_number BIGSERIAL` column
- Returns `cursor` in meta response for next page
- Client passes cursor as query parameter for subsequent requests

### 3. Realtime Subscription Strategy
**Decision:** Use Supabase Realtime with tenant-scoped channels.

**Rationale:**
- Native integration with existing Supabase stack
- Automatic WebSocket management
- Built-in RLS enforcement

**Channel Naming Convention:**
```
activities:{tenant_id}                    # All tenant activities
activities:{tenant_id}:agent:{agent_id}   # Agent-specific activities
activities:{tenant_id}:category:{cat}     # Category-filtered activities
```

### 4. Multi-Table Activity Source
**Decision:** The ARM platform uses agents, tasks, decisions, and escalations as core entities.

**Note on CRM Entities:** The original requirements mentioned "deals", "contacts", and "notes" tables. These are traditional CRM concepts. Since ARM is an **Agent Relationship Management** platform (not a traditional CRM), we track:
- **Agents** instead of contacts
- **Tasks** for work items
- **Decisions** for agent decision tracking
- **Escalations** for human intervention

If traditional CRM entities are added in the future, the `log_activity()` trigger function can be extended following the existing pattern.

## File Structure

```
~/code/arm/
├── src/
│   ├── app/api/activities/
│   │   └── route.ts              # GET /api/activities endpoint
│   ├── lib/
│   │   ├── validation.ts         # Updated with activity query schema
│   │   └── realtime/
│   │       └── activities.ts     # Realtime subscription utilities
│   └── types/
│       └── index.ts              # Activity types (existing)
├── supabase/migrations/
│   └── 010_activity_feed_enhancements.sql  # Database changes
└── docs/
    └── ACTIVITY_FEED_IMPLEMENTATION.md     # This document
```

## API Reference

### GET /api/activities

List activities with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent_id` | UUID | Filter by agent (actor or related) |
| `entity_type` | string | Filter by category: `tasks`, `decisions`, `escalations`, `agents`, `system` |
| `action_type` | string | Filter by specific action (e.g., `task.created`, `agent.spawned`) |
| `time_range` | string | Shortcut: `1h`, `24h`, `7d`, `30d`, `all` |
| `date_from` | ISO date | Start date (alternative to time_range) |
| `date_to` | ISO date | End date (alternative to time_range) |
| `search` | string | Search in title/description (min 1 char) |
| `cursor` | string | Pagination cursor (sequence_number) |
| `limit` | number | Items per page (default: 50, max: 100) |

**Response:**

```json
{
  "activities": [...],
  "agents": [...],
  "tasks": [...],
  "decisions": [...],
  "escalations": [...],
  "meta": {
    "total": 1000,
    "cursor": "12345",
    "hasMore": true
  }
}
```

## Database Schema

### activities Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Multi-tenancy isolation |
| `type` | activity_type | Event type enum |
| `category` | VARCHAR | High-level grouping |
| `actor_type` | VARCHAR | `agent`, `user`, `system` |
| `actor_id` | UUID | Who performed the action |
| `target_type` | VARCHAR | Table name of target |
| `target_id` | UUID | ID of affected entity |
| `title` | VARCHAR | Human-readable title |
| `description` | TEXT | Detailed description |
| `metadata` | JSONB | Additional context |
| `agent_id` | UUID | Related agent (if applicable) |
| `task_id` | UUID | Related task (if applicable) |
| `sequence_number` | BIGSERIAL | Pagination cursor |
| `created_at` | TIMESTAMPTZ | Event timestamp |

### Tracked Events

| Entity | Events |
|--------|--------|
| **Agents** | spawned, status_changed, terminated |
| **Tasks** | created, assigned, started, progress, completed, failed |
| **Decisions** | proposed, made, overridden |
| **Escalations** | created, resolved |
| **System** | error, config_changed |

## Realtime Usage

### Client-Side (React Hook)

```typescript
import { useRealtimeActivities } from '@/components/dashboard/activity/useRealtimeActivities';

function MyComponent() {
  const { events, isLoading, isRealtime, loadMore } = useRealtimeActivities({
    filter: {
      type: 'tasks',
      agentId: 'agent-uuid',
      timeRange: '24h'
    },
    onNewActivity: (activity) => {
      console.log('New activity:', activity);
    }
  });
  
  return ...;
}
```

### Direct Subscription

```typescript
import { subscribeToActivities } from '@/lib/realtime/activities';

const channel = subscribeToActivities(
  supabase,
  { tenantId: 'tenant-uuid', category: 'task' },
  {
    onInsert: (activity) => console.log('New:', activity),
    onError: (err) => console.error('Error:', err)
  }
);

// Cleanup
channel.unsubscribe();
```

## Security

### Row Level Security (RLS)

Activities use the same tenant isolation pattern as other tables:

```sql
CREATE POLICY activities_tenant_isolation ON activities
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

### API Security

- JWT authentication required
- Tenant context validated via `set_tenant_context()` RPC
- All queries include `tenant_id` filter

## Performance Considerations

### Indexes

The migration adds several indexes for common query patterns:

```sql
-- Tenant + time range queries
CREATE INDEX idx_activities_tenant_created ON activities(tenant_id, created_at DESC);

-- Actor-based queries
CREATE INDEX idx_activities_actor ON activities(actor_id, created_at DESC);

-- Target entity lookups
CREATE INDEX idx_activities_target ON activities(target_type, target_id, created_at DESC);

-- Recent activities (partial index)
CREATE INDEX idx_activities_recent ON activities(tenant_id, sequence_number DESC)
    WHERE created_at > NOW() - INTERVAL '7 days';
```

### Data Retention

Two functions are provided for data lifecycle management:

```sql
-- Archive activities older than 90 days
SELECT archive_old_activities(90);

-- Permanently delete archived activities older than 1 year
SELECT purge_archived_activities(365);
```

These can be scheduled via pg_cron:

```sql
-- Run archival daily at 3 AM
SELECT cron.schedule('archive-old-activities', '0 3 * * *', 
    'SELECT archive_old_activities(90)');
```

## Testing

### Manual Testing Checklist

- [ ] GET /api/activities returns activities for authenticated user
- [ ] Pagination works with cursor
- [ ] Filters (agent_id, entity_type, action_type) work correctly
- [ ] Time range filters work
- [ ] Search functionality works
- [ ] Realtime subscriptions receive new activities
- [ ] RLS prevents cross-tenant access

### Example curl Commands

```bash
# List all activities
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/activities?limit=10"

# Filter by agent
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/activities?agent_id=$AGENT_ID"

# Filter by time range
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/activities?time_range=24h"

# Search
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/activities?search=completed"
```

## Future Enhancements

1. **Activity Aggregation**: Group related activities (e.g., 5 task updates in 1 minute)
2. **Activity Digest**: Daily/weekly email summaries
3. **Smart Filtering**: ML-based importance scoring
4. **Export**: CSV/JSON export for compliance
5. **Webhooks**: External notification support

## Migration Rollback

If needed, the migration can be partially rolled back:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS agents_activity_trigger ON agents;
DROP TRIGGER IF EXISTS tasks_activity_trigger ON tasks;
DROP TRIGGER IF EXISTS decisions_activity_trigger ON decisions;
DROP TRIGGER IF EXISTS escalations_activity_trigger ON escalations;

-- Note: Activity data is preserved in the activities table
```

## References

- GitHub Issue: https://github.com/pinkbeambot/pinkbeam-arm/issues/14
- Supabase Realtime Docs: https://supabase.com/docs/guides/realtime
- Database Migration: `supabase/migrations/010_activity_feed_enhancements.sql`

---

## Related Documentation

- [[ARCHITECTURE]] — Event-driven architecture this implements
- [[API]] — Activity feed API endpoints
- [[TESTING-STANDARDS]] — Testing requirements for event system
- [[ENGINEERING]] — Engineering status for activity feed work
