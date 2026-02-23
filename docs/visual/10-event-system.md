---
title: Event-Driven System
type: visual
tags: [visual, diagram, realtime, events]
aliases: ["Activity Feed", "Realtime Events"]
---

# Event-Driven System

## Overview

ARM is **event-driven architecture**. Every state change on agents, tasks, decisions, and escalations automatically fires a PostgreSQL trigger that logs an activity record. Supabase Realtime then pushes these events to connected clients via WebSocket in real-time.

Think of it like a concert venue: Every action backstage (agent working, task completing) triggers an entry in the event log. A live event feed broadcasts these changes to all audience members watching via their phones. No polling required—changes appear instantly.

---

## Complete Event Flow (Sequence Diagram)

Here's how a single change ripples through the entire system:

```mermaid
sequenceDiagram
    participant Client as React Client
    participant APIR as Next.js API Route
    participant PG as PostgreSQL
    participant Trigger as log_activity() Trigger
    participant ActTable as activities Table
    participant Realtime as Supabase Realtime
    participant WSChannel as WebSocket Channel
    participant Feed as Activity Feed UI

    Client->>APIR: PATCH /api/agents/[id]<br/>{ status: 'active' }
    APIR->>PG: UPDATE agents SET status = 'active'<br/>WHERE tenant_id = $1

    activate PG
    Note over PG: ✅ Update succeeds
    PG->>Trigger: 🔔 AFTER UPDATE trigger fires<br/>NEW.status = 'active'
    deactivate PG

    activate Trigger
    Trigger->>Trigger: 🔍 Determine change type<br/>and construct activity payload
    Trigger->>ActTable: INSERT activity record<br/>{<br/>  title: 'Agent status changed',<br/>  description: 'Agent transitioned to active',<br/>  actor_type: 'system',<br/>  actor_id: current_user_id,<br/>  target_type: 'agent',<br/>  target_id: agent_id,<br/>  metadata: { old_status: 'initializing', new_status: 'active' }<br/>}
    deactivate Trigger

    ActTable->>Realtime: 🌊 Realtime detects INSERT<br/>on activities table
    activate Realtime
    Realtime->>Realtime: 📡 Broadcast to subscribed channels:<br/>• activities:{tenant_id}<br/>• activities:{tenant_id}:agent:{agent_id}<br/>• tenant:{tenant_id}:agents
    deactivate Realtime

    Realtime->>WSChannel: 🔌 Push event via WebSocket<br/>{<br/>  type: 'INSERT',<br/>  schema: 'public',<br/>  table: 'activities',<br/>  record: { activity_record }<br/>}

    WSChannel->>Client: ⚡ Realtime callback fires<br/>in useActivities() hook

    activate Client
    Client->>Client: 📊 Update local state<br/>add new activity to feed
    Client->>Feed: 🎨 Re-render activity feed
    Note over Feed: ✨ New event appears instantly<br/>with timestamp & rich metadata
    deactivate Client
```

---

## Realtime Channel Architecture

Supabase Realtime uses a pub/sub channel system. Clients subscribe to channels of interest; only relevant events are pushed:

```mermaid
graph TB
    Hub["🌐 Supabase Realtime Hub"]

    Hub -->|"activities:tenant_id"| Chan1["📢 Channel: All Activities<br/>for Tenant XYZ"]
    Chan1 -->|"agent spawned<br/>task completed<br/>decision made"| Sub1["Client 1"]
    Chan1 -->|"..."| Sub2["Client 2"]
    Chan1 -->|"..."| Sub3["Client 3"]

    Hub -->|"activities:tenant_id:agent:agent_id"| Chan2["📢 Channel: Agent-Specific<br/>Activities"]
    Chan2 -->|"Agent ABC status changed<br/>Agent ABC assigned task"| Sub4["Watching Agent ABC"]

    Hub -->|"activities:tenant_id:category:cat"| Chan3["📢 Channel: Category Filter<br/>e.g., category=error"]
    Chan3 -->|"All errors for tenant"| Sub5["Error Monitor"]

    Hub -->|"tenant:id:agents"| Chan4["📢 Channel: Agent Roster<br/>Status Changes"]
    Chan4 -->|"New agent spawned<br/>Agent terminated"| Sub6["Agent Manager"]

    Hub -->|"agent:id"| Chan5["📢 Channel: Individual Agent<br/>Real-time Status"]
    Chan5 -->|"Status, presence, progress"| Sub7["Agent Dashboard"]

    style Hub fill:#ffd700
    style Chan1 fill:#87ceeb
    style Chan2 fill:#87ceeb
    style Chan3 fill:#87ceeb
    style Chan4 fill:#87ceeb
    style Chan5 fill:#87ceeb
```

**Why multiple channels?**
- Reduces data noise (no need to hear about Agent 1 when watching Agent 2)
- Improves scalability (fewer messages = lower bandwidth)
- Enables selective subscriptions in UI components
- Allows filtering (only show "error" category events)

---

## Events That Trigger Activities

Not every database action creates an activity. Only meaningful state changes do:

| Entity | Events Tracked |
|--------|----------------|
| **Agents** | spawned, initialized, status_changed (idle→active→paused→blocked→error→terminated), config_updated, escalated |
| **Tasks** | created, assigned, started, progress_updated, completed, failed, cancelled, priority_changed, reassigned |
| **Decisions** | proposed, approved, rejected, overridden, executed |
| **Escalations** | created, reviewed, resolved (with resolution_type), auto_escalated |
| **Messages** | sent, delivered, read, archived |
| **System** | error_logged, config_changed, backup_completed, migration_started |
| **Analytics** | daily_rollup_completed, quota_exceeded |

**Database trigger location:** `supabase/migrations/010-activity-tracking.sql`

---

## Activity Record Structure

Each activity record captures this data:

```
activities table:
├─ id: BIGSERIAL (primary key, global sequence)
├─ sequence_number: BIGSERIAL (used for cursor pagination)
├─ tenant_id: UUID (multi-tenant isolation)
├─ title: text (human-readable: "Agent status changed")
├─ description: text (narrative: "Agent transitioned from idle to active")
├─ actor_type: enum (system | agent | user)
├─ actor_id: UUID (which agent or user triggered this)
├─ target_type: enum (agent | task | decision | escalation | message | system)
├─ target_id: UUID (which entity this affects)
├─ change_type: enum (CREATE | UPDATE | DELETE | STATE_TRANSITION)
├─ metadata: JSONB (context-specific data)
│  ├─ For agent status changes: { old_status, new_status, reason }
│  ├─ For task completion: { result, duration_seconds, notes }
│  ├─ For escalations: { escalation_type, urgency, resolution }
│  └─ etc.
├─ created_at: timestamp (UTC)
├─ expires_at: timestamp (retention policy, see below)
└─ archived: boolean (soft-delete for compliance)
```

---

## Activity Feed Pagination

The activity feed uses **cursor-based pagination** (not offset-based):

```mermaid
sequenceDiagram
    participant Client as React Client
    participant API as /api/activities
    participant DB as PostgreSQL

    Client->>API: GET /api/activities<br/>?tenant_id=XYZ<br/>&limit=20<br/>&cursor=null<br/>(first page)

    API->>DB: SELECT * FROM activities<br/>WHERE tenant_id = 'XYZ'<br/>ORDER BY sequence_number DESC<br/>LIMIT 21

    Note over DB: Fetch 21 (limit + 1 for<br/>has_next_page detection)

    DB->>API: Return 21 records

    API->>API: Take first 20,<br/>compute next_cursor<br/>from 21st record

    API->>Client: {<br/>  activities: [...20 records],<br/>  next_cursor: "sequence_1534",<br/>  has_next_page: true<br/>}

    Note over Client: User scrolls down,<br/>requests more

    Client->>API: GET /api/activities<br/>?tenant_id=XYZ<br/>&limit=20<br/>&cursor=sequence_1534<br/>(next page)

    API->>DB: SELECT * FROM activities<br/>WHERE tenant_id = 'XYZ'<br/>AND sequence_number < 1534<br/>ORDER BY sequence_number DESC<br/>LIMIT 21

    DB->>API: Return next batch

    API->>Client: {<br/>  activities: [...20 more records],<br/>  next_cursor: "sequence_1314",<br/>  has_next_page: true<br/>}
```

**Why cursor-based pagination?**
- ✅ Immutable: Even if new records are inserted, your cursor remains valid
- ✅ Efficient: Uses indexed `sequence_number` for O(1) lookups
- ✅ No offset drift: Offset-based pagination breaks when data changes between requests
- ❌ Offset-based pagination: If someone inserts 10 new records while you're on page 2, your page 3 will be off by 10 records

---

## Data Retention & Archival

Activities are retained according to this policy:

```mermaid
graph LR
    A["📝 Activity Created"] -->|"Days 1-90"| B["🔍 Live in activities table<br/>Queryable via API"]
    B -->|"Day 90 (pg_cron)"| C["📦 Auto-Archive<br/>Move to activities_archive"]
    C -->|"Days 91-365"| D["🗂️ In cold storage<br/>Queryable via separate API"]
    D -->|"Day 365+ (pg_cron)"| E["🗑️ Hard Delete<br/>Purged permanently"]

    style A fill:#90ee90
    style B fill:#87ceeb
    style C fill:#ffa500
    style D fill:#daa520
    style E fill:#ff6347
```

**Configuration (in migrations):**
```sql
-- Retention windows
RETENTION_LIVE = 90 days         -- Hot data, full queryable
RETENTION_ARCHIVE = 365 days     -- Cold storage, archive queries only
PURGE_AFTER = 365 days           -- Hard delete

-- Automated jobs (pg_cron)
-- Archive: SELECT cron.schedule('archive-activities', '0 1 * * *', 'SELECT archive_old_activities()');
-- Purge:   SELECT cron.schedule('purge-activities', '0 2 * * *', 'SELECT purge_archived_activities()');
```

---

## Example Event Chain

Let's trace a complete sequence through the system:

**Scenario:** Marketing Manager agent completes a task "Send newsletter", which triggers a decision for metrics review.

**Step 1: Task Completion**
```
API: PATCH /api/tasks/task-789
Body: { status: 'completed', result: { emails_sent: 12500, open_rate: 0.34 } }
```

**Step 2: Trigger Fires**
```sql
-- log_activity() trigger detects UPDATE
INSERT INTO activities (
  title: 'Task completed',
  description: 'Newsletter task finished: 12.5K emails, 34% open rate',
  actor_type: 'agent',
  actor_id: 'agent-456',
  target_type: 'task',
  target_id: 'task-789',
  metadata: {
    result: { emails_sent: 12500, open_rate: 0.34 },
    old_status: 'in_progress',
    new_status: 'completed',
    duration_seconds: 1247
  }
)
```

**Step 3: Realtime Broadcast**
```
Channels:
- activities:{tenant_id}          ← All activities for tenant
- activities:{tenant_id}:agent:{agent-456}  ← Marketing Manager's activities
- tenant:{tenant_id}:agents       ← Agent roster updates
```

**Step 4: Client Receives**
```js
// In React component with useActivities() hook
supabase
  .channel(`activities:${tenantId}:agent:${agentId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' },
    (payload) => {
      // Activity appears in feed instantly
      setActivities([payload.new, ...activities]);
    }
  )
```

**Step 5: UI Updates**
```
Activity Feed shows:
┌─────────────────────────────────────────┐
│ 📊 Task Completed: Send Newsletter      │
│ Marketing Manager | 1:47 PM             │
│ 12.5K emails sent, 34% open rate        │
│ Duration: ~21 minutes                   │
└─────────────────────────────────────────┘
```

**Whole flow latency:** ~100-200ms (depends on WebSocket latency)

---

## Event-Driven Benefits

| Benefit | How It Works |
|---------|-------------|
| **Real-time Updates** | WebSocket push vs. polling = instant UI updates |
| **Audit Trail** | Every state change is logged = compliance ready |
| **Debugging** | Trace events backward to understand what happened |
| **Alerting** | Set up rules on activity stream (high error rate? Alert humans) |
| **Analytics** | Activities feed raw data for daily rollups and metrics |
| **Decoupling** | Components don't need to know about each other; they all watch the activity stream |

---

## Supabase Realtime Configuration

The activity stream is configured in `supabase/config.yaml`:

```yaml
# Realtime settings
realtime:
  enabled: true
  max_connections_per_client: 10
  max_payload_bytes: 1048576  # 1 MB
  temporary_subscriptions:
    enabled: true
    ttl_seconds: 60

# Broadcast retention (optional)
broadcast_retention_seconds: 3600  # Keep broadcasts for 1 hour
```

---

## Best Practices for Events

### For Developers
- ✅ Use cursor pagination (don't use offset)
- ✅ Filter subscriptions by channel (don't listen to everything)
- ✅ Handle WebSocket disconnects gracefully
- ✅ Cache recent activities locally to smooth out latency
- ❌ Don't poll `/api/activities` every 2 seconds (kills your API quota)
- ❌ Don't store sensitive data in metadata (it's in logs)

### For Observability
- ✅ Monitor activities table growth (should be ~100-200 per active agent per day)
- ✅ Set up alerts for abnormal activity patterns (spam? Runaway agent?)
- ✅ Review activity trends weekly
- ✅ Archive stale activities on schedule (cron jobs in place)

---

## Related Documentation

- [[06-data-model]] — Schema definitions for activities table
- [[11-api-architecture]] — How API routes trigger activities
- [[05-agent-lifecycle]] — State transitions that create events
- [[ARCHITECTURE]] — Overall system design

---

## See Also

- `supabase/migrations/010-activity-tracking.sql` — Trigger & table schema
- `src/lib/hooks/useActivities.ts` — React hook for subscribing to events
- `src/lib/supabase.ts` — Activity queries with cursor pagination
- `src/components/dashboard/ActivityFeed.tsx` — UI component
- `src/components/hooks/useRealtimeSubscription.ts` — Realtime subscription helper
