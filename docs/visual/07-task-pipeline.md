---
title: Task Pipeline & Kanban
type: visual
tags: [visual, diagram, tasks]
aliases: ["Kanban Board", "Task Flow"]
---

# Task Pipeline & Kanban

## Overview

Tasks in ARM flow through a **7-stage Kanban pipeline** representing the lifecycle of work. Each stage is a status that communicates what phase a task is in. Tasks can also be **hierarchical** (subtasks under parent tasks) and **have dependencies** (one task must complete before another can start), forming a Directed Acyclic Graph (DAG).

This document explains:
1. **Task Status Transitions**: How tasks move between stages
2. **Kanban Board Layout**: The visual columns and flow
3. **Task Dependencies**: DAG structure for complex workflows
4. **Priority System**: How urgency affects ordering
5. **Key Task Fields**: What metadata is tracked

## Task Status State Machine

Tasks transition through these 7 statuses:

```mermaid
stateDiagram-v2
    [*] --> queued: Task created (by user or agent)

    queued --> in_progress: Agent claims/accepts task
    queued --> cancelled: No longer needed (before work starts)

    in_progress --> blocked: Dependency unmet or escalation required
    in_progress --> review: Agent completes work, awaiting approval
    in_progress --> completed: Task done (no review needed)
    in_progress --> failed: Error or unable to complete
    in_progress --> cancelled: Cancelled mid-work

    blocked --> in_progress: Blocker resolved or decision approved
    blocked --> cancelled: Task cancelled while waiting
    blocked --> failed: Dependency failed, task cannot proceed

    review --> completed: Work approved ✓
    review --> in_progress: Changes requested, back to work
    review --> failed: Rejected, task cannot be saved as-is

    completed --> [*]
    failed --> [*]
    cancelled --> [*]

    note right of queued
        Task is available for claiming.
        No work has started yet.
    end note

    note right of in_progress
        Agent is actively working.
        Progress can be tracked 0-100%.
    end note

    note right of blocked
        Task is paused waiting for:
        - A dependent task to complete
        - An external decision/approval
        - A resource to become available
    end note

    note right of review
        Work is complete but needs human
        or parent-agent approval before
        marking as done.
    end note

    note right of completed
        ✓ Task successfully completed.
        Terminal state.
    end note

    note right of failed
        ✗ Task could not be completed.
        Terminal state.
    end note

    note right of cancelled
        ✗ Task was cancelled before
        or during work.
        Terminal state.
    end note
```

## Kanban Board Layout

A typical ARM dashboard shows tasks across **5 visible columns**:

```mermaid
graph TB
    Q["<b>QUEUED</b><br/>─────<br/>📋 Research Q4<br/>Sales<br/><br/>📋 Design New<br/>Dashboard<br/>"] -->|Agent claims| P["<b>IN PROGRESS</b><br/>─────<br/>🔄 Analyze Budget<br/>Allocation<br/><br/>🔄 Write API Docs<br/>"]

    P -->|Work blocked| B["<b>BLOCKED</b><br/>─────<br/>⏸️ Deploy to<br/>Production<br/><br/>⏸️ QA Sign-off<br/>"]

    P -->|Ready for approval| R["<b>REVIEW</b><br/>─────<br/>👀 Code Review<br/>PR #1234<br/><br/>👀 Data Validation<br/>Report<br/>"]

    P -->|Done, no review| C["<b>COMPLETED ✓</b><br/>─────<br/>✅ Send Newsletter<br/><br/>✅ Backup Database<br/>"]

    B -->|Blocker resolved| P

    R -->|Approved| C

    R -->|Changes needed| P

    P -->|Cannot complete| F["<b>FAILED ✗</b><br/>─────<br/>❌ Integration<br/>Test Failed<br/>"]

    style Q fill:#f0f0f0
    style P fill:#fff4e6
    style B fill:#ffe6e6
    style R fill:#e6f3ff
    style C fill:#e6f6e6
    style F fill:#ffcccc
```

**Column Meanings:**
- **QUEUED**: New tasks waiting for an agent to claim them
- **IN PROGRESS**: Agent is actively working; progress is tracked
- **BLOCKED**: Task paused due to dependencies, decisions, or external factors
- **REVIEW**: Work complete, awaiting human/parent-agent approval
- **COMPLETED**: ✓ Done (terminal)
- **FAILED**: ✗ Could not complete (terminal)
- *Note: CANCELLED tasks are typically filtered out of the main board*

## Task Dependencies (DAG)

Complex workflows involve **task dependencies**. Task B cannot start until Task A completes. The `TASK_DEPENDENCIES` table creates directed edges.

### Example: Software Release Workflow

```mermaid
graph TD
    A["🔍 Research<br/>(Market Analysis)"] -->|must complete| B["🎨 Design<br/>(UI/UX)"]
    A -->|must complete| C["🏗️ Architecture<br/>(System Design)"]

    B -->|must complete| D["💻 Implementation<br/>(Write Code)"]
    C -->|must complete| D

    D -->|must complete| E["🧪 Testing<br/>(QA)"]
    E -->|must complete| F["📦 Deploy<br/>(Production)"]

    style A fill:#fff4e6
    style B fill:#fff4e6
    style C fill:#fff4e6
    style D fill:#fff4e6
    style E fill:#ffe6e6
    style F fill:#e6f3ff
```

**Key Points:**
- **Task A** (Research) must complete before **B** or **C** can start (parallel branches)
- **Task B** (Design) AND **C** (Architecture) must both complete before **D** (Implementation)
- This is a **DAG (Directed Acyclic Graph)** — no cycles allowed
- If a dependency fails, dependent tasks move to **blocked** status
- System automatically enforces: cannot move task to `in_progress` if dependencies are not `completed`

## Task Hierarchy (Parent/Child)

Tasks can also be **hierarchical**. A parent task is broken into subtasks:

```mermaid
graph TD
    Parent["📌 <b>Q4 Strategic Review</b><br/>Status: in_progress<br/>Progress: 45%"]

    Parent -->|has subtask| Sub1["📝 <b>Finance Review</b><br/>Status: completed<br/>Depth: 1"]
    Parent -->|has subtask| Sub2["📝 <b>Operations Review</b><br/>Status: in_progress<br/>Depth: 1"]
    Parent -->|has subtask| Sub3["📝 <b>Marketing Review</b><br/>Status: queued<br/>Depth: 1"]

    Sub2 -->|has subtask| SubSub1["📄 <b>Headcount Analysis</b><br/>Status: completed<br/>Depth: 2"]
    Sub2 -->|has subtask| SubSub2["📄 <b>Cost Analysis</b><br/>Status: in_progress<br/>Depth: 2"]

    style Parent fill:#fff4e6,stroke:#f0a000,stroke-width:2px
    style Sub1 fill:#e6f6e6
    style Sub2 fill:#fff4e6
    style Sub3 fill:#f0f0f0
    style SubSub1 fill:#e6f6e6
    style SubSub2 fill:#fff4e6
```

**Hierarchy Fields:**
- `parent_task_id`: Points to parent (NULL if root task)
- `depth`: 0 = root, 1 = child, 2 = grandchild, etc.
- Parent task progress is often the average of child task progress
- Subtasks inherit some settings from parent (tenant_id, some priority logic)

## Priority System

Tasks have 4 priority levels that affect **scheduling and ordering**:

```mermaid
graph LR
    Low["🔵 <b>LOW</b><br/>Can wait<br/>Scheduled last<br/>No SLA"]
    Normal["🟢 <b>NORMAL</b><br/>Standard priority<br/>Balanced scheduling<br/>24h SLA"]
    High["🟠 <b>HIGH</b><br/>Important<br/>Prioritized<br/>12h SLA"]
    Urgent["🔴 <b>URGENT</b><br/>Critical<br/>First in queue<br/>4h SLA"]

    Low -.-> Normal -.-> High -.-> Urgent

    style Low fill:#cce5ff
    style Normal fill:#d4edda
    style High fill:#fff3cd
    style Urgent fill:#f8d7da
```

**Priority Effects:**
- **LOW**: Nice-to-have work, scheduled when agents are free
- **NORMAL**: Regular work, standard SLA window
- **HIGH**: Important but not emergency, prioritized when possible
- **URGENT**: Drop everything else, immediate attention needed

When an agent queries for "next task to do", higher-priority tasks are returned first.

## Key Task Fields Explained

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Unique identifier |
| `tenant_id` | UUID (FK) | Multi-tenancy isolation |
| `title` | String | Short task name (50-200 chars) |
| `description` | Text | Full details, acceptance criteria, instructions |
| `status` | Enum | Current stage (queued, in_progress, blocked, review, completed, failed, cancelled) |
| `priority` | Enum | Urgency level (low, normal, high, urgent) |
| `assigned_agent_id` | UUID (FK) | Which agent owns this task |
| `created_by` | UUID | User or agent that created it |
| `parent_task_id` | UUID (FK) | Parent task (nullable if root) |
| `depth` | Integer | Hierarchy depth (0 = root) |
| `progress_percent` | Integer | 0-100, manually or auto-updated |
| `started_at` | Timestamp | When agent started work |
| `completed_at` | Timestamp | When work finished |
| `due_date` | Timestamp | Target completion (nullable) |
| `created_at` | Timestamp | When task was created |

## Task Lifecycle Example

Here's a concrete example of a task moving through the pipeline:

```mermaid
graph TD
    T1["1️⃣ Task Created<br/>Title: Analyze Q4 Sales<br/>Status: queued<br/>Progress: 0%<br/>Created: 2026-02-15 10:00"]

    T2["2️⃣ Agent Claims<br/>Agent: Analytics Specialist<br/>Status: in_progress<br/>Progress: 0%<br/>Started: 2026-02-15 10:15"]

    T3["3️⃣ Progress Update<br/>Status: in_progress<br/>Progress: 50%<br/>Agent working..."]

    T4["4️⃣ Work Complete<br/>Status: review<br/>Progress: 100%<br/>Awaiting approval"]

    T5["5️⃣ Approved<br/>Status: completed<br/>Progress: 100%<br/>Completed: 2026-02-15 14:30"]

    T1 --> T2 --> T3 --> T4 --> T5

    style T1 fill:#f0f0f0
    style T2 fill:#fff4e6
    style T3 fill:#fff4e6
    style T4 fill:#e6f3ff
    style T5 fill:#e6f6e6
```

## Integration with Other Systems

### Blocked Tasks & Dependencies
When a task's dependency fails:
1. Dependent task status → `blocked`
2. Activity logged to audit trail
3. Assigned agent notified (via notification system)
4. Can be resumed once dependency is retried and completed

### Blocked Tasks & Escalations
When task requires a decision to proceed:
1. Agent escalates (raises escalation record)
2. Task status → `blocked`
3. Human/parent-agent reviews escalation
4. Decision made and approved
5. Agent resumes task, status → `in_progress`

### Blocked Tasks & External Factors
Tasks can be blocked by external events:
- Waiting for customer input
- Waiting for API service to come online
- Waiting for resource (e.g., GPU availability)
- Manual approval from system administrator

See [[09-escalation-workflow]] for how escalations interact with task blocking.

## Dashboard & Reporting

The Activity Feed ([[16-activity-feed]]) displays all task transitions, creating a complete audit trail:
- Task created by User A
- Agent B claimed task
- Agent B updated progress to 50%
- Agent B requested review
- User A approved
- Task marked completed

Metrics dashboard queries ANALYTICS_DAILY for:
- Tasks completed per day/week/month
- Average time-to-completion by priority
- Failure rate by agent or task type
- Blocked time analysis

## Related Documentation

- [[04-agent-hierarchy]] — How agents are assigned to tasks
- [[06-data-model]] — Task table schema and task_dependencies
- [[08-decision-flow]] — How decisions interact with task blocking
- [[09-escalation-workflow]] — Escalations that cause blocking
- [[16-activity-feed]] — Complete task event audit trail
