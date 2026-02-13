# ARM Platform Architecture

## System Overview

ARM is a native Agent Relationship Management platform built on a modern, event-driven architecture. The system supports hierarchical agent spawning (agents creating agents), real-time activity feeds, and comprehensive decision logging.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Web App    │  │  Mobile     │  │  CLI        │  │  External APIs      │  │
│  │  (Next.js)  │  │  (Future)   │  │  (Claude)   │  │  (Webhooks)         │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────┼────────────────────┼─────────────┘
          │                │                │                    │
          └────────────────┴────────────────┴────────────────────┘
                                      │
                              ┌───────┴───────┐
                              │   API Layer   │
                              │  (Next.js API │
                              │   Routes)     │
                              └───────┬───────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
┌─────────▼─────────┐      ┌──────────▼──────────┐   ┌────────────▼──────────┐
│  AGENT RUNTIME    │      │  REALTIME SERVICE   │   │  BACKGROUND JOBS      │
│  (Edge Functions) │      │  (Supabase Realtime)│   │  (pg_cron + Queues)   │
│                   │      │                     │   │                       │
│  ┌─────────────┐  │      │  - Activity feed    │   │  - Task scheduling    │
│  │ Agent Core  │  │      │  - Agent messaging  │   │  - Escalation alerts  │
│  │ - Spawn     │  │      │  - Status updates   │   │  - Analytics rollup   │
│  │ - Execute   │  │      │  - Decision events  │   │  - Cleanup tasks      │
│  │ - Message   │  │      │                     │   │                       │
│  └─────────────┘  │      └─────────────────────┘   └───────────────────────┘
│                   │
│  ┌─────────────┐  │
│  │ LLM Router  │  │
│  │ - Claude    │  │
│  │ - GPT       │  │
│  │ - Gemini    │  │
│  │ - Local     │  │
│  └─────────────┘  │
└─────────┬─────────┘
          │
┌─────────▼───────────────────────────────────────────────────────────────────┐
│                           DATA LAYER (Supabase)                             │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │ tenants      │ │ agents       │ │ tasks        │ │ decisions        │   │
│  │ - workspaces │ │ - hierarchy  │ │ - pipeline   │ │ - audit trail    │   │
│  │ - configs    │ │ - state      │ │ - deps       │ │ - reasoning      │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘   │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │ escalations  │ │ activities   │ │ messages     │ │ analytics        │   │
│  │ - inbox      │ │ - event log  │ │ - a2a comms  │ │ - metrics        │   │
│  │ - resolution │ │ - timeline   │ │ - threads    │ │ - aggregations   │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘   │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                         │
│  │ users        │ │ sessions     │ │ files        │                         │
│  │ - auth       │ │ - runtime    │ │ - artifacts  │                         │
│  │ - roles      │ │ - context    │ │ - storage    │                         │
│  └──────────────┘ └──────────────┘ └──────────────┘                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Architectural Principles

### 1. Multi-Tenancy from Day One
- Every table has `tenant_id` for row-level security
- Tenants = workspaces for customer isolation
- RLS policies enforce tenant boundaries
- Cross-tenant queries are impossible by design

### 2. Event-Driven Architecture
- All state changes emit events
- Real-time subscriptions for live UI updates
- Event log = audit trail + activity feed source
- Idempotent event handlers

### 3. Hierarchical Agent Model
- Agents can spawn child agents (tree structure)
- Parent agents supervise child lifecycle
- Deep nesting supported (CEO → Manager → Worker → Task Agent)
- Root agent = human CEO

### 4. Decision Logging
- Every meaningful decision is logged
- Reasoning captured at time of decision
- Immutable audit trail
- Human override capability

### 5. Async-First Design
- Tasks are async by default
- Agents don't block waiting
- Callbacks/events for completion
- Supports long-running operations

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15, React 19 | Web application |
| Styling | Tailwind CSS 4 | UI styling |
| Types | TypeScript 5 | Type safety |
| Database | PostgreSQL 15 (Supabase) | Primary data store |
| Auth | Supabase Auth | User authentication |
| Realtime | Supabase Realtime | WebSocket events |
| Compute | Supabase Edge Functions | Agent runtime |
| Storage | Supabase Storage | File artifacts |
| Hosting | Vercel | Application hosting |
| Queues | pg_boss (PostgreSQL) | Background jobs |
| Cron | pg_cron | Scheduled tasks |

## Key Data Flows

### Agent Spawning Flow
```
1. Parent agent requests spawn
2. Agent runtime validates parent permissions
3. New agent record created with parent_id
4. Initial context/state stored
5. Agent enters "Initializing" state
6. Event emitted: agent.spawned
7. Parent receives confirmation + child agent_id
8. Child agent begins execution
```

### Task Execution Flow
```
1. Task created (queued state)
2. Assigned agent notified via event
3. Agent claims task (in_progress state)
4. Agent executes (may spawn sub-agents)
5. Sub-tasks created for parallel work
6. Sub-task results aggregated
7. Task completed or escalated
8. Events emitted throughout for real-time updates
```

### Escalation Flow
```
1. Agent encounters situation needing human input
2. Escalation record created with context
3. Human notified (dashboard, email, etc.)
4. Human reviews and provides guidance
5. Resolution stored with decision
6. Agent resumes with guidance
7. Audit trail captures full interaction
```

### Real-Time Activity Feed
```
1. Client subscribes to tenant's activity channel
2. All state changes publish events
3. Supabase Realtime broadcasts to subscribers
4. Client UI updates without polling
5. Events stored for persistence/replay
```

## Security Architecture

### Row Level Security (RLS)
All tables have RLS enabled with policies:
```sql
-- Example: Agents table
CREATE POLICY tenant_isolation ON agents
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Example: Users can only see their tenant
CREATE POLICY user_tenant_isolation ON users
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### Agent Permission Model
- Agents have scopes defining capabilities
- Parent agents can manage child agents
- Escalation required for sensitive operations
- Audit log captures all permission checks

### API Security
- JWT authentication via Supabase Auth
- Tenant context in JWT claims
- Rate limiting per tenant
- Request signing for agent runtime

## Scalability Considerations

### Database
- Connection pooling via Supabase
- Read replicas for analytics queries
- Partitioning strategy for activity/events tables
- Archive old events to cold storage

### Realtime
- Channel per tenant for isolation
- Automatic reconnection
- Event debouncing for high-frequency updates
- Client-side caching

### Agent Runtime
- Stateless edge functions
- Horizontal scaling automatic
- Queue-based task distribution
- Circuit breakers for LLM APIs

## Performance Targets

| Metric | Target |
|--------|--------|
| API Response Time | < 100ms (p95) |
| Realtime Latency | < 50ms |
| Agent Spawn Time | < 500ms |
| Task Assignment | < 200ms |
| Dashboard Load | < 2s |
| Activity Feed | Real-time (< 100ms) |

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│              Vercel Edge               │
│         (Next.js Application)          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Supabase Project              │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ PostgreSQL  │  │ Edge Functions  │   │
│  │ - Primary   │  │ - Agent Runtime │   │
│  │ - Read Replica│ - Webhooks      │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Realtime    │  │ Storage         │   │
│  │ - WebSockets│  │ - Artifacts     │   │
│  │ - Broadcast │  │ - Exports       │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Auth        │  │ cron/queues     │   │
│  │ - JWT       │  │ - Background    │   │
│  │ - SSO       │  │ - Scheduled     │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

## Integration Points

### LLM Providers
- OpenAI (GPT-4, GPT-4o)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Google (Gemini Pro)
- Local models (Ollama, vLLM)

### External Services
- Slack (notifications)
- Email (SendGrid/Resend)
- Webhooks (customer integrations)
- Zapier/Make (workflow automation)

## Monitoring & Observability

### Metrics
- Agent spawn success rate
- Task completion rate
- Escalation rate by agent
- Decision latency
- Realtime event throughput

### Logging
- Structured JSON logging
- Correlation IDs across services
- Agent execution traces
- Error tracking with Sentry

### Alerting
- Escalation SLA breaches
- Agent failure rates
- System health checks
- Cost anomaly detection

## Migration Strategy

### Phase 1: Foundation (Weeks 1-4)
- Core database schema
- Agent runtime v1
- Basic API endpoints
- Authentication

### Phase 2: Dashboard (Weeks 5-8)
- Agent roster UI
- Real-time activity feed
- Task pipeline
- Multi-tenancy UI

### Phase 3: Core Features (Weeks 9-12)
- Decision logging
- Escalation inbox
- Performance dashboard
- Agent configuration

### Phase 4: Polish (Weeks 13-16)
- Chat interface
- Workflow builder
- Onboarding
- Performance optimization

## Meta-Agent Architecture (Future)

The platform is architected to support a **meta-agent** (codename: VALIS) — a central command agent that provides natural language access to the entire agent workforce. This is intentionally deferred post-MVP but the foundation is built from day one.

### Architectural Requirements (Implemented in MVP)

1. **System Agent Type** — Reserved agent ID per tenant with `role = 'system'` and `type = 'meta'`
2. **Queryable Activity Schema** — Activities stored as structured data (JSONB), not just display strings
3. **Flexible API Filtering** — `/api/activities` supports filtering by: agent_id, time_range, event_type, entity_type
4. **Permission Model** — System agents bypass standard RLS within their tenant (but not cross-tenant)
5. **Message Protocol** — A2A messaging already supports `to: 'broadcast'` and hierarchical routing

### Future Implementation (Post-MVP)

**Phase 1: Natural Language Queries (Read-Only)**
```
User: "What's MarketingBot working on?"
→ LLM converts to: GET /api/tasks?assigned_to=marketingbot&status=in_progress
→ Results synthesized into conversational response
```

**Phase 2: Cross-Agent Aggregation**
```
User: "Compare my agents' performance this week"
→ Query analytics across all agents → Comparative summary
```

**Phase 3: Action Commands**
```
User: "Pause all sales agents and summarize their open tasks"
→ Multi-step: bulk update + aggregate query + natural language response
```

### Why This Architecture

- **Zero MVP overhead** — Schema and APIs you'd build anyway
- **No refactor cost** — No migration needed when adding meta-agent later
- **Clean separation** — Business logic (now) vs NL interface (later)
- **Category differentiation** — Nobody else has conversational workforce management

## Future Considerations

### Roadmap
- Meta-agent / natural language interface (VALIS)
- Mobile applications
- Advanced workflow builder
- Marketplace for agent templates
- Enterprise SSO (SAML/SCIM)
- Advanced analytics (ML-based insights)
- Agent marketplace
- Compliance certifications (SOC 2, HIPAA)

### Technical Debt Prevention
- Comprehensive test coverage from day one
- Documentation for all APIs
- Performance benchmarks
- Regular dependency updates
- Database migration testing
