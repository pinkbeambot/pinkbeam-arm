---
title: VALIS Meta-Agent
type: visual
tags: [visual, diagram, agents, valis, future]
aliases: [VALIS, Meta-Agent, Natural Language Interface]
---

# VALIS Meta-Agent Architecture

**VALIS** (codename) is the planned **meta-agent** for Pink Beam ARM — a system-level natural language interface that provides conversational access to the entire agent workforce.

## What is VALIS?

VALIS is **NOT** a CEO agent. It is a special **system-level agent** (role: `system`, type: `meta`) that:

- Accepts **natural language queries** from humans
- Routes queries to appropriate data endpoints or agent commands
- Synthesizes responses back into conversational natural language
- Operates **within tenant boundaries** (never crosses tenant data)
- Serves as a **bridge between human language and agent commands**

VALIS is intentionally deferred to **post-MVP**, but the architectural foundation is built into ARM from day one. This ensures a smooth, no-refactor transition when the time comes to activate it.

---

## VALIS Architecture

```mermaid
graph TD
    User["👤 User"]
    Query["Natural Language Input<br/>'What is MarketingBot working on?'"]

    User -->|"Asks question"| Query
    Query -->|"Sent to"| VALIS["🤖 VALIS Meta-Agent<br/>role: system, type: meta"]

    VALIS -->|"Classification + Entity Extraction"| Router["LLM Router"]

    Router -->|"Route by intent"| Handlers["🔀 Intent Handlers"]

    Handlers -->|"status_query"| H1["Query Tasks & Agents<br/>GET /api/agents<br/>GET /api/tasks"]
    Handlers -->|"assign_task"| H2["Create or Update Task<br/>POST /api/tasks"]
    Handlers -->|"create_issue"| H3["Create Escalation<br/>POST /api/escalations"]
    Handlers -->|"query_analytics"| H4["Query Activities & Analytics<br/>GET /api/activities<br/>GET /api/analytics"]
    Handlers -->|"broadcast"| H5["Send Message to Agents<br/>POST /api/messages<br/>type: broadcast"]

    H1 -->|"JSON data"| Synthesizer["Response Synthesis<br/>LLM converts data<br/>to conversational text"]
    H2 -->|"Response"| Synthesizer
    H3 -->|"Response"| Synthesizer
    H4 -->|"Response"| Synthesizer
    H5 -->|"Response"| Synthesizer

    Synthesizer -->|"Natural language output"| Response["Conversational Response<br/>'MarketingBot is working on Q1<br/>email campaign (75% done) and<br/>has 2 queued tasks.'"]
    Response -->|"Back to user"| User

    style VALIS fill:#fff59d,stroke:#f57f17,stroke-width:3px
    style Router fill:#bbdefb,stroke:#1976d2,stroke-width:2px
    style Handlers fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style Synthesizer fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    style User fill:#e0e0e0
    style Query fill:#e0e0e0
    style Response fill:#e0e0e0
```

---

## Phase 1: Natural Language Queries (Read-Only)

This is the **first phase** and the post-MVP target. It enables pure read-only queries across the entire workforce without exposing any agent internals.

```mermaid
sequenceDiagram
    participant U as User
    participant V as VALIS
    participant LLM
    participant API
    participant DB as Database

    U->>V: "What is MarketingBot working on?"

    V->>LLM: Classify intent + extract entities
    Note over LLM: Intent: status_query<br/>Agent: MarketingBot<br/>Status filter: in_progress

    LLM->>V: Intent classification result

    V->>API: GET /api/tasks?<br/>assigned_to=marketingbot<br/>&status=in_progress

    API->>DB: Query with tenant_id + filters
    DB->>API: Task records [task1, task2, ...]
    API->>V: JSON task data

    V->>LLM: "Synthesize human response from:<br/>Task 1: Q1 email campaign (75%)<br/>Task 2: LinkedIn content (queued)"

    LLM->>V: Conversational summary
    V->>U: "MarketingBot is currently working on<br/>the Q1 email campaign (75% complete)<br/>and has 2 tasks queued, including<br/>LinkedIn content preparation."
```

---

## Three-Phase Roadmap

```mermaid
graph TB
    Phase1["📖 Phase 1: Read-Only Queries<br/>MVP Launch<br/><br/>Examples:<br/>• What is Agent X doing?<br/>• Show me all failed tasks<br/>• List my escalations"]

    Phase2["📊 Phase 2: Cross-Agent Aggregation<br/>Months 2-3<br/><br/>Examples:<br/>• Compare my agents' velocity<br/>• How much work is queued?<br/>• Which agent is slowest?"]

    Phase3["⚡ Phase 3: Action Commands<br/>Months 4-6<br/><br/>Examples:<br/>• Pause all sales agents<br/>• Reassign this task<br/>• Broadcast to X role"]

    Phase1 --> Phase2
    Phase2 --> Phase3

    style Phase1 fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    style Phase2 fill:#bbdefb,stroke:#1976d2,stroke-width:2px
    style Phase3 fill:#fff59d,stroke:#f57f17,stroke-width:2px
```

---

## MVP Architectural Foundations (Already Built)

ARM's foundation is **intentionally designed for VALIS**. These components are already in place and require no refactoring:

### 1. System Agent Type
A reserved agent per tenant with:
- `role: 'system'`
- `type: 'meta'`
- Bypasses standard RLS within tenant scope
- Cannot be deleted or manually manipulated

### 2. Queryable Activity Schema
The `activities` table stores every state change:
```
{
  id, tenant_id, agent_id,
  event_type: 'task.created' | 'task.completed' | 'escalation.filed' | ...,
  entity_type: 'task' | 'agent' | 'decision' | 'escalation',
  entity_id,
  data: JSONB { ... },
  created_at, updated_at
}
```
This rich event log is the **source of truth for VALIS queries**.

### 3. Flexible API Filtering
All query endpoints support:
- `agent_id`, `agent_type`, `agent_role` — filter by agent properties
- `status` — queued, in_progress, completed, failed, blocked, etc.
- `time_range` — relative (last_day, last_week) or absolute (start_date, end_date)
- `event_type` — task.created, escalation.filed, etc.
- `entity_type` — task, agent, decision, escalation
- `priority` — urgent, high, normal, low

### 4. Permission Model
System agents operate within tenant boundaries:
- All queries scoped to `current_tenant` via RLS
- No cross-tenant data leakage
- System agents cannot spawn child agents
- System agents cannot execute tasks

### 5. Message Protocol
Agent-to-agent messaging already supports:
- **Direct messages** — VALIS → Agent (future: action commands)
- **Broadcast messages** — VALIS → All agents of role X (future: pause all sales agents)
- **Routing** — Hierarchical routing for complex workflows
- **Acknowledgment** — Optional message acknowledgment tracking

---

## TypeScript Foundation

These types are already defined in `src/lib/types/agent.ts` (awaiting activation):

```typescript
// VALIS intent classification
type MetaAgentIntent =
  | 'status_query'           // What is Agent X doing?
  | 'assign_task'            // (Phase 2+) Assign task to Agent X
  | 'create_issue'           // (Phase 2+) File escalation
  | 'query_analytics'        // Compare agents, performance queries
  | 'broadcast'              // (Phase 3+) Send message to all agents
  | 'pause_agent'            // (Phase 3+) Pause an agent
  | 'abort_task';            // (Phase 3+) Stop a task

// VALIS session tracking
type MetaAgentSession = {
  id: string;
  tenant_id: string;
  meta_agent_id: string;
  user_id: string;
  conversation_history: Message[];
  created_at: Date;
  expires_at: Date;
};

// VALIS command from LLM
type MetaAgentCommand = {
  intent: MetaAgentIntent;
  entities: Record<string, string | number>;
  confidence: number;
  reasoning: string;
};

// VALIS result
type MetaAgentResult = {
  success: boolean;
  data: Record<string, any>;
  summary: string;
  confidence: number;
  time_ms: number;
};

// Handler interface (extensible)
type IntentHandler = (
  command: MetaAgentCommand,
  context: { tenantId: string; supabase: SupabaseClient }
) => Promise<MetaAgentResult>;
```

---

## Why VALIS is Deferred to Post-MVP

1. **MVP focus**: Prove core agent spawning, task management, and escalations work flawlessly
2. **LLM integration**: Avoids adding LLM dependency until foundation is solid
3. **No refactoring**: All infrastructure exists; activation is additive only
4. **User feedback**: Gather real agent workflows before designing NL interface
5. **Security**: More time to harden RLS and permission models

---

## Related Concepts

- **[[04-agent-hierarchy]]** — How agents form organizational structures
- **[[12-agent-protocol]]** — Message types and routing VALIS will leverage
- **[[11-api-architecture]]** — Query endpoints VALIS will call
- **[[ARCHITECTURE]]** — System-wide design principles

---

*Last updated: 2026-02-15*
*Status: Foundation complete. Activation scheduled for Phase 2.*
